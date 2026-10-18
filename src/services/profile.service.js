import { User } from "../models/User.js";
import { Business } from "../models/Business.js";
import { ApiError } from "../utils/ApiError.js";

export const getProfile = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found.");

  const business = user.business ? await Business.findById(user.business) : null;

  return {
    user: user.toSafeJSON(),
    business: business ? { id: business._id, name: business.name, status: business.status } : null,
  };
};

export const updateProfile = async (userId, data) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found.");

  if (data.fullName !== undefined) user.fullName = data.fullName.trim();
  if (data.phone !== undefined) user.phone = data.phone;

  await user.save();
  return user;
};

export const changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await User.findById(userId).select("+password +refreshTokenHash");
  if (!user) throw new ApiError(404, "User not found.");

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw new ApiError(401, "Current password is incorrect.");
  }

  user.password = newPassword;
  // Invalidate any active session on password change.
  user.refreshTokenHash = undefined;
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  return user;
};

export const updateProfileImage = async (userId, imageUrl) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found.");

  user.profileImageUrl = imageUrl;
  await user.save();

  return user;
};

export const updateNotificationPreferences = async (userId, preferences) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found.");

  user.notificationPreferences = { ...user.notificationPreferences.toObject(), ...preferences };
  await user.save();

  return user;
};

export const updateAccountPreferences = async (userId, preferences) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found.");

  user.accountPreferences = { ...user.accountPreferences.toObject(), ...preferences };
  await user.save();

  return user;
};
