import mongoose from "mongoose";
import bcrypt from "bcryptjs";

export const ROLES = Object.freeze({
  SUPER_ADMIN: "super_admin",
  BUSINESS_ADMIN: "business_admin",
  BRANCH_MANAGER: "branch_manager",
  STAFF: "staff",
});

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 8,
      select: false,
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      required: true,
      default: ROLES.STAFF,
    },
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: function () {
        // Every role belongs to a business, including the admin who created it.
        return true;
      },
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      // Optional for Super Admin / Business Admin; required for Manager/Staff
      // at the application-validation layer (see auth.validator.js), since
      // the Branch module itself is out of scope here.
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    // Profile
    profileImageUrl: {
      type: String,
      trim: true,
      default: null,
    },
    notificationPreferences: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true },
      lowStockAlerts: { type: Boolean, default: true },
    },
    accountPreferences: {
      language: { type: String, trim: true, default: "en" },
      timezone: { type: String, trim: true, default: "Asia/Kolkata" },
      theme: { type: String, enum: ["light", "dark"], default: "light" },
    },

    // Email verification
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationTokenHash: {
      type: String,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
    },

    // Password reset
    passwordResetTokenHash: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },

    // Refresh token rotation (hashed, current token only)
    refreshTokenHash: {
      type: String,
      select: false,
    },

    // Incremented when credentials change to invalidate issued access tokens.
    tokenVersion: {
      type: Number,
      default: 0,
    },

    // Brute-force protection
    failedLoginAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    lockUntil: {
      type: Date,
      select: false,
    },

    lastLoginAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// NOTE: no separate schema.index() for email — the field's `unique: true`
// above already creates this index; adding another was a duplicate.
// ---- Hooks ----
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ---- Instance methods ----
userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

userSchema.methods.toSafeJSON = function () {
  return {
    id: this._id,
    fullName: this.fullName,
    email: this.email,
    phone: this.phone,
    role: this.role,
    business: this.business,
    branch: this.branch,
    status: this.status,
    profileImageUrl: this.profileImageUrl,
    notificationPreferences: this.notificationPreferences,
    accountPreferences: this.accountPreferences,
    isEmailVerified: this.isEmailVerified,
    lastLoginAt: this.lastLoginAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const User = mongoose.model("User", userSchema);
