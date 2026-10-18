import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import crypto from "node:crypto";
import mongoose from "mongoose";
import nodemailer from "nodemailer";

process.env.MONGO_URI ||= "mongodb://127.0.0.1:27017/stockpilot_test";
process.env.JWT_ACCESS_SECRET ||= "test-access-secret-with-sufficient-length";
process.env.JWT_REFRESH_SECRET ||= "different-test-refresh-secret-with-length";

const [
  { default: app },
  { env },
  { User },
  { ActivityLog },
  { forgotPassword, resetPassword },
  { generateRawAndHashedToken, hashToken, verifyAccessToken },
  { buildPasswordResetEmail },
  { issueTokenPair },
  { protect },
  { ApiError },
] = await Promise.all([
  import("../src/app.js"),
  import("../src/config/env.js"),
  import("../src/models/User.js"),
  import("../src/models/ActivityLog.js"),
  import("../src/services/auth.service.js"),
  import("../src/utils/tokenUtils.js"),
  import("../src/utils/emailUtils.js"),
  import("../src/services/token.service.js"),
  import("../src/middlewares/auth.middleware.js"),
  import("../src/utils/ApiError.js"),
]);

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

const createUser = (overrides = {}) => ({
  _id: "reset-test-user",
  email: "reset.test@example.test",
  business: "reset-test-business",
  passwordResetTokenHash: undefined,
  passwordResetExpires: undefined,
  refreshTokenHash: "stored-refresh-hash",
  tokenVersion: 3,
  failedLoginAttempts: 2,
  lockUntil: new Date(),
  saved: 0,
  async save() {
    this.saved += 1;
  },
  ...overrides,
});

const mockTransaction = (t) =>
  t.mock.method(mongoose, "startSession", async () => ({
    async withTransaction(callback) {
      await callback();
    },
    async endSession() {},
  }));

test("reset tokens are random, 256-bit hex values and only the hash is stored", () => {
  const first = generateRawAndHashedToken();
  const second = generateRawAndHashedToken();

  assert.match(first.rawToken, /^[a-f\d]{64}$/);
  assert.equal(first.hashedToken, hashToken(first.rawToken));
  assert.notEqual(first.rawToken, first.hashedToken);
  assert.notEqual(first.rawToken, second.rawToken);
});

test("forgot-password stores a hashed expiring token and emails the exact raw token", async (t) => {
  const user = createUser();
  let mail;
  const startedAt = Date.now();
  t.mock.method(User, "findOne", async (query) => {
    assert.deepEqual(query, { email: user.email });
    return user;
  });
  t.mock.method(ActivityLog, "create", async () => ({}));
  t.mock.method(nodemailer, "createTransport", () => ({
    async sendMail(message) {
      mail = message;
      return { accepted: [user.email], rejected: [] };
    },
    close() {},
  }));

  await forgotPassword(` ${user.email.toUpperCase()} `);

  assert.equal(user.saved, 1);
  assert.match(user.passwordResetTokenHash, /^[a-f\d]{64}$/);
  assert.ok(user.passwordResetExpires instanceof Date);
  assert.ok(user.passwordResetExpires.getTime() >= startedAt + env.passwordResetExpiresMs);
  assert.ok(user.passwordResetExpires.getTime() <= Date.now() + env.passwordResetExpiresMs);
  assert.equal(mail.to, user.email);
  assert.equal(mail.subject, "Reset your StockPilot password");

  const tokenMatch = mail.html.match(/reset-password\?token=([a-f\d]{64})/);
  assert.ok(tokenMatch);
  assert.equal(hashToken(tokenMatch[1]), user.passwordResetTokenHash);
  assert.equal(mail.html.includes(user.passwordResetTokenHash), false);
});

test("forgot-password for an unknown account is generic and sends no email", async (t) => {
  t.mock.method(User, "findOne", async () => null);
  const smtpCreated = t.mock.method(nodemailer, "createTransport", () => {
    throw new Error("SMTP must not be initialized for unknown users");
  });

  await assert.doesNotReject(forgotPassword("unknown@example.test"));
  assert.equal(smtpCreated.mock.callCount(), 0);
});

