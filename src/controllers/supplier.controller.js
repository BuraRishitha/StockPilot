import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { resolveBusinessId } from "../utils/resolveBusinessId.js";
import * as supplierService from "../services/supplier.service.js";

export const createSupplier = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const supplier = await supplierService.createSupplier(businessId, req.body);
  res.status(201).json(new ApiResponse("Supplier created.", { supplier }));
});

export const getSuppliers = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const { status, search } = req.query;
  const suppliers = await supplierService.getSuppliers(businessId, { status, search });
  res.status(200).json(new ApiResponse("Suppliers fetched.", { suppliers }));
});

export const getSupplierById = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const supplier = await supplierService.getSupplierById(businessId, req.params.id);
  res.status(200).json(new ApiResponse("Supplier fetched.", { supplier }));
});

export const updateSupplier = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const supplier = await supplierService.updateSupplier(businessId, req.params.id, req.body);
  res.status(200).json(new ApiResponse("Supplier updated.", { supplier }));
});

export const deleteSupplier = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  await supplierService.deleteSupplier(businessId, req.params.id);
  res.status(200).json(new ApiResponse("Supplier deleted.", {}));
});
