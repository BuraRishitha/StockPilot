import mongoose from "mongoose";

const branchInventorySchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
    },
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    currentStock: {
      type: Number,
      default: 0,
      min: [0, "Current stock cannot be negative"],
    },
    reservedStock: {
      type: Number,
      default: 0,
      min: [0, "Reserved stock cannot be negative"],
    },
    minStock: {
      type: Number,
      default: 0,
      min: [0, "Minimum stock cannot be negative"],
    },
    maxStock: {
      type: Number,
      default: null,
      min: [0, "Maximum stock cannot be negative"],
    },
    reorderLevel: {
      type: Number,
      default: 0,
      min: [0, "Reorder level cannot be negative"],
    },
    lastAdjustedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// availableStock is derived, never stored directly.
branchInventorySchema.virtual("availableStock").get(function () {
  return this.currentStock - this.reservedStock;
});

branchInventorySchema.pre("validate", function (next) {
  if (this.reservedStock > this.currentStock) {
    return next(new Error("Reserved stock cannot exceed current stock."));
  }
  if (this.maxStock != null && this.minStock > this.maxStock) {
    return next(new Error("Minimum stock cannot exceed maximum stock."));
  }
  next();
});

// One inventory record per Product + Branch.
branchInventorySchema.index({ product: 1, branch: 1 }, { unique: true });
branchInventorySchema.index({ business: 1, branch: 1 });

export const BranchInventory = mongoose.model("BranchInventory", branchInventorySchema);