test("email send failure clears the unusable reset token without logging secrets", async (t) => {
  const user = createUser();
  const secretFailure = "smtp failure with private-token-and-password";
  const logged = [];
  t.mock.method(User, "findOne", async () => user);
  t.mock.method(nodemailer, "createTransport", () => ({
    async sendMail() {
      throw new Error(secretFailure);
    },
    close() {},
  }));
  t.mock.method(console, "error", (...args) => logged.push(args));

  await assert.rejects(forgotPassword(user.email), new RegExp(secretFailure));

  assert.equal(user.passwordResetTokenHash, undefined);
  assert.equal(user.passwordResetExpires, undefined);
  assert.equal(user.saved, 2);
  assert.equal(JSON.stringify(logged).includes(secretFailure), false);
});

test("reset consumes a valid token once and invalidates refresh and access tokens", async (t) => {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = hashToken(rawToken);
  const user = createUser({
    passwordResetTokenHash: hashedToken,
    passwordResetExpires: new Date(Date.now() + env.passwordResetExpiresMs),
  });
  const previousVersion = user.tokenVersion;
  const queryFilters = [];
  mockTransaction(t);

  t.mock.method(User, "findOne", (query) => {
    queryFilters.push(query);
    return {
      select() {
        return {
          session: async () =>
            query.passwordResetTokenHash === user.passwordResetTokenHash &&
            user.passwordResetExpires > query.passwordResetExpires.$gt
              ? user
              : null,
        };
      },
    };
  });
  t.mock.method(ActivityLog, "create", async () => ({}));

  const updatedUser = await resetPassword(rawToken, "NewPassword2!");

  assert.equal(updatedUser, user);
  assert.equal(user.password, "NewPassword2!");
  assert.equal(user.passwordResetTokenHash, undefined);
  assert.equal(user.passwordResetExpires, undefined);
  assert.equal(user.refreshTokenHash, undefined);
  assert.equal(user.tokenVersion, previousVersion + 1);
  assert.equal(user.failedLoginAttempts, 0);
  assert.equal(user.lockUntil, undefined);
  assert.equal(queryFilters[0].passwordResetTokenHash, hashedToken);
  assert.ok(queryFilters[0].passwordResetExpires.$gt <= Date.now());

  await assert.rejects(
    resetPassword(rawToken, "AnotherPassword3!"),
    (error) => error instanceof ApiError && error.statusCode === 400
  );
  assert.equal(user.password, "NewPassword2!");
});

test("expired reset tokens cannot be used", async (t) => {
  let capturedFilter;
  mockTransaction(t);
  t.mock.method(User, "findOne", (query) => {
    capturedFilter = query;
    return { select: () => ({ session: async () => null }) };
  });

  await assert.rejects(
    resetPassword("a".repeat(64), "NewPassword2!"),
    (error) => error instanceof ApiError && error.statusCode === 400
  );
  assert.equal(capturedFilter.passwordResetExpires.$gt > Date.now() - 1000, true);
});

test("new access tokens include the user's token version", async () => {
  const user = {
    _id: "0123456789abcdef01234567",
    role: "business_admin",
    business: "test-business",
    tokenVersion: 4,
  };
  const { accessToken } = await issueTokenPair(user);

  assert.equal(verifyAccessToken(accessToken).tokenVersion, 4);
});

test("password save hook accepts the reset password and rejects the old one", async () => {
  const user = new User({
    fullName: "Reset Test User",
    email: "reset.test@example.test",
    phone: "+12025550123",
    password: "OldPassword1!",
    role: "staff",
    business: new mongoose.Types.ObjectId(),
  });
  user.password = "NewPassword2!";

  await new Promise((resolve, reject) => {
    User.schema.s.hooks.execPre("save", user, (error) =>
      error ? reject(error) : resolve()
    );
  });

  assert.notEqual(user.password, "NewPassword2!");
  assert.equal(await user.comparePassword("NewPassword2!"), true);
  assert.equal(await user.comparePassword("OldPassword1!"), false);
});

