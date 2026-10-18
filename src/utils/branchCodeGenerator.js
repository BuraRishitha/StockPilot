import crypto from "crypto";

/**
 * Generates a branch code like "BR-4F9B2A".
 * Uniqueness within a business is enforced by the caller (service layer)
 * retrying on collision, backed by the unique index on { business, branchCode }.
 */
export const generateBranchCode = () => {
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `BR-${suffix}`;
};
