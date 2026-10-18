import mongoose from "mongoose";

/**
 * Minimal ActivityLog model — created here only to satisfy the
 * Authentication spec's requirement for login/logout audit logs.
 * The full Activity Logs module (covering all system actions) is
 * out of scope and may extend this schema later.
 */
const activityLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
    },
    action: {
      type: String,
      enum: [
        "LOGIN_SUCCESS",
        "LOGIN_FAILED",
        "LOGOUT",
        "PASSWORD_RESET_REQUESTED",
        "PASSWORD_RESET_SUCCESS",
        "EMAIL_VERIFIED",
        "ACCOUNT_LOCKED",
        "TOKEN_REFRESHED",
      ],
      required: true,
    },
    ipAddress: String,
    userAgent: String,
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

export const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);
