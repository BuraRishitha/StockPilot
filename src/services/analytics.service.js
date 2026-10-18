import mongoose from "mongoose";
import { Sale } from "../models/Sale.js";
import { SaleItem } from "../models/SaleItem.js";
import { PurchaseOrder } from "../models/PurchaseOrder.js";
import { BranchInventory } from "../models/BranchInventory.js";

const oid = (id) => new mongoose.Types.ObjectId(id);

const PERIOD_UNITS = {
  daily: "day",
  weekly: "week",
  monthly: "month",
  yearly: "year",
};

const buildDateRangeMatch = (startDate, endDate) => {
  const range = {};
  if (startDate) range.$gte = new Date(startDate);
  if (endDate) range.$lte = new Date(endDate);
  return Object.keys(range).length ? range : null;
};

export const getSalesAnalytics = async (businessId, { period = "daily", startDate, endDate } = {}) => {
  const unit = PERIOD_UNITS[period] || "day";
  const match = { business: oid(businessId), status: "completed" };
  const dateRange = buildDateRangeMatch(startDate, endDate);
  if (dateRange) match.createdAt = dateRange;

  return Sale.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateTrunc: { date: "$createdAt", unit, timezone: "UTC" } },
        orderCount: { $sum: 1 },
        totalQuantity: { $sum: "$totalQuantity" },
        revenue: { $sum: "$totalAmount" },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        period: "$_id",
        orderCount: 1,
        totalQuantity: 1,
        revenue: { $round: ["$revenue", 2] },
      },
    },
  ]);
};

export const getRevenueAnalytics = async (businessId, { period = "daily", startDate, endDate } = {}) => {
  const series = await getSalesAnalytics(businessId, { period, startDate, endDate });

  const totalRevenue = Math.round(series.reduce((sum, row) => sum + row.revenue, 0) * 100) / 100;
  const totalOrders = series.reduce((sum, row) => sum + row.orderCount, 0);
  const averageOrderValue = totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0;

  return { series, totalRevenue, totalOrders, averageOrderValue };
};

export const getPurchaseAnalytics = async (businessId, { period = "daily", startDate, endDate, status } = {}) => {
  const unit = PERIOD_UNITS[period] || "day";
  const match = { business: oid(businessId) };
  if (status) match.status = status;
  const dateRange = buildDateRangeMatch(startDate, endDate);
  if (dateRange) match.createdAt = dateRange;

  return PurchaseOrder.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateTrunc: { date: "$createdAt", unit, timezone: "UTC" } },
        orderCount: { $sum: 1 },
        totalQuantity: { $sum: "$totalQuantity" },
        totalSpend: { $sum: "$totalAmount" },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        period: "$_id",
        orderCount: 1,
        totalQuantity: 1,
        totalSpend: { $round: ["$totalSpend", 2] },
      },
    },
  ]);
};

export const getInventoryValueAnalytics = async (businessId) => {
  const [byBranch, byCategory] = await Promise.all([
    BranchInventory.aggregate([
      { $match: { business: oid(businessId) } },
      {
        $lookup: { from: "products", localField: "product", foreignField: "_id", as: "product" },
      },
      { $unwind: "$product" },
      {
        $group: {
          _id: "$branch",
          stockUnits: { $sum: "$currentStock" },
          inventoryValue: { $sum: { $multiply: ["$currentStock", "$product.costPrice"] } },
        },
      },
      {
        $lookup: { from: "branches", localField: "_id", foreignField: "_id", as: "branch" },
      },
      { $unwind: "$branch" },
      {
        $project: {
          _id: 0,
          branch: { _id: "$branch._id", name: "$branch.name", branchCode: "$branch.branchCode" },
          stockUnits: 1,
          inventoryValue: { $round: ["$inventoryValue", 2] },
        },
      },
      { $sort: { inventoryValue: -1 } },
    ]),
    BranchInventory.aggregate([
      { $match: { business: oid(businessId) } },
      {
        $lookup: { from: "products", localField: "product", foreignField: "_id", as: "product" },
      },
      { $unwind: "$product" },
      {
        $group: {
          _id: "$product.category",
          stockUnits: { $sum: "$currentStock" },
          inventoryValue: { $sum: { $multiply: ["$currentStock", "$product.costPrice"] } },
        },
      },
      {
        $lookup: { from: "categories", localField: "_id", foreignField: "_id", as: "category" },
      },
      { $unwind: "$category" },
      {
        $project: {
          _id: 0,
          category: { _id: "$category._id", name: "$category.name" },
          stockUnits: 1,
          inventoryValue: { $round: ["$inventoryValue", 2] },
        },
      },
      { $sort: { inventoryValue: -1 } },
    ]),
  ]);

  const totalInventoryValue = Math.round(byBranch.reduce((sum, row) => sum + row.inventoryValue, 0) * 100) / 100;

  return { totalInventoryValue, byBranch, byCategory };
};

