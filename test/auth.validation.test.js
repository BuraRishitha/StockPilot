import assert from "node:assert/strict";
import { after, before, test } from "node:test";

process.env.MONGO_URI ||= "mongodb://127.0.0.1:27017/stockpilot_test";
process.env.JWT_ACCESS_SECRET ||= "test-access-secret-with-sufficient-length";
process.env.JWT_REFRESH_SECRET ||= "different-test-refresh-secret-with-length";

const [{ default: app }, validators, tokenUtils, { env }] = await Promise.all([
  import("../src/app.js"),
  import("../src/validators/auth.validator.js"),
  import("../src/utils/tokenUtils.js"),
  import("../src/config/env.js"),
]);

const { validateRegister, validateResetPassword, validateVerifyEmail } = validators;
const {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} = tokenUtils;
const { errorHandler } = await import("../src/middlewares/errorHandler.middleware.js");
const { ApiError } = await import("../src/utils/ApiError.js");
const { buildVerificationEmail, buildPasswordResetEmail } = await import("../src/utils/emailUtils.js");
let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test("registration validation accepts valid input and trims email for checking", () => {
  assert.deepEqual(
    validateRegister({
      fullName: "StockPilot Admin",
      email: " stockpilot.automated-test@example.test ",
      phone: "+12025550123",
      password: "StockPilot1!",
      businessName: "StockPilot Store",
    }),
    []
  );
});

test("verification and reset emails use the exact supplied recipient", () => {
  const recipient = "stockpilot.automated-test@example.test";

  assert.equal(buildVerificationEmail(recipient, "verification-token").to, recipient);
  assert.equal(buildPasswordResetEmail(recipient, "reset-token").to, recipient);
});

test("auth email links normalize a trailing slash in the configured frontend URL", () => {
  const originalClientUrl = env.clientUrl;
  try {
    env.clientUrl = `${originalClientUrl.replace(/\/+$/, "")}/`;
    const verificationLink = new URL(
      buildVerificationEmail("verification.test@example.test", "verify-token").html.match(
        /href="([^"]+)"/
      )[1]
    );
    const resetLink = new URL(
      buildPasswordResetEmail("reset.test@example.test", "reset-token").html.match(
        /href="([^"]+)"/
      )[1]
    );

    assert.equal(verificationLink.pathname, "/verify-email");
    assert.equal(verificationLink.searchParams.get("token"), "verify-token");
    assert.equal(resetLink.pathname, "/reset-password");
    assert.equal(resetLink.searchParams.get("token"), "reset-token");
  } finally {
    env.clientUrl = originalClientUrl;
  }
});

test("validators reject malformed bodies and weak or oversized passwords", () => {
  assert.ok(validateRegister(null).length > 0);
  assert.ok(
    validateRegister({
      fullName: "Admin",
      email: "admin@example.com",
      phone: "+12025550123",
      password: "A1!" + "a".repeat(70),
      businessName: "Store",
    }).some((error) => error.field === "password")
  );
  assert.ok(validateResetPassword({ token: "not-a-token", newPassword: "weak" }).length > 0);
  assert.equal(validateVerifyEmail({ token: "a".repeat(64) }).length, 0);
});

test("access tokens use a verifiable HS256 signature and reject altered claims", () => {
  const token = signAccessToken({ sub: "0123456789abcdef01234567", role: "staff" });
  assert.equal(verifyAccessToken(token).sub, "0123456789abcdef01234567");

  const [header, payload, signature] = token.split(".");
  const alteredPayload = Buffer.from(
    JSON.stringify({ sub: "1123456789abcdef01234567", role: "staff" })
  ).toString("base64url");
  assert.throws(() => verifyAccessToken(`${header}.${alteredPayload}.${signature}`));

  const unsupportedHeader = Buffer.from(
    JSON.stringify({ alg: "none", typ: "JWT" })
  ).toString("base64url");
  assert.throws(() => verifyAccessToken(`${unsupportedHeader}.${payload}.${signature}`));
});

