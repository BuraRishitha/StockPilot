import mongoose from "mongoose";
import { Product } from "../models/Product.js";
import { Category } from "../models/Category.js";
import { Supplier } from "../models/Supplier.js";
import { Branch } from "../models/Branch.js";
import { PurchaseOrder } from "../models/PurchaseOrder.js";
import { Sale } from "../models/Sale.js";
import { SaleItem } from "../models/SaleItem.js";
import { BranchInventory } from "../models/BranchInventory.js";

const oid = (id) => new mongoose.Types.ObjectId(id);

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const startOfWeek = () => {
  const d = startOfToday();
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? 6 : day - 1; // Monday as start of week
  d.setDate(d.getDate() - diff);
  return d;
};

const startOfMonth = () => {
  const d = startOfToday();
  d.setDate(1);
  return d;
};

export const getOverview = async (businessId) => {
  const businessFilter = { business: oid(businessId) };

  const [
    totalProducts,
    totalCategories,
    totalSuppliers,
    totalBranches,
    totalPurchaseOrders,
    totalSales,
    revenueAgg,
    inventoryValueAgg,
  ] = await Promise.all([
    Product.countDocuments(businessFilter),
    Category.countDocuments({ ...businessFilter, isDeleted: false }),
    Supplier.countDocuments(businessFilter),
    Branch.countDocuments(businessFilter),
    PurchaseOrder.countDocuments(businessFilter),
    Sale.countDocuments(businessFilter),
    Sale.aggregate([
      { $match: { business: oid(businessId), status: "completed" } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
    BranchInventory.aggregate([
      { $match: { business: oid(businessId) } },
      {
        $lookup: {
          from: "products",
          localField: "product",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $group: {
          _id: null,
          total: { $sum: { $multiply: ["$currentStock", "$product.costPrice"] } },
        },
      },
    ]),
  ]);

  return {
    totalProducts,
    totalCategories,
    totalSuppliers,
    totalBranches,
    totalPurchaseOrders,
    totalSales,
    totalRevenue: revenueAgg[0]?.total ?? 0,
    totalInventoryValue: Math.round((inventoryValueAgg[0]?.total ?? 0) * 100) / 100,
  };
};

export const getLowStockProducts = async (businessId, limit = 10) => {
  return BranchInventory.aggregate([
    {
      $match: {
        business: oid(businessId),
        $expr: { $lte: ["$currentStock", "$reorderLevel"] },
      },
    },
    { $sort: { currentStock: 1 } },
    { $limit: Number(limit) },
    {
      $lookup: {
        from: "products",
        localField: "product",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },
    {
      $lookup: {
        from: "branches",
        localField: "branch",
        foreignField: "_id",
        as: "branch",
      },
    },
    { $unwind: "$branch" },
    {
      $project: {
        currentStock: 1,
        reorderLevel: 1,
        minStock: 1,
        "product._id": 1,
        "product.name": 1,
        "product.sku": 1,
        "branch._id": 1,
        "branch.name": 1,
        "branch.branchCode": 1,
      },
    },
  ]);
};

export const getRecentSales = async (businessId, limit = 5) => {
  return Sale.find({ business: businessId })
    .populate("branch", "name branchCode")
    .sort({ createdAt: -1 })
    .limit(Number(limit));
};

export const getRecentPurchaseOrders = async (businessId, limit = 5) => {
  return PurchaseOrder.find({ business: businessId })
    .populate("branch", "name branchCode")
    .populate("supplier", "companyName supplierCode")
    .sort({ createdAt: -1 })
    .limit(Number(limit));
};

export const getTopSellingProducts = async (businessId, limit = 5) => {
  return SaleItem.aggregate([
    { $match: { business: oid(businessId) } },
    {
      $lookup: {
        from: "sales",
        localField: "sale",
        foreignField: "_id",
        as: "sale",
      },
    },
    { $unwind: "$sale" },
    { $match: { "sale.status": "completed" } },
    {
      $group: {
        _id: "$product",
        totalQuantitySold: { $sum: "$quantity" },
        totalRevenue: { $sum: "$lineTotal" },
      },
    },
    { $sort: { totalQuantitySold: -1 } },
    { $limit: Number(limit) },
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "product",
      },
    },
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

export const getSalesSummary = async (businessId) => {
  const [result] = await Sale.aggregate([
    { $match: { business: oid(businessId), status: "completed" } },
    {
      $facet: {
        today: [
          { $match: { createdAt: { $gte: startOfToday() } } },
          { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: "$totalAmount" } } },
        ],
        thisWeek: [
          { $match: { createdAt: { $gte: startOfWeek() } } },
          { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: "$totalAmount" } } },
        ],
        thisMonth: [
          { $match: { createdAt: { $gte: startOfMonth() } } },
          { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: "$totalAmount" } } },
        ],
      },
    },
  ]);

  const pick = (bucket) => ({
    count: result[bucket][0]?.count ?? 0,
    revenue: Math.round((result[bucket][0]?.revenue ?? 0) * 100) / 100,
  });

  return {
    today: pick("today"),
    thisWeek: pick("thisWeek"),
    thisMonth: pick("thisMonth"),
  };
};

export const getPurchaseSummary = async (businessId) => {
  const [statusBreakdown, pendingValueAgg] = await Promise.all([
    PurchaseOrder.aggregate([
      { $match: { business: oid(businessId) } },
      { $group: { _id: "$status", count: { $sum: 1 }, totalAmount: { $sum: "$totalAmount" } } },
    ]),
    PurchaseOrder.aggregate([
      { $match: { business: oid(businessId), status: { $in: ["draft", "pending", "approved"] } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
  ]);

  const byStatus = statusBreakdown.reduce((acc, row) => {
    acc[row._id] = { count: row.count, totalAmount: Math.round(row.totalAmount * 100) / 100 };
    return acc;
  }, {});

  return {
    byStatus,
    pendingValue: Math.round((pendingValueAgg[0]?.total ?? 0) * 100) / 100,
  };
};

export const getInventorySummary = async (businessId) => {
  const [summary] = await BranchInventory.aggregate([
    { $match: { business: oid(businessId) } },
    {
      $lookup: {
        from: "products",
        localField: "product",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },
    {
      $group: {
        _id: null,
        totalStockUnits: { $sum: "$currentStock" },
        totalReservedUnits: { $sum: "$reservedStock" },
        totalInventoryValue: { $sum: { $multiply: ["$currentStock", "$product.costPrice"] } },
        totalRecords: { $sum: 1 },
        lowStockCount: {
          $sum: { $cond: [{ $lte: ["$currentStock", "$reorderLevel"] }, 1, 0] },
        },
        outOfStockCount: {
          $sum: { $cond: [{ $eq: ["$currentStock", 0] }, 1, 0] },
        },
      },
    },
  ]);

  return {
    totalStockUnits: summary?.totalStockUnits ?? 0,
    totalReservedUnits: summary?.totalReservedUnits ?? 0,
    totalInventoryValue: Math.round((summary?.totalInventoryValue ?? 0) * 100) / 100,
    totalRecords: summary?.totalRecords ?? 0,
    lowStockCount: summary?.lowStockCount ?? 0,
    outOfStockCount: summary?.outOfStockCount ?? 0,
  };
};
