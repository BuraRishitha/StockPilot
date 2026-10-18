import mongoose from "mongoose";

const OFFER_TYPES = ["percentage", "flat", "buy_x_get_y"];

const offerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Offer name is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
    offerType: {
      type: String,
      enum: OFFER_TYPES,
      required: [true, "Offer type is required"],
    },
    value: {
      // Percentage (0-100) or flat amount. Not used for buy_x_get_y.
      type: Number,
      default: null,
      min: [0, "Value cannot be negative"],
    },
    maxDiscountAmount: {
      // Optional cap, applicable to percentage-type offers.
      type: Number,
      default: null,
      min: [0, "Max discount amount cannot be negative"],
    },
    buyQuantity: {
      type: Number,
      default: null,
      min: [1, "Buy quantity must be at least 1"],
    },
    getQuantity: {
      type: Number,
      default: null,
      min: [1, "Get quantity must be at least 1"],
    },
    // Empty array on any of these = unrestricted on that dimension.
    applicableProducts: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    ],
    applicableCategories: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    ],
    applicableBranches: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Branch" },
    ],
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
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
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

offerSchema.pre("validate", function (next) {
  if (this.endDate < this.startDate) {
    return next(new Error("End date cannot be before start date."));
  }

  if (this.offerType === "buy_x_get_y") {
    if (!this.buyQuantity || !this.getQuantity) {
      return next(new Error("Buy X Get Y offers require both buyQuantity and getQuantity."));
    }
  } else {
    if (this.value == null) {
      return next(new Error("Percentage and flat offers require a value."));
    }
    if (this.offerType === "percentage" && this.value > 100) {
      return next(new Error("Percentage value cannot exceed 100."));
    }
  }

  next();
});

// Computed, not stored — "valid" means active status AND within date range.
offerSchema.virtual("isCurrentlyValid").get(function () {
  const now = new Date();
  return this.status === "active" && this.startDate <= now && this.endDate >= now;
});

offerSchema.index({ business: 1, status: 1 });
offerSchema.index({ business: 1, startDate: 1, endDate: 1 });

export { OFFER_TYPES };
export const Offer = mongoose.model("Offer", offerSchema);
