import crypto from "crypto";

/**
 * Generates a supplier code like "SUP-4F9B2A".
 * Uniqueness within a business is enforced by the caller (service layer)
 * retrying on collision, backed by the unique index on { business, supplierCode }.
 */
export const generateSupplierCode = () => {
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `SUP-${suffix}`;
};
