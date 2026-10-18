import mongoose from "mongoose";

/**
 * NOTE: This is a MINIMAL stub of the Business collection.
 * It exists only because Authentication -> Registration requires a
 * Business to be created for a Business Admin.
 * The full Business Settings module (address, tax info, logo, etc.)
 * is OUT OF SCOPE for the Authentication module and will extend
 * this schema when that module is generated.
 */
const businessSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Business name is required"],
      trim: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

export const Business = mongoose.model("Business", businessSchema);
