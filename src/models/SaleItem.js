import mongoose from "mongoose";

const saleItemSchema = new mongoose.Schema(
  {
    sale: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sale",
      required: true,
    },
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
    },
    unitPrice: {
      type: Number,
      required: [true, "Unit price is required"],
      min: [0, "Unit price cannot be negative"],
    },
    taxPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lineTotal: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

saleItemSchema.pre("validate", function (next) {
  const subtotal = this.quantity * this.unitPrice;
  const taxAmount = (subtotal * this.taxPercentage) / 100;
  const total = subtotal - this.discount + taxAmount;

  if (total < 0) {
    return next(new Error("Discount cannot exceed the item subtotal plus tax."));
  }

  this.lineTotal = Math.round(total * 100) / 100;
  next();
});

saleItemSchema.index({ sale: 1, product: 1 }, { unique: true });

export const SaleItem = mongoose.model("SaleItem", saleItemSchema);