export const getLowStockAnalytics = async (businessId) => {
  return BranchInventory.aggregate([
    { $match: { business: oid(businessId) } },
    {
      $group: {
        _id: "$branch",
        lowStockCount: {
          $sum: { $cond: [{ $lte: ["$currentStock", "$reorderLevel"] }, 1, 0] },
        },
        outOfStockCount: {
          $sum: { $cond: [{ $eq: ["$currentStock", 0] }, 1, 0] },
        },
        totalTracked: { $sum: 1 },
      },
    },
    {
      $lookup: { from: "branches", localField: "_id", foreignField: "_id", as: "branch" },
    },
    { $unwind: "$branch" },
    {
      $project: {
        _id: 0,
        branch: { _id: "$branch._id", name: "$branch.name", branchCode: "$branch.branchCode" },
        lowStockCount: 1,
        outOfStockCount: 1,
        totalTracked: 1,
      },
    },
    { $sort: { lowStockCount: -1 } },
  ]);
};

export const getTopSellingProducts = async (businessId, { startDate, endDate, limit = 10 } = {}) => {
  const saleMatch = { "sale.status": "completed" };
  const dateRange = buildDateRangeMatch(startDate, endDate);
  if (dateRange) saleMatch["sale.createdAt"] = dateRange;

  return SaleItem.aggregate([
    { $match: { business: oid(businessId) } },
    { $lookup: { from: "sales", localField: "sale", foreignField: "_id", as: "sale" } },
    { $unwind: "$sale" },
    { $match: saleMatch },
    {
      $group: {
        _id: "$product",
        totalQuantitySold: { $sum: "$quantity" },
        totalRevenue: { $sum: "$lineTotal" },
      },
    },
    { $sort: { totalQuantitySold: -1 } },
    { $limit: Number(limit) },
    { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "product" } },
    { $unwind: "$product" },
    {
      $project: {
        _id: 0,
        product: { _id: "$product._id", name: "$product.name", sku: "$product.sku" },
        totalQuantitySold: 1,
        totalRevenue: { $round: ["$totalRevenue", 2] },
      },
    },
  ]);
};

export const getTopPerformingCategories = async (businessId, { startDate, endDate, limit = 10 } = {}) => {
  const saleMatch = { "sale.status": "completed" };
  const dateRange = buildDateRangeMatch(startDate, endDate);
  if (dateRange) saleMatch["sale.createdAt"] = dateRange;

  return SaleItem.aggregate([
    { $match: { business: oid(businessId) } },
    { $lookup: { from: "sales", localField: "sale", foreignField: "_id", as: "sale" } },
    { $unwind: "$sale" },
    { $match: saleMatch },
    { $lookup: { from: "products", localField: "product", foreignField: "_id", as: "product" } },
    { $unwind: "$product" },
    {
      $group: {
        _id: "$product.category",
        totalQuantitySold: { $sum: "$quantity" },
        totalRevenue: { $sum: "$lineTotal" },
      },
    },
    { $sort: { totalRevenue: -1 } },
    { $limit: Number(limit) },
    { $lookup: { from: "categories", localField: "_id", foreignField: "_id", as: "category" } },
    { $unwind: "$category" },
    {
      $project: {
        _id: 0,
        category: { _id: "$category._id", name: "$category.name" },
        totalQuantitySold: 1,
        totalRevenue: { $round: ["$totalRevenue", 2] },
      },
    },
  ]);
};

export const getBranchSalesSummary = async (businessId, { startDate, endDate } = {}) => {
  const match = { business: oid(businessId), status: "completed" };
  const dateRange = buildDateRangeMatch(startDate, endDate);
  if (dateRange) match.createdAt = dateRange;

  return Sale.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$branch",
        orderCount: { $sum: 1 },
        totalQuantity: { $sum: "$totalQuantity" },
        revenue: { $sum: "$totalAmount" },
      },
    },
    { $lookup: { from: "branches", localField: "_id", foreignField: "_id", as: "branch" } },
    { $unwind: "$branch" },
    {
      $project: {
        _id: 0,
        branch: { _id: "$branch._id", name: "$branch.name", branchCode: "$branch.branchCode" },
        orderCount: 1,
        totalQuantity: 1,
        revenue: { $round: ["$revenue", 2] },
      },
    },
    { $sort: { revenue: -1 } },
  ]);
};

export const getSupplierPurchaseSummary = async (businessId, { startDate, endDate, status } = {}) => {
  const match = { business: oid(businessId) };
  if (status) match.status = status;
  const dateRange = buildDateRangeMatch(startDate, endDate);
  if (dateRange) match.createdAt = dateRange;

  return PurchaseOrder.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$supplier",
        orderCount: { $sum: 1 },
        totalQuantity: { $sum: "$totalQuantity" },
        totalSpend: { $sum: "$totalAmount" },
      },
    },
    { $lookup: { from: "suppliers", localField: "_id", foreignField: "_id", as: "supplier" } },
    { $unwind: "$supplier" },
    {
      $project: {
        _id: 0,
        supplier: { _id: "$supplier._id", companyName: "$supplier.companyName", supplierCode: "$supplier.supplierCode" },
        orderCount: 1,
        totalQuantity: 1,
        totalSpend: { $round: ["$totalSpend", 2] },
      },
    },
    { $sort: { totalSpend: -1 } },
  ]);
};
