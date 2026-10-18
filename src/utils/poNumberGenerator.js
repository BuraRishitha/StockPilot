import crypto from "crypto";

/**
 * Generates a PO number like "PO-20260725-4F9B".
 * Uniqueness within a business is enforced by the caller (service layer)
 * retrying on collision, backed by the unique index on { business, poNumber }.
 */
export const generatePoNumber = () => {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `PO-${datePart}-${suffix}`;
};
