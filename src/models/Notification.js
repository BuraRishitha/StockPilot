import mongoose from "mongoose";

const NOTIFICATION_TYPES = [
  "low_stock",
  "purchase_order_received",
  "sale_completed",
  "offer_expiring",
  "system",
];

const notificationSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: [true, "Notification type is required"],
    },
    title: {
      type: String,
      required: [true, "Notification title is required"],
      trim: true,
    },
    message: {
      type: String,
      required: [true, "Notification message is required"],
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
    // Loose linkage to the entity that triggered the notification
    // (Product, PurchaseOrder, Sale, Offer, etc.) without hard-coupling
    // this module to those schemas.
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

notificationSchema.index({ business: 1, recipient: 1, isRead: 1, createdAt: -1 });

export { NOTIFICATION_TYPES };
export const Notification = mongoose.model("Notification", notificationSchema);
