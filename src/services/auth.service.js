import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User, ROLES } from "../models/User.js";
import { Business } from "../models/Business.js";
import { ActivityLog } from "../models/ActivityLog.js";
import { ApiError } from "../utils/ApiError.js";
import { env } from "../config/env.js";
import {
  generateRawAndHashedToken,
  hashToken,
  verifyRefreshToken,
} from "../utils/tokenUtils.js";
import { sendVerificationEmail, sendPasswordResetEmail } from "../utils/emailUtils.js";
import { issueTokenPair } from "./token.service.js";

const logActivity = async ({ user, business, action, req, metadata = {} }) => {
  try {
    await ActivityLog.create({
      user,
      business,
      action,
      ipAddress: req?.ip,
      userAgent: req?.headers?.["user-agent"],
      metadata,
    });
  } catch (err) {
    // Audit logging must never block the primary auth flow.
    console.error("Failed to write activity log:", { name: err.name, code: err.code });
  }
};

/**
 * Registration is restricted to a new Business Admin, who creates
 * their Business at the same time (see project rule: "A Business
 * Admin creates a business during registration").
 */
export const registerBusinessAdmin = async ({ fullName, email, phone, password, businessName }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new ApiError(409, "An account with this email already exists.");
  }

  const session = await mongoose.startSession();
  try {
    let createdUser;

    await session.withTransaction(async () => {
      const [business] = await Business.create(
        [{ name: businessName, owner: new mongoose.Types.ObjectId() }],
        { session }
      );

      const [user] = await User.create(
        [
          {
            fullName,
            email: normalizedEmail,
            phone,
            password,
            role: ROLES.BUSINESS_ADMIN,
            business: business._id,
            branch: null,
          },
        ],
        { session }
      );

      business.owner = user._id;
      await business.save({ session });

      createdUser = user;
    });

    const { rawToken, hashedToken } = generateRawAndHashedToken();
    createdUser.emailVerificationTokenHash = hashedToken;
    createdUser.emailVerificationExpires = new Date(Date.now() + env.emailVerificationExpiresMs);
    await createdUser.save();

    await sendVerificationEmail(createdUser.email, rawToken);

    return createdUser;
  } finally {
    session.endSession();
  }
};

export const verifyEmail = async (rawToken) => {
  const hashedToken = hashToken(rawToken);

  const user = await User.findOne({
    emailVerificationTokenHash: hashedToken,
    emailVerificationExpires: { $gt: Date.now() },
  }).select("+emailVerificationTokenHash +emailVerificationExpires");

  if (!user) {
    throw new ApiError(400, "Verification token is invalid or has expired.");
  }

  user.isEmailVerified = true;
  user.emailVerificationTokenHash = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  await logActivity({ user: user._id, business: user.business, action: "EMAIL_VERIFIED" });

  return user;
};

export const resendVerificationEmail = async (email) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!normalizedEmail) {
    return false;
  }

  const user = await User.findOne({ email: normalizedEmail });

  if (!user || user.isEmailVerified) {
    return false;
  }

  const { rawToken, hashedToken } = generateRawAndHashedToken();
  user.emailVerificationTokenHash = hashedToken;
  user.emailVerificationExpires = new Date(Date.now() + env.emailVerificationExpiresMs);

  await user.save({ validateBeforeSave: false });

  try {
    await sendVerificationEmail(user.email, rawToken);
    await logActivity({
      user: user._id,
      business: user.business,
      action: "VERIFICATION_EMAIL_RESENT",
    });
    return true;
  } catch (err) {
    user.emailVerificationTokenHash = undefined;
    user.emailVerificationExpires = undefined;
    await user.save({ validateBeforeSave: false });
    console.error("Failed to resend verification email:", { name: err.name, code: err.code });
    return false;
  }
};

