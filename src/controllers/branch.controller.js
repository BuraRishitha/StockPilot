import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { resolveBusinessId } from "../utils/resolveBusinessId.js";
import * as branchService from "../services/branch.service.js";

export const createBranch = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const branch = await branchService.createBranch(businessId, req.body);
  res.status(201).json(new ApiResponse("Branch created.", { branch }));
});

export const getBranches = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const { status, branchType, search } = req.query;
  const branches = await branchService.getBranches(businessId, { status, branchType, search });
  res.status(200).json(new ApiResponse("Branches fetched.", { branches }));
});

export const getBranchById = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const branch = await branchService.getBranchById(businessId, req.params.id);
  res.status(200).json(new ApiResponse("Branch fetched.", { branch }));
});

export const updateBranch = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const branch = await branchService.updateBranch(businessId, req.params.id, req.body);
  res.status(200).json(new ApiResponse("Branch updated.", { branch }));
});

export const deleteBranch = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  await branchService.deleteBranch(businessId, req.params.id);
  res.status(200).json(new ApiResponse("Branch deleted.", {}));
});