test("protected routes reject access tokens from before a password reset", async (t) => {
  const previousVersionToken = await issueTokenPair({
    _id: "0123456789abcdef01234567",
    role: "business_admin",
    business: "test-business",
    tokenVersion: 2,
  });
  const currentVersionToken = await issueTokenPair({
    _id: "0123456789abcdef01234567",
    role: "business_admin",
    business: "test-business",
    tokenVersion: 3,
  });
  const findById = t.mock.method(User, "findById", async () => ({
    status: "active",
    tokenVersion: 3,
  }));

  const invoke = async (token) => {
    let middlewareError;
    let nextCalled = false;
    const req = { headers: { authorization: `Bearer ${token}` } };
    await new Promise((resolve) => {
      protect(req, {}, (error) => {
        middlewareError = error;
        nextCalled = !error;
        resolve();
      });
    });
    return { middlewareError, nextCalled };
  };

  const stale = await invoke(previousVersionToken.accessToken);
  assert.equal(findById.mock.callCount(), 1);
  assert.equal(verifyAccessToken(previousVersionToken.accessToken).tokenVersion, 2);
  assert.ok(stale.middlewareError, "the stale token should be rejected");
  assert.equal(stale.middlewareError.statusCode, 401);
  assert.equal(stale.nextCalled, false);

  const current = await invoke(currentVersionToken.accessToken);
  assert.equal(current.middlewareError, undefined);
  assert.equal(current.nextCalled, true);
  assert.equal(findById.mock.callCount(), 2);
});

test("forgot and reset endpoints reject invalid input without database or email activity", async (t) => {
  const findOne = t.mock.method(User, "findOne", async () => null);
  const transport = t.mock.method(nodemailer, "createTransport", () => {
    throw new Error("SMTP must not be called for invalid or unknown requests");
  });

  const invalidForgot = await fetch(`${baseUrl}/api/v1/auth/forgot-password`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "invalid" }),
  });
  const unknownForgot = await fetch(`${baseUrl}/api/v1/auth/forgot-password`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "unknown@example.test" }),
  });
  const invalidReset = await fetch(`${baseUrl}/api/v1/auth/reset-password`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: "bad", newPassword: "weak" }),
  });

  assert.equal(invalidForgot.status, 400);
  assert.equal(unknownForgot.status, 200);
  const unknownBody = await unknownForgot.json();
  assert.equal(unknownBody.success, true);
  assert.deepEqual(unknownBody.data, {});
  assert.equal(invalidReset.status, 400);
  assert.equal(findOne.mock.callCount(), 1);
  assert.equal(transport.mock.callCount(), 0);
});

test("mocked email reset link completes the API flow once for an isolated test account", async (t) => {
  const user = createUser({
    toSafeJSON() {
      return { id: this._id, email: this.email };
    },
  });
  let resetEmail;
  mockTransaction(t);

  t.mock.method(User, "findOne", (query) => {
    if (query.email) return Promise.resolve(user);

    return {
      select() {
        return {
          session: async () =>
            query.passwordResetTokenHash === user.passwordResetTokenHash &&
            user.passwordResetExpires > query.passwordResetExpires.$gt
              ? user
              : null,
        };
      },
    };
  });
  t.mock.method(ActivityLog, "create", async () => ({}));
  t.mock.method(nodemailer, "createTransport", () => ({
    async sendMail(message) {
      resetEmail = message;
      return { accepted: [user.email], rejected: [] };
    },
    close() {},
  }));

  const forgotResponse = await fetch(`${baseUrl}/api/v1/auth/forgot-password`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: user.email }),
  });
  assert.equal(forgotResponse.status, 200);
  assert.equal(resetEmail.to, user.email);

  const link = new URL(resetEmail.html.match(/href="([^"]+)"/)[1]);
  assert.equal(link.pathname, "/reset-password");
  const rawToken = link.searchParams.get("token");
  assert.match(rawToken, /^[a-f\d]{64}$/);
  assert.equal(hashToken(rawToken), user.passwordResetTokenHash);

  const resetResponse = await fetch(`${baseUrl}/api/v1/auth/reset-password`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: rawToken, newPassword: "NewPassword2!" }),
  });
  assert.equal(resetResponse.status, 200);
  assert.equal(user.password, "NewPassword2!");
  assert.equal(user.passwordResetTokenHash, undefined);
  assert.equal(user.passwordResetExpires, undefined);
  assert.equal(user.refreshTokenHash, undefined);
  assert.equal(user.tokenVersion, 4);

  const replayResponse = await fetch(`${baseUrl}/api/v1/auth/reset-password`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: rawToken, newPassword: "AnotherPassword3!" }),
  });
  assert.equal(replayResponse.status, 400);
  assert.equal(user.password, "NewPassword2!");
});
