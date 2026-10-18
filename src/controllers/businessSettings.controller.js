import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { resolveBusinessId } from "../utils/resolveBusinessId.js";
import * as businessSettingsService from "../services/businessSettings.service.js";

// Super Admin may target any business via ?businessId=; everyone else is
// scoped to their own business.
export const getSettings = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const settings = await businessSettingsService.getBusinessSettings(businessId);
  res.status(200).json(new ApiResponse("Business settings fetched.", { settings }));
});

export const createSettings = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const settings = await businessSettingsService.createBusinessSettings(businessId, req.body);
  res.status(201).json(new ApiResponse("Business settings created.", { settings }));
});

export const updateSettings = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const settings = await businessSettingsService.updateBusinessSettings(businessId, req.body);
  res.status(200).json(new ApiResponse("Business settings updated.", { settings }));
});

export const deleteSettings = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  await businessSettingsService.deleteBusinessSettings(businessId);
  res.status(200).json(new ApiResponse("Business settings deleted.", {}));
});
