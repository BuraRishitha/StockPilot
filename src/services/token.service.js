import bcrypt from "bcryptjs";
import { signAccessToken, signRefreshToken } from "../utils/tokenUtils.js";
import { env } from "../config/env.js";

const REFRESH_COOKIE_NAME = "spRefreshToken";

/**
 * Issues a new access + refresh token pair for a user, persists the
 * hashed refresh token on the user document (rotation-ready — the
 * caller is responsible for saving the user after calling this),
 * and returns both tokens plus cookie options.
 */
export const issueTokenPair = async (user) => {
  const payload = {
    sub: user._id.toString(),
    role: user.role,
    business: user.business,
    tokenVersion: user.tokenVersion || 0,
  };

  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  const salt = await bcrypt.genSalt(10);
  user.refreshTokenHash = await bcrypt.hash(refreshToken, salt);

  return { accessToken, refreshToken };
};

export const setRefreshTokenCookie = (res, refreshToken) => {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: "strict",
    maxAge: env.jwt.refreshExpiresMs,
    path: "/api/v1/auth",
  });
};

export const clearRefreshTokenCookie = (res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: "strict",
    path: "/api/v1/auth",
  });
};

export const getRefreshTokenFromRequest = (req) => req.cookies?.[REFRESH_COOKIE_NAME];

export { REFRESH_COOKIE_NAME };
