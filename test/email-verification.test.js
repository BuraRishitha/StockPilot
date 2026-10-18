import assert from "node:assert/strict";
import { after, before, test } from "node:test";
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
  { login, resendVerificationEmail, verifyEmail },
  { hashToken },
  { buildVerificationEmail },
] = await Promise.all([
  import("../src/app.js"),
  import("../src/config/env.js"),
  import("../src/models/User.js"),
  import("../src/models/ActivityLog.js"),
  import("../src/services/auth.service.js"),
  import("../src/utils/tokenUtils.js"),
  import("../src/utils/emailUtils.js"),
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
  _id: "verification-test-user",
  email: "verification.test@example.test",
  business: "verification-test-business",
  isEmailVerified: false,
  emailVerificationTokenHash: undefined,
  emailVerificationExpires: undefined,
  passwordResetTokenHash: "existing-reset-token-hash",
  passwordResetExpires: new Date(Date.now() + 60_000),
  saved: 0,
  async save() {
    this.saved += 1;
  },
  toSafeJSON() {
    return { id: this._id, email: this.email, isEmailVerified: this.isEmailVerified };
  },
  ...overrides,
});

test("user schema stores verification and reset tokens in separate hidden fields", () => {
  for (const field of [
    "emailVerificationTokenHash",
    "emailVerificationExpires",
    "passwordResetTokenHash",
    "passwordResetExpires",
  ]) {
    assert.ok(User.schema.path(field), `${field} must be defined`);
    assert.equal(User.schema.path(field).options.select, false);
  }
});

test("verification link uses the configured frontend origin and a distinct route", () => {
  const token = "a".repeat(64);
  const email = buildVerificationEmail("verification.test@example.test", token);
  const link = new URL(email.html.match(/href="([^"]+)"/)[1]);

  assert.equal(link.origin, new URL(env.clientUrl).origin);
  assert.equal(link.origin, "http://localhost:5173");
  assert.equal(link.pathname, "/verify-email");
  assert.equal(link.searchParams.get("token"), token);
  assert.equal(email.html.includes("/reset-password"), false);
});

test("resend verification emails a hashed, expiring verification token without touching reset state", async (t) => {
  const user = createUser();
  let mail;
  const resetHash = user.passwordResetTokenHash;
  const resetExpiry = user.passwordResetExpires;
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

  assert.equal(await resendVerificationEmail(` ${user.email.toUpperCase()} `), true);
  assert.equal(user.saved, 1);
  assert.equal(mail.to, user.email);
  assert.equal(mail.subject, "Verify your StockPilot account");
  assert.match(user.emailVerificationTokenHash, /^[a-f\d]{64}$/);
  assert.ok(user.emailVerificationExpires.getTime() >= startedAt + env.emailVerificationExpiresMs);
  assert.ok(user.emailVerificationExpires.getTime() <= Date.now() + env.emailVerificationExpiresMs);
  assert.equal(user.passwordResetTokenHash, resetHash);
  assert.equal(user.passwordResetExpires, resetExpiry);

  const link = new URL(mail.html.match(/href="([^"]+)"/)[1]);
  const rawToken = link.searchParams.get("token");
  assert.equal(link.origin, "http://localhost:5173");
  assert.equal(link.pathname, "/verify-email");
  assert.match(rawToken, /^[a-f\d]{64}$/);
  assert.equal(hashToken(rawToken), user.emailVerificationTokenHash);
  assert.equal(mail.html.includes(user.emailVerificationTokenHash), false);
});

