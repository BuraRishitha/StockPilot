import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { resolveBusinessId } from "../utils/resolveBusinessId.js";
import * as dashboardService from "../services/dashboard.service.js";

export const getOverview = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const overview = await dashboardService.getOverview(businessId);
  res.status(200).json(new ApiResponse("Dashboard overview fetched.", { overview }));
});

export const getLowStockProducts = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const items = await dashboardService.getLowStockProducts(businessId, req.query.limit);
  res.status(200).json(new ApiResponse("Low stock products fetched.", { items }));
});

export const getRecentSales = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const sales = await dashboardService.getRecentSales(businessId, req.query.limit);
  res.status(200).json(new ApiResponse("Recent sales fetched.", { sales }));
});

export const getRecentPurchaseOrders = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const purchaseOrders = await dashboardService.getRecentPurchaseOrders(businessId, req.query.limit);
  res.status(200).json(new ApiResponse("Recent purchase orders fetched.", { purchaseOrders }));
});

export const getTopSellingProducts = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const products = await dashboardService.getTopSellingProducts(businessId, req.query.limit);
  res.status(200).json(new ApiResponse("Top selling products fetched.", { products }));
});

export const getSalesSummary = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const summary = await dashboardService.getSalesSummary(businessId);
  res.status(200).json(new ApiResponse("Sales summary fetched.", { summary }));
});

export const getPurchaseSummary = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const summary = await dashboardService.getPurchaseSummary(businessId);
  res.status(200).json(new ApiResponse("Purchase summary fetched.", { summary }));
});

export const getInventorySummary = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const summary = await dashboardService.getInventorySummary(businessId);
  res.status(200).json(new ApiResponse("Inventory summary fetched.", { summary }));
});
