import { verifyAccessToken } from "../utils/tokenUtils.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/User.js";

/**
 * Protects a route: requires a valid JWT access token in the
 * Authorization header ("Bearer <token>").
 */
export const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const bearerMatch =
    typeof authHeader === "string" ? authHeader.match(/^Bearer\s+(\S+)$/i) : null;

  if (!bearerMatch) {
    throw new ApiError(401, "Not authenticated. Access token missing.");
  }

  const token = bearerMatch[1];

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw new ApiError(401, "Access token expired.");
    }
    throw new ApiError(401, "Invalid access token.");
  }

  if (typeof decoded.sub !== "string" || !/^[a-f\d]{24}$/i.test(decoded.sub)) {
    throw new ApiError(401, "Invalid access token.");
  }

  const user = await User.findById(decoded.sub);

  if (!user) {
    throw new ApiError(401, "User belonging to this token no longer exists.");
  }

  if ((decoded.tokenVersion || 0) !== (user.tokenVersion || 0)) {
    throw new ApiError(401, "Access token is no longer valid. Please log in again.");
  }

  if (user.status !== "active") {
    throw new ApiError(403, "Account is inactive. Contact your administrator.");
  }

  req.user = user;
  next();
});
