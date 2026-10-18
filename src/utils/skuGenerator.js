import crypto from "crypto";

/**
 * Generates a SKU like "ELE-4F9B2A" from a product name.
 * Uniqueness within a business is enforced by the caller (service layer)
 * retrying on collision, backed by the unique index on { business, sku }.
 */
export const generateSKU = (name = "") => {
  const prefix =
    name
      .trim()
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 3)
      .toUpperCase() || "PRD";
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${suffix}`;
};
