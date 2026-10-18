import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    line1: { type: String, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true },
    postalCode: { type: String, trim: true },
  },
  { _id: false }
);

const businessSettingsSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      unique: true,
    },
    logoUrl: {
      type: String,
      trim: true,
      default: null,
    },
    address: {
      type: addressSchema,
      default: () => ({}),
    },
    taxId: {
      // GST / Tax Identification Number
      type: String,
      trim: true,
      default: null,
    },
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: "INR",
    },
    timezone: {
      type: String,
      trim: true,
      default: "Asia/Kolkata",
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    contactPhone: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

export const BusinessSettings = mongoose.model("BusinessSettings", businessSettingsSchema);
