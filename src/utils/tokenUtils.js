import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env.js";

export const signAccessToken = (payload) =>
  jwt.sign(payload, env.jwt.accessSecret, {
    algorithm: "HS256",
    expiresIn: env.jwt.accessExpires,
  });

export const signRefreshToken = (payload) =>
  jwt.sign(payload, env.jwt.refreshSecret, {
    algorithm: "HS256",
    expiresIn: env.jwt.refreshExpires,
    jwtid: crypto.randomUUID(),
  });

export const verifyAccessToken = (token) =>
  jwt.verify(token, env.jwt.accessSecret, { algorithms: ["HS256"] });

export const verifyRefreshToken = (token) =>
  jwt.verify(token, env.jwt.refreshSecret, { algorithms: ["HS256"] });

/**
 * Generates a random raw token for email verification / password reset,
 * plus its SHA-256 hash for storage. Only the hash is persisted; the raw
 * token is sent to the user via email and never stored in plaintext.
 */
export const generateRawAndHashedToken = () => {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
  return { rawToken, hashedToken };
};

export const hashToken = (rawToken) =>
  crypto.createHash("sha256").update(rawToken).digest("hex");
