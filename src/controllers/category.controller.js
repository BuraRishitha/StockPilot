import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { resolveBusinessId } from "../utils/resolveBusinessId.js";
import * as categoryService from "../services/category.service.js";

// Super Admin may target any business via ?businessId=; everyone else is
// scoped to their own business (consistent with businessSettings.controller.js).
export const createCategory = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const category = await categoryService.createCategory(businessId, req.body);
  res.status(201).json(new ApiResponse("Category created.", { category }));
});

export const getCategories = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const includeInactive = req.query.includeInactive !== "false";
  const categories = await categoryService.getCategories(businessId, { includeInactive });
  res.status(200).json(new ApiResponse("Categories fetched.", { categories }));
});

export const getCategoryById = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const category = await categoryService.getCategoryById(businessId, req.params.id);
  res.status(200).json(new ApiResponse("Category fetched.", { category }));
});

export const updateCategory = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const category = await categoryService.updateCategory(businessId, req.params.id, req.body);
  res.status(200).json(new ApiResponse("Category updated.", { category }));
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  await categoryService.deleteCategory(businessId, req.params.id);
  res.status(200).json(new ApiResponse("Category deleted.", {}));
});