test("refresh tokens are unique when issued in the same second", () => {
  const payload = { sub: "0123456789abcdef01234567", role: "staff" };
  const firstToken = signRefreshToken(payload);
  const secondToken = signRefreshToken(payload);

  assert.notEqual(firstToken, secondToken);
  assert.equal(verifyRefreshToken(firstToken).sub, payload.sub);
  assert.equal(verifyRefreshToken(secondToken).sub, payload.sub);
});

test("production errors hide internal details and log only safe metadata", () => {
  const previousNodeEnv = env.nodeEnv;
  const previousConsoleError = console.error;
  const logged = [];
  const response = {
    statusCode: null,
    body: null,
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  try {
    env.nodeEnv = "production";
    console.error = (...args) => logged.push(args);
    errorHandler(
      new Error("internal database credential"),
      { method: "GET", path: "/api/v1/health" },
      response,
      () => {}
    );

    const apiErrorResponse = {
      ...response,
      statusCode: null,
      body: null,
    };
    errorHandler(
      new ApiError(500, "internal api error"),
      { method: "GET", path: "/api/v1/health" },
      apiErrorResponse,
      () => {}
    );

    assert.equal(apiErrorResponse.statusCode, 500);
    assert.equal(apiErrorResponse.body.message, "Internal server error");
  } finally {
    env.nodeEnv = previousNodeEnv;
    console.error = previousConsoleError;
  }

  assert.equal(response.statusCode, 500);
  assert.equal(response.body.message, "Internal server error");
  const loggedOutput = JSON.stringify(logged);
  assert.equal(loggedOutput.includes("internal database credential"), false);
  assert.equal(loggedOutput.includes("internal api error"), false);
});

test("health endpoint is available and does not identify Express", async () => {
  const response = await fetch(`${baseUrl}/api/v1/health`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-powered-by"), null);
  assert.equal((await response.json()).success, true);
});

test("credentialed CORS allows the configured client and local dev alias only", async () => {
  const preflight = (origin) =>
    fetch(`${baseUrl}/api/v1/auth/refresh-token`, {
      method: "OPTIONS",
      headers: {
        origin,
        "access-control-request-method": "POST",
        "access-control-request-headers": "authorization,content-type",
      },
    });
  const configuredOrigin = new URL(env.clientUrl).origin;
  const configuredResponse = await preflight(configuredOrigin);

  assert.equal(configuredResponse.headers.get("access-control-allow-origin"), configuredOrigin);
  assert.equal(configuredResponse.headers.get("access-control-allow-credentials"), "true");

  const client = new URL(env.clientUrl);
  if (env.nodeEnv !== "production" && ["localhost", "127.0.0.1"].includes(client.hostname)) {
    client.hostname = client.hostname === "localhost" ? "127.0.0.1" : "localhost";
    const aliasResponse = await preflight(client.origin);
    assert.equal(aliasResponse.headers.get("access-control-allow-origin"), client.origin);
  }

  const untrustedResponse = await preflight("http://untrusted.invalid");
  assert.equal(untrustedResponse.headers.get("access-control-allow-origin"), null);
});

test("invalid registration body returns the standard 400 response shape", async () => {
  const response = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
  assert.equal(body.message, "Validation failed");
  assert.ok(Array.isArray(body.errors));
});

test("malformed JSON and unknown routes return 400 and 404 respectively", async () => {
  const malformed = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{",
  });
  const unknown = await fetch(`${baseUrl}/api/v1/not-a-route`);

  assert.equal(malformed.status, 400);
  assert.equal((await malformed.json()).message, "Malformed JSON request body.");
  assert.equal(unknown.status, 404);
  const unknownBody = await unknown.json();
  assert.equal(unknownBody.success, false);
  assert.equal(unknownBody.message, "Route not found: /api/v1/not-a-route");
});

test("business endpoints reject requests without a valid bearer token", async () => {
  const response = await fetch(`${baseUrl}/api/v1/categories`);
  const malformedTokenResponse = await fetch(`${baseUrl}/api/v1/categories`, {
    headers: { authorization: "Bearer not-a-valid-jwt" },
  });
  assert.equal(response.status, 401);
  assert.equal(malformedTokenResponse.status, 401);
});
