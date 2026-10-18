import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { resolveBusinessId } from "../utils/resolveBusinessId.js";
import * as saleService from "../services/sale.service.js";

export const createSale = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const sale = await saleService.createSale(businessId, req.body, req.user._id);
  res.status(201).json(new ApiResponse("Sale created.", { sale }));
});

export const getSales = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const { status, branch, paymentStatus, search } = req.query;
  const sales = await saleService.getSales(businessId, { status, branch, paymentStatus, search });
  res.status(200).json(new ApiResponse("Sales fetched.", { sales }));
});

export const getSaleById = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const { sale, items } = await saleService.getSaleById(businessId, req.params.id);
  res.status(200).json(new ApiResponse("Sale fetched.", { sale, items }));
});

export const updateSale = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const sale = await saleService.updateSale(businessId, req.params.id, req.body);
  res.status(200).json(new ApiResponse("Sale updated.", { sale }));
});

export const addItem = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const item = await saleService.addItem(businessId, req.params.id, req.body);
  res.status(201).json(new ApiResponse("Item added to sale.", { item }));
});

export const updateItem = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const item = await saleService.updateItem(businessId, req.params.id, req.params.itemId, req.body);
  res.status(200).json(new ApiResponse("Sale item updated.", { item }));
});

export const removeItem = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  await saleService.removeItem(businessId, req.params.id, req.params.itemId);
  res.status(200).json(new ApiResponse("Sale item removed.", {}));
});

export const changeStatus = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const sale = await saleService.changeStatus(businessId, req.params.id, req.body, req.user._id);
  res.status(200).json(new ApiResponse(`Sale status changed to '${sale.status}'.`, { sale }));
});

export const deleteSale = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  await saleService.deleteSale(businessId, req.params.id);
  res.status(200).json(new ApiResponse("Sale deleted.", {}));
});
