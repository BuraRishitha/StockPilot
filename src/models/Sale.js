import mongoose from "mongoose";

const SALE_STATUSES = ["draft", "completed", "cancelled"];
const PAYMENT_METHODS = ["cash", "card", "upi", "bank_transfer"];
const PAYMENT_STATUSES = ["pending", "paid", "partial"];

// No-skip transition map — enforced in the service layer.
const SALE_TRANSITIONS = {
  draft: ["completed", "cancelled"],
  completed: ["cancelled"],
  cancelled: [],
};

const saleSchema = new mongoose.Schema(
  {
    invoiceNumber: {
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
    customerName: {
      type: String,
      trim: true,
      default: "Walk-in Customer",
    },
    customerPhone: {
      type: String,
      trim: true,
      default: null,
    },
    customerEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },
    status: {
      type: String,
      enum: SALE_STATUSES,
      default: "draft",
    },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      default: null,
    },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: "pending",
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: [0, "Amount paid cannot be negative"],
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
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

saleSchema.index({ business: 1, invoiceNumber: 1 }, { unique: true });
saleSchema.index({ business: 1, status: 1 });

export { SALE_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES, SALE_TRANSITIONS };
export const Sale = mongoose.model("Sale", saleSchema);
