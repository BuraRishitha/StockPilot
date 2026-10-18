import { BusinessSettings } from "../models/BusinessSettings.js";
import { Business } from "../models/Business.js";
import { ApiError } from "../utils/ApiError.js";

export const getBusinessSettings = async (businessId) => {
  const settings = await BusinessSettings.findOne({ business: businessId });
  if (!settings) {
    throw new ApiError(404, "Business settings not found.");
  }
  return settings;
};

export const createBusinessSettings = async (businessId, data) => {
  const business = await Business.findById(businessId);
  if (!business) {
    throw new ApiError(404, "Business not found.");
  }

  const existing = await BusinessSettings.findOne({ business: businessId });
  if (existing) {
    throw new ApiError(409, "Business settings already exist for this business.");
  }

  const settings = await BusinessSettings.create({ business: businessId, ...data });
  return settings;
};

export const updateBusinessSettings = async (businessId, data) => {
  const settings = await BusinessSettings.findOneAndUpdate(
    { business: businessId },
    { $set: data },
    { new: true, runValidators: true }
  );

  if (!settings) {
    throw new ApiError(404, "Business settings not found.");
  }

  return settings;
};

export const deleteBusinessSettings = async (businessId) => {
  const settings = await BusinessSettings.findOneAndDelete({ business: businessId });
  if (!settings) {
    throw new ApiError(404, "Business settings not found.");
  }
  return settings;
};
