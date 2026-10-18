import mongoose from "mongoose";

const purchaseOrderItemSchema = new mongoose.Schema(
  {
    purchaseOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseOrder",
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
    unitCost: {
      type: Number,
      required: [true, "Unit cost is required"],
      min: [0, "Unit cost cannot be negative"],
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
    receivedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

purchaseOrderItemSchema.pre("validate", function (next) {
  const subtotal = this.quantity * this.unitCost;
  const taxAmount = (subtotal * this.taxPercentage) / 100;
  const total = subtotal - this.discount + taxAmount;

  if (total < 0) {
    return next(new Error("Discount cannot exceed the item subtotal plus tax."));
  }

  this.lineTotal = Math.round(total * 100) / 100;
  next();
});

purchaseOrderItemSchema.index({ purchaseOrder: 1, product: 1 }, { unique: true });

export const PurchaseOrderItem = mongoose.model("PurchaseOrderItem", purchaseOrderItemSchema);