export const login = async ({ email, password }, req) => {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }).select(
    "+password +failedLoginAttempts +lockUntil"
  );

  if (!user) {
    throw new ApiError(401, "Invalid email or password.");
  }

  if (user.isLocked()) {
    const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
    throw new ApiError(
      423,
      `Account locked due to multiple failed login attempts. Try again in ${minutesLeft} minute(s).`
    );
  }

  if (user.status !== "active") {
    throw new ApiError(403, "Account is inactive. Contact your administrator.");
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    user.failedLoginAttempts += 1;

    if (user.failedLoginAttempts >= env.maxLoginAttempts) {
      user.lockUntil = new Date(Date.now() + env.lockDurationMs);
      user.failedLoginAttempts = 0;
      await user.save({ validateBeforeSave: false });
      await logActivity({
        user: user._id,
        business: user.business,
        action: "ACCOUNT_LOCKED",
        req,
      });
      throw new ApiError(
        423,
        `Account locked after ${env.maxLoginAttempts} failed attempts. Try again later.`
      );
    }

    await user.save({ validateBeforeSave: false });
    await logActivity({ user: user._id, business: user.business, action: "LOGIN_FAILED", req });
    throw new ApiError(401, "Invalid email or password.");
  }

  if (!user.isEmailVerified) {
    throw new ApiError(403, "Please verify your email before logging in.");
  }

  // Successful login: reset lockout counters.
  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  user.lastLoginAt = new Date();

  const { accessToken, refreshToken } = await issueTokenPair(user);
  await user.save({ validateBeforeSave: false });

  await logActivity({ user: user._id, business: user.business, action: "LOGIN_SUCCESS", req });

  return { user, accessToken, refreshToken };
};

export const refreshTokens = async (rawRefreshToken, req) => {
  if (!rawRefreshToken) {
    throw new ApiError(401, "Refresh token missing.");
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(rawRefreshToken);
  } catch (err) {
    throw new ApiError(401, "Invalid or expired refresh token.");
  }

  const user = await User.findById(decoded.sub).select("+refreshTokenHash");
  if (!user || !user.refreshTokenHash) {
    throw new ApiError(401, "Invalid refresh token.");
  }

  const matches = await bcrypt.compare(rawRefreshToken, user.refreshTokenHash);
  if (!matches) {
    // Possible token reuse / theft — invalidate the stored token defensively.
    user.refreshTokenHash = undefined;
    await user.save({ validateBeforeSave: false });
    throw new ApiError(401, "Refresh token is no longer valid. Please log in again.");
  }

  if (user.status !== "active") {
    throw new ApiError(403, "Account is inactive.");
  }

  const { accessToken, refreshToken } = await issueTokenPair(user);
  await user.save({ validateBeforeSave: false });

  await logActivity({ user: user._id, business: user.business, action: "TOKEN_REFRESHED", req });

  return { user, accessToken, refreshToken };
};

export const logout = async (userId, req) => {
  const user = await User.findById(userId).select("+refreshTokenHash");
  if (user) {
    user.refreshTokenHash = undefined;
    await user.save({ validateBeforeSave: false });
    await logActivity({ user: user._id, business: user.business, action: "LOGOUT", req });
  }
};

export const forgotPassword = async (email) => {
  const user = await User.findOne({ email: email.trim().toLowerCase() });

  // Do not reveal whether the email exists — always respond as if sent.
  if (!user) return;

  const { rawToken, hashedToken } = generateRawAndHashedToken();
  user.passwordResetTokenHash = hashedToken;
  user.passwordResetExpires = new Date(Date.now() + env.passwordResetExpiresMs);
  await user.save({ validateBeforeSave: false });

  try {
    await sendPasswordResetEmail(user.email, rawToken);
  } catch (sendError) {
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpires = undefined;
    try {
      await user.save({ validateBeforeSave: false });
    } catch (cleanupError) {
      console.error("Failed to clear unusable password reset token:", {
        name: cleanupError.name,
        code: cleanupError.code,
      });
      throw cleanupError;
    }
    throw sendError;
  }

  await logActivity({
    user: user._id,
    business: user.business,
    action: "PASSWORD_RESET_REQUESTED",
  });
};

export const resetPassword = async (rawToken, newPassword) => {
  const hashedToken = hashToken(rawToken);
  const session = await mongoose.startSession();
  let user;
  try {
    await session.withTransaction(async () => {
      user = await User.findOne({
        passwordResetTokenHash: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
      })
        .select("+passwordResetTokenHash +passwordResetExpires +refreshTokenHash")
        .session(session);

      if (!user) {
        throw new ApiError(400, "Reset token is invalid or has expired.");
      }

      user.password = newPassword;
      user.passwordResetTokenHash = undefined;
      user.passwordResetExpires = undefined;
      // Invalidate any existing session on password change.
      user.refreshTokenHash = undefined;
      user.tokenVersion = (user.tokenVersion || 0) + 1;
      user.failedLoginAttempts = 0;
      user.lockUntil = undefined;
      await user.save({ session });
    });
  } finally {
    await session.endSession();
  }

  await logActivity({
    user: user._id,
    business: user.business,
    action: "PASSWORD_RESET_SUCCESS",
  });

  return user;
};
