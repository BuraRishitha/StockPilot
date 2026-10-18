import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { resolveBusinessId } from "../utils/resolveBusinessId.js";
import * as analyticsService from "../services/analytics.service.js";

export const getSalesAnalytics = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const { period, startDate, endDate } = req.query;
  const data = await analyticsService.getSalesAnalytics(businessId, { period, startDate, endDate });
  res.status(200).json(new ApiResponse("Sales analytics fetched.", { data }));
});

export const getRevenueAnalytics = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const { period, startDate, endDate } = req.query;
  const data = await analyticsService.getRevenueAnalytics(businessId, { period, startDate, endDate });
  res.status(200).json(new ApiResponse("Revenue analytics fetched.", { data }));
});

export const getPurchaseAnalytics = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const { period, startDate, endDate, status } = req.query;
  const data = await analyticsService.getPurchaseAnalytics(businessId, { period, startDate, endDate, status });
  res.status(200).json(new ApiResponse("Purchase analytics fetched.", { data }));
});

export const getInventoryValueAnalytics = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const data = await analyticsService.getInventoryValueAnalytics(businessId);
  res.status(200).json(new ApiResponse("Inventory value analytics fetched.", { data }));
});

export const getLowStockAnalytics = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const data = await analyticsService.getLowStockAnalytics(businessId);
  res.status(200).json(new ApiResponse("Low stock analytics fetched.", { data }));
});

export const getTopSellingProducts = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const { startDate, endDate, limit } = req.query;
  const data = await analyticsService.getTopSellingProducts(businessId, { startDate, endDate, limit });
  res.status(200).json(new ApiResponse("Top selling products fetched.", { data }));
});

export const getTopPerformingCategories = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const { startDate, endDate, limit } = req.query;
  const data = await analyticsService.getTopPerformingCategories(businessId, { startDate, endDate, limit });
  res.status(200).json(new ApiResponse("Top performing categories fetched.", { data }));
});

export const getBranchSalesSummary = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const { startDate, endDate } = req.query;
  const data = await analyticsService.getBranchSalesSummary(businessId, { startDate, endDate });
  res.status(200).json(new ApiResponse("Branch-wise sales summary fetched.", { data }));
});

export const getSupplierPurchaseSummary = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const { startDate, endDate, status } = req.query;
  const data = await analyticsService.getSupplierPurchaseSummary(businessId, { startDate, endDate, status });
  res.status(200).json(new ApiResponse("Supplier purchase summary fetched.", { data }));
});
