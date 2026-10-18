import mongoose from "mongoose";

const UNITS = ["pcs", "kg", "g", "litre", "ml", "box", "pack", "dozen", "meter"];

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    barcode: {
      type: String,
      trim: true,
      default: null,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },
    // Supplier module is out of scope; referenced loosely for future linkage.
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      default: null,
    },
    brand: {
      type: String,
      trim: true,
      default: null,
    },
    unit: {
      type: String,
      enum: UNITS,
      required: [true, "Unit of measurement is required"],
    },
    costPrice: {
      type: Number,
      required: [true, "Cost price is required"],
      min: [0, "Cost price cannot be negative"],
    },
    sellingPrice: {
      type: Number,
      required: [true, "Selling price is required"],
      min: [0, "Selling price cannot be negative"],
    },
    offerPrice: {
      type: Number,
      default: null,
      min: [0, "Offer price cannot be negative"],
    },
    taxPercentage: {
      type: Number,
      default: 0,
      min: [0, "Tax percentage cannot be negative"],
      max: [100, "Tax percentage cannot exceed 100"],
    },
    lowStockThreshold: {
      type: Number,
      default: 10,
      min: [0, "Low stock threshold cannot be negative"],
    },
    imageUrl: {
      type: String,
      trim: true,
      default: null,
    },
    description: {
      type: String,
      trim: true,
      default: null,
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

// Business rules from project constitution.
productSchema.pre("validate", function (next) {
  if (this.sellingPrice < this.costPrice) {
    return next(new Error("Selling price must be greater than or equal to cost price."));
  }
  if (this.offerPrice != null && this.offerPrice > this.sellingPrice) {
    return next(new Error("Offer price must be less than or equal to selling price."));
  }
  next();
});

productSchema.index({ business: 1, sku: 1 }, { unique: true });

export { UNITS };
export const Product = mongoose.model("Product", productSchema);
