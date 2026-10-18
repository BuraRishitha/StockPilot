import mongoose from "mongoose";

const BRANCH_TYPES = ["head_office", "branch", "warehouse"];
const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

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

const dayHoursSchema = new mongoose.Schema(
  {
    isClosed: { type: Boolean, default: false },
    openTime: { type: String, trim: true, default: "09:00" }, // "HH:mm"
    closeTime: { type: String, trim: true, default: "18:00" }, // "HH:mm"
  },
  { _id: false }
);

const businessHoursSchema = new mongoose.Schema(
  DAYS.reduce((schema, day) => {
    schema[day] = { type: dayHoursSchema, default: () => ({}) };
    return schema;
  }, {}),
  { _id: false }
);

const branchSchema = new mongoose.Schema(
  {
    branchCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, "Branch name is required"],
      trim: true,
    },
    branchType: {
      type: String,
      enum: BRANCH_TYPES,
      required: [true, "Branch type is required"],
      default: "branch",
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    address: {
      type: addressSchema,
      default: () => ({}),
    },
    phone: {
      type: String,
      trim: true,
      default: null,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },
    businessHours: {
      type: businessHoursSchema,
      default: () => ({}),
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
  },
  { timestamps: true }
);

branchSchema.index({ business: 1, branchCode: 1 }, { unique: true });
branchSchema.index(
  { business: 1, name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);

export { BRANCH_TYPES, DAYS };
export const Branch = mongoose.model("Branch", branchSchema);
