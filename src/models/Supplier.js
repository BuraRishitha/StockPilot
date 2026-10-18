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

const PAYMENT_TERMS = ["COD", "advance", "net_15", "net_30", "net_45", "net_60"];

const supplierSchema = new mongoose.Schema(
  {
    supplierCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    companyName: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
    },
    contactPerson: {
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
    phone: {
      type: String,
      trim: true,
      default: null,
    },
    taxId: {
      // GST / Tax Identification Number
      type: String,
      trim: true,
      default: null,
    },
    address: {
      type: addressSchema,
      default: () => ({}),
    },
    paymentTerms: {
      type: String,
      enum: PAYMENT_TERMS,
      default: "net_30",
    },
    creditLimit: {
      type: Number,
      default: 0,
      min: [0, "Credit limit cannot be negative"],
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

supplierSchema.index({ business: 1, supplierCode: 1 }, { unique: true });
supplierSchema.index(
  { business: 1, email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: "string" } }, collation: { locale: "en", strength: 2 } }
);
supplierSchema.index(
  { business: 1, phone: 1 },
  { unique: true, partialFilterExpression: { phone: { $type: "string" } } }
);

export { PAYMENT_TERMS };
export const Supplier = mongoose.model("Supplier", supplierSchema);
