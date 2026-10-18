import { ApiError } from "../utils/ApiError.js";

/**
 * Role-Based Access Control.
 * Usage: authorize(ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN)
 * Must be used AFTER the `protect` middleware so req.user is populated.
 */
export const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return next(new ApiError(401, "Not authenticated."));
  }

  if (!allowedRoles.includes(req.user.role)) {
    return next(new ApiError(403, "You do not have permission to perform this action."));
  }

  next();
};
