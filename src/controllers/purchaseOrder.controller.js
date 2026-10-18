import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { resolveBusinessId } from "../utils/resolveBusinessId.js";
import * as poService from "../services/purchaseOrder.service.js";

export const createPurchaseOrder = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const po = await poService.createPurchaseOrder(businessId, req.body, req.user._id);
  res.status(201).json(new ApiResponse("Purchase order created.", { purchaseOrder: po }));
});

export const getPurchaseOrders = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const { status, branch, supplier, search } = req.query;
  const purchaseOrders = await poService.getPurchaseOrders(businessId, { status, branch, supplier, search });
  res.status(200).json(new ApiResponse("Purchase orders fetched.", { purchaseOrders }));
});

export const getPurchaseOrderById = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const { po, items } = await poService.getPurchaseOrderById(businessId, req.params.id);
  res.status(200).json(new ApiResponse("Purchase order fetched.", { purchaseOrder: po, items }));
});

export const updatePurchaseOrder = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const po = await poService.updatePurchaseOrder(businessId, req.params.id, req.body);
  res.status(200).json(new ApiResponse("Purchase order updated.", { purchaseOrder: po }));
});

export const addItem = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const item = await poService.addItem(businessId, req.params.id, req.body);
  res.status(201).json(new ApiResponse("Item added to purchase order.", { item }));
});

export const updateItem = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const item = await poService.updateItem(businessId, req.params.id, req.params.itemId, req.body);
  res.status(200).json(new ApiResponse("Purchase order item updated.", { item }));
});

export const removeItem = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  await poService.removeItem(businessId, req.params.id, req.params.itemId);
  res.status(200).json(new ApiResponse("Purchase order item removed.", {}));
});

export const changeStatus = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const po = await poService.changeStatus(businessId, req.params.id, req.body, req.user._id);
  res.status(200).json(new ApiResponse(`Purchase order status changed to '${po.status}'.`, { purchaseOrder: po }));
});

export const deletePurchaseOrder = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  await poService.deletePurchaseOrder(businessId, req.params.id);
  res.status(200).json(new ApiResponse("Purchase order deleted.", {}));
});
