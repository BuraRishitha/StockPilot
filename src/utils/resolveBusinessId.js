import { ROLES } from "../models/User.js";
import { ApiError } from "./ApiError.js";

/**
 * Resolves the business a request should be scoped to.
 * Super Admin may target any business via ?businessId=; every other
 * role is confined to their own business.
 */
export const resolveBusinessId = (req) => {
  if (req.user.role === ROLES.SUPER_ADMIN && req.query.businessId) {
    return req.query.businessId;
  }
  if (!req.user.business) {
    throw new ApiError(400, "No business associated with this user.");
  }
  return req.user.business;
};
