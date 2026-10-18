import dotenv from "dotenv";

dotenv.config();

const required = ["MONGO_URI", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",

  mongoUri: process.env.MONGO_URI,

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    accessExpires: process.env.JWT_ACCESS_EXPIRES || "15m",
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || "7d",
    refreshExpiresMs: Number(process.env.JWT_REFRESH_EXPIRES_MS) || 7 * 24 * 60 * 60 * 1000,
  },

  emailVerificationExpiresMs: Number(process.env.EMAIL_VERIFICATION_EXPIRES_MS) || 24 * 60 * 60 * 1000,
  passwordResetExpiresMs: Number(process.env.PASSWORD_RESET_EXPIRES_MS) || 15 * 60 * 1000,

  maxLoginAttempts: Number(process.env.MAX_LOGIN_ATTEMPTS) || 5,
  lockDurationMs: Number(process.env.LOCK_DURATION_MS) || 15 * 60 * 1000,

  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || "StockPilot <no-reply@stockpilot.com>",
  },

  cookieSecure:
    process.env.COOKIE_SECURE === "true" || (process.env.NODE_ENV || "development") === "production",
};
