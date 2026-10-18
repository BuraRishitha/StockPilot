import mongoose from "mongoose";

const PO_STATUSES = ["draft", "pending", "approved", "received", "cancelled"];

// No-skip transition map — enforced in the service layer.
const PO_TRANSITIONS = {
  draft: ["pending", "cancelled"],
  pending: ["approved", "cancelled"],
  approved: ["received", "cancelled"],
  received: [],
  cancelled: [],
};

const purchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: [true, "Branch is required"],
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: [true, "Supplier is required"],
    },
    status: {
      type: String,
      enum: PO_STATUSES,
      default: "draft",
    },
    expectedDeliveryDate: {
      type: Date,
      default: null,
    },
    receivedDate: {
      type: Date,
      default: null,
    },
    totalQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    subtotalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalTax: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

purchaseOrderSchema.index({ business: 1, poNumber: 1 }, { unique: true });
purchaseOrderSchema.index({ business: 1, status: 1 });

export { PO_STATUSES, PO_TRANSITIONS };
export const PurchaseOrder = mongoose.model("PurchaseOrder", purchaseOrderSchema);
