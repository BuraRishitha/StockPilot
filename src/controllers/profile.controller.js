import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import * as profileService from "../services/profile.service.js";
import { clearRefreshTokenCookie } from "../services/token.service.js";

export const getProfile = asyncHandler(async (req, res) => {
  const result = await profileService.getProfile(req.user._id);
  res.status(200).json(new ApiResponse("Profile fetched.", result));
});

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await profileService.updateProfile(req.user._id, req.body);
  res.status(200).json(new ApiResponse("Profile updated.", { user: user.toSafeJSON() }));
});

export const changePassword = asyncHandler(async (req, res) => {
  await profileService.changePassword(req.user._id, req.body);
  clearRefreshTokenCookie(res);
  res.status(200).json(new ApiResponse("Password changed successfully. Please log in again.", {}));
});

export const updateProfileImage = asyncHandler(async (req, res) => {
  const user = await profileService.updateProfileImage(req.user._id, req.body.imageUrl);
  res.status(200).json(new ApiResponse("Profile image updated.", { user: user.toSafeJSON() }));
});

export const updateNotificationPreferences = asyncHandler(async (req, res) => {
  const user = await profileService.updateNotificationPreferences(req.user._id, req.body);
  res.status(200).json(new ApiResponse("Notification preferences updated.", { user: user.toSafeJSON() }));
});

export const updateAccountPreferences = asyncHandler(async (req, res) => {
  const user = await profileService.updateAccountPreferences(req.user._id, req.body);
  res.status(200).json(new ApiResponse("Account preferences updated.", { user: user.toSafeJSON() }));
});
