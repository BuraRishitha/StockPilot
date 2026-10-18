import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { resolveBusinessId } from "../utils/resolveBusinessId.js";
import * as inventoryService from "../services/branchInventory.service.js";

export const createInventory = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const inventory = await inventoryService.createInventory(businessId, req.body);
  res.status(201).json(new ApiResponse("Inventory record created.", { inventory }));
});

export const getInventories = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const { branch, product, lowStock } = req.query;
  const inventories = await inventoryService.getInventories(businessId, { branch, product, lowStock });
  res.status(200).json(new ApiResponse("Inventory records fetched.", { inventories }));
});

export const getInventoryById = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const inventory = await inventoryService.getInventoryById(businessId, req.params.id);
  res.status(200).json(new ApiResponse("Inventory record fetched.", { inventory }));
});

export const updateInventoryThresholds = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const inventory = await inventoryService.updateInventoryThresholds(businessId, req.params.id, req.body);
  res.status(200).json(new ApiResponse("Inventory thresholds updated.", { inventory }));
});

export const adjustStock = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const inventory = await inventoryService.adjustStock(
    businessId,
    req.params.id,
    req.body,
    req.user._id
  );
  res.status(200).json(new ApiResponse("Stock adjusted.", { inventory }));
});

export const reserveStock = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const inventory = await inventoryService.reserveStock(
    businessId,
    req.params.id,
    req.body,
    req.user._id
  );
  res.status(200).json(new ApiResponse("Stock reserved.", { inventory }));
});

export const releaseStock = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const inventory = await inventoryService.releaseStock(
    businessId,
    req.params.id,
    req.body,
    req.user._id
  );
  res.status(200).json(new ApiResponse("Reserved stock released.", { inventory }));
});

export const getInventoryHistory = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const history = await inventoryService.getInventoryHistory(businessId, req.params.id);
  res.status(200).json(new ApiResponse("Inventory history fetched.", { history }));
});

export const deleteInventory = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  await inventoryService.deleteInventory(businessId, req.params.id);
  res.status(200).json(new ApiResponse("Inventory record deleted.", {}));
});
