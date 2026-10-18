import mongoose from "mongoose";

const TRANSACTION_TYPES = [
  "IN", // stock added (e.g. purchase receipt)
  "OUT", // stock removed (e.g. sale, damage)
  "ADJUSTMENT", // absolute correction
  "RESERVE", // stock reserved (e.g. pending transfer/order)
  "RELEASE", // reserved stock released back to available
  "TRANSFER_OUT", // reserved for future Transfers module
  "TRANSFER_IN", // reserved for future Transfers module
];

const inventoryTransactionSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    inventory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BranchInventory",
      required: true,
    },
    type: {
      type: String,
      enum: TRANSACTION_TYPES,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [0, "Quantity cannot be negative"],
    },
    previousStock: {
      type: Number,
      required: true,
    },
    newStock: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      trim: true,
      default: null,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Loose linkage for future modules (PurchaseOrders, Transfers, Sales)
    // without creating a hard dependency on those out-of-scope modules.
    referenceType: {
      type: String,
      trim: true,
      default: null,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
  { timestamps: true }
);

inventoryTransactionSchema.index({ inventory: 1, createdAt: -1 });
inventoryTransactionSchema.index({ business: 1, branch: 1, product: 1 });

export { TRANSACTION_TYPES };
export const InventoryTransaction = mongoose.model(
  "InventoryTransaction",
  inventoryTransactionSchema
);
