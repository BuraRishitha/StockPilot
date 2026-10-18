import mongoose from "mongoose";

const watchlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    symbols: {
      type: [{ type: String, uppercase: true, trim: true }],
      default: [],
      validate: {
        validator: (symbols) => new Set(symbols).size === symbols.length,
        message: "Watchlist symbols must be unique.",
      },
    },
  },
  { timestamps: true }
);

export const Watchlist = mongoose.model("Watchlist", watchlistSchema);