test("verification API accepts a valid token once and leaves reset tokens untouched", async (t) => {
  const rawToken = "b".repeat(64);
  const user = createUser({ emailVerificationTokenHash: hashToken(rawToken) });
  user.emailVerificationExpires = new Date(Date.now() + env.emailVerificationExpiresMs);
  const filters = [];
  t.mock.method(User, "findOne", (query) => {
    filters.push(query);
    const matches =
      query.emailVerificationTokenHash === user.emailVerificationTokenHash &&
      user.emailVerificationExpires > query.emailVerificationExpires.$gt;
    return {
      select: async () => (matches ? user : null),
    };
  });
  t.mock.method(ActivityLog, "create", async () => ({}));

  const response = await fetch(`${baseUrl}/api/v1/auth/verify-email`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: rawToken }),
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(user.isEmailVerified, true);
  assert.equal(user.emailVerificationTokenHash, undefined);
  assert.equal(user.emailVerificationExpires, undefined);
  assert.equal(user.passwordResetTokenHash, "existing-reset-token-hash");
  assert.ok(filters[0].emailVerificationExpires.$gt <= Date.now());

  const replay = await fetch(`${baseUrl}/api/v1/auth/verify-email`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: rawToken }),
  });
  assert.equal(replay.status, 400);
});

test("resend endpoint delivers a link that verifies an isolated account through the API", async (t) => {
  const user = createUser();
  const resetHash = user.passwordResetTokenHash;
  let mail;
  t.mock.method(User, "findOne", (query) => {
    if (query.email) return Promise.resolve(user);
    const matches =
      query.emailVerificationTokenHash === user.emailVerificationTokenHash &&
      user.emailVerificationExpires > query.emailVerificationExpires.$gt;
    return { select: async () => (matches ? user : null) };
  });
  t.mock.method(ActivityLog, "create", async () => ({}));
  t.mock.method(nodemailer, "createTransport", () => ({
    async sendMail(message) {
      mail = message;
      return { accepted: [user.email], rejected: [] };
    },
    close() {},
  }));

  const resendResponse = await fetch(`${baseUrl}/api/v1/auth/resend-verification`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: user.email }),
  });
  assert.equal(resendResponse.status, 200);

  const verificationLink = new URL(mail.html.match(/href="([^"]+)"/)[1]);
  assert.equal(verificationLink.origin, "http://localhost:5173");
  assert.equal(verificationLink.pathname, "/verify-email");
  const verifyResponse = await fetch(`${baseUrl}/api/v1/auth/verify-email`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: verificationLink.searchParams.get("token") }),
  });

  assert.equal(verifyResponse.status, 200);
  assert.equal(user.isEmailVerified, true);
  assert.equal(user.emailVerificationTokenHash, undefined);
  assert.equal(user.passwordResetTokenHash, resetHash);
});

test("invalid and expired verification tokens cannot mark an account verified", async (t) => {
  let saved = false;
  let capturedFilter;
  const user = createUser({
    emailVerificationTokenHash: hashToken("c".repeat(64)),
    emailVerificationExpires: new Date(Date.now() - 1),
    async save() {
      saved = true;
    },
  });
  t.mock.method(User, "findOne", (query) => {
    capturedFilter = query;
    return { select: async () => null };
  });

  await assert.rejects(verifyEmail("c".repeat(64)), /Verification token is invalid or has expired/);
  assert.equal(capturedFilter.emailVerificationTokenHash, hashToken("c".repeat(64)));
  assert.ok(capturedFilter.emailVerificationExpires.$gt <= Date.now());
  assert.equal(user.isEmailVerified, false);
  assert.equal(saved, false);
});

test("unverified accounts remain blocked at login until a valid verification token is used", async (t) => {
  const user = createUser({
    status: "active",
    async comparePassword() {
      return true;
    },
    isLocked() {
      return false;
    },
  });
  t.mock.method(User, "findOne", () => ({
    select: async () => user,
  }));

  await assert.rejects(
    login({ email: user.email, password: "CorrectPassword1!" }),
    (error) => error.statusCode === 403 && error.message === "Please verify your email before logging in."
  );
  assert.equal(user.isEmailVerified, false);
});

test("resend verification endpoint returns an enumeration-safe response", async (t) => {
  const smtp = t.mock.method(nodemailer, "createTransport", () => ({
    async sendMail() {
      throw new Error("SMTP should not send for an unknown account");
    },
    close() {},
  }));
  t.mock.method(User, "findOne", async () => null);

  const response = await fetch(`${baseUrl}/api/v1/auth/resend-verification`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "unknown@example.test" }),
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.match(body.message, /If an account with that email exists/);
  assert.equal(smtp.mock.callCount(), 0);
});
