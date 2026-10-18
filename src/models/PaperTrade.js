import mongoose from "mongoose";

const paperTradeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    symbol: { type: String, required: true, uppercase: true },
    side: { type: String, required: true, enum: ["buy", "sell"] },
    quantity: { type: Number, required: true, min: 0.000001 },
    executionPrice: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, enum: ["INR", "USD"], default: "INR" },
    mode: { type: String, required: true, enum: ["paper"], default: "paper" },
  },
  { timestamps: true }
);

paperTradeSchema.index({ user: 1, createdAt: -1 });

export const PaperTrade = mongoose.model("PaperTrade", paperTradeSchema);
