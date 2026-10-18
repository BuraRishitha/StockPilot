import mongoose from "mongoose";

const positionSchema = new mongoose.Schema(
  {
    symbol: { type: String, required: true, uppercase: true },
    quantity: { type: Number, required: true, min: 0 },
    averageCost: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const paperPortfolioSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    currency: { type: String, enum: ["INR", "USD"], default: "INR" },
    startingCash: { type: Number, min: 0 },
    cashBalance: { type: Number, default: 1000000, min: 0 },
    positions: { type: [positionSchema], default: [] },
  },
  { timestamps: true }
);

export const PaperPortfolio = mongoose.model("PaperPortfolio", paperPortfolioSchema);
