import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import mongoose from "mongoose";

process.env.MONGO_URI ||= "mongodb://127.0.0.1:27017/stockpilot_test";
process.env.JWT_ACCESS_SECRET ||= "test-access-secret-with-sufficient-length";
process.env.JWT_REFRESH_SECRET ||= "different-test-refresh-secret-with-length";

const [
  { User },
  { changePassword, updateProfile },
  { validateChangePassword, validateUpdateProfile },
  { signAccessToken },
  { default: app },
] = await Promise.all([
  import("../src/models/User.js"),
  import("../src/services/profile.service.js"),
  import("../src/validators/profile.validator.js"),
  import("../src/utils/tokenUtils.js"),
  import("../src/app.js"),
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

const executePasswordSaveHook = (user) =>
  new Promise((resolve, reject) => {
    User.schema.s.hooks.execPre("save", user, (error) =>
      error ? reject(error) : resolve()
    );
  });

const createUser = async () => {
  const user = new User({
    fullName: "Original Name",
    email: "profile.test@example.test",
    phone: "+12025550123",
    password: "CurrentPassword1!",
    role: "business_admin",
    business: new mongoose.Types.ObjectId(),
    status: "active",
    isEmailVerified: true,
    tokenVersion: 4,
    refreshTokenHash: "hashed-refresh-token",
  });
  await executePasswordSaveHook(user);
  user.unmarkModified("password");
  user.saved = 0;
  user.save = async function () {
    await executePasswordSaveHook(this);
    this.unmarkModified("password");
    this.saved += 1;
    return this;
  };
  return user;
};

const queryFor = (user) => ({
  select() {
    return Promise.resolve(user);
  },
  then(resolve, reject) {
    return Promise.resolve(user).then(resolve, reject);
  },
});

test("profile validator accepts a display name and rejects invalid or unknown fields", () => {
  assert.deepEqual(validateUpdateProfile({ fullName: "  Priya Shah  " }), []);
  assert.ok(validateUpdateProfile({ fullName: " " }).some((error) => error.field === "fullName"));
  assert.ok(validateUpdateProfile({ fullName: "A".repeat(101) }).length > 0);
  assert.ok(validateUpdateProfile({ isEmailVerified: true }).some((error) => error.field === "isEmailVerified"));
  assert.ok(validateUpdateProfile(null).some((error) => error.field === "body"));
});

test("password validator enforces current password and bcrypt-compatible new password length", () => {
  assert.deepEqual(
    validateChangePassword({
      currentPassword: "CurrentPassword1!",
      newPassword: "NewPassword2!",
    }),
    []
  );
  assert.ok(validateChangePassword({ newPassword: "NewPassword2!" }).some((error) => error.field === "currentPassword"));
  assert.ok(
    validateChangePassword({
      currentPassword: "CurrentPassword1!",
      newPassword: `Aa1!${"é".repeat(40)}`,
    }).some((error) => error.field === "newPassword")
  );
});

test("profile update trims and persists only requested profile values", async (t) => {
  const user = await createUser();
  const originalEmail = user.email;
  const originalPhone = user.phone;
  t.mock.method(User, "findById", async () => user);

  const updated = await updateProfile(user._id, { fullName: "  Bunny Test  " });

  assert.equal(updated, user);
  assert.equal(user.fullName, "Bunny Test");
  assert.equal(user.email, originalEmail);
  assert.equal(user.phone, originalPhone);
  assert.equal(user.saved, 1);
});

test("password change rejects an incorrect current password without changing credentials", async (t) => {
  const user = await createUser();
  const oldHash = user.password;
  const oldVersion = user.tokenVersion;
  const oldRefreshHash = user.refreshTokenHash;
  t.mock.method(User, "findById", () => queryFor(user));

  await assert.rejects(
    changePassword(user._id, {
      currentPassword: "WrongPassword1!",
      newPassword: "NewPassword2!",
    }),
    (error) => error.statusCode === 401 && error.message === "Current password is incorrect."
  );

  assert.equal(user.password, oldHash);
  assert.equal(user.tokenVersion, oldVersion);
  assert.equal(user.refreshTokenHash, oldRefreshHash);
  assert.equal(user.saved, 0);
});

test("successful password change hashes the new password and invalidates sessions", async (t) => {
  const user = await createUser();
  const oldVersion = user.tokenVersion;
  t.mock.method(User, "findById", () => queryFor(user));

  await changePassword(user._id, {
    currentPassword: "CurrentPassword1!",
    newPassword: "NewPassword2!",
  });

  assert.notEqual(user.password, "NewPassword2!");
  assert.equal(await user.comparePassword("NewPassword2!"), true);
  assert.equal(await user.comparePassword("CurrentPassword1!"), false);
  assert.equal(user.refreshTokenHash, undefined);
  assert.equal(user.tokenVersion, oldVersion + 1);
  assert.equal(user.saved, 1);
});

test("profile and password endpoints require authentication and clear the refresh cookie on password change", async (t) => {
  const user = await createUser();
  t.mock.method(User, "findById", () => queryFor(user));
  const accessToken = signAccessToken({
    sub: user._id.toString(),
    role: user.role,
    business: user.business.toString(),
    tokenVersion: user.tokenVersion,
  });

  const unauthenticated = await fetch(`${baseUrl}/api/v1/profile/me`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ fullName: "Priya Shah" }),
  });
  assert.equal(unauthenticated.status, 401);

  const invalidProfile = await fetch(`${baseUrl}/api/v1/profile/me`, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ fullName: " " }),
  });
  assert.equal(invalidProfile.status, 400);
  assert.equal(user.fullName, "Original Name");

  const profileResponse = await fetch(`${baseUrl}/api/v1/profile/me`, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ fullName: "Bunny Test" }),
  });
  assert.equal(profileResponse.status, 200);
  assert.equal((await profileResponse.json()).data.user.fullName, "Bunny Test");
  assert.equal(user.fullName, "Bunny Test");

  const passwordResponse = await fetch(`${baseUrl}/api/v1/profile/me/password`, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      currentPassword: "CurrentPassword1!",
      newPassword: "NewPassword2!",
    }),
  });
  assert.equal(passwordResponse.status, 200);
  assert.match(passwordResponse.headers.get("set-cookie"), /spRefreshToken=;/);
  assert.equal(user.tokenVersion, 5);

  const staleAccessResponse = await fetch(`${baseUrl}/api/v1/profile/me`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  assert.equal(staleAccessResponse.status, 401);
});
