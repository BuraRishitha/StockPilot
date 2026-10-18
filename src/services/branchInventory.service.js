import { BranchInventory } from "../models/BranchInventory.js";
import { InventoryTransaction } from "../models/InventoryTransaction.js";
import { Product } from "../models/Product.js";
import { Branch } from "../models/Branch.js";
import { ApiError } from "../utils/ApiError.js";

const assertProductBelongsToBusiness = async (productId, businessId) => {
  const product = await Product.findOne({ _id: productId, business: businessId });
  if (!product) {
    throw new ApiError(400, "Product does not exist for this business.");
  }
  return product;
};

const assertBranchBelongsToBusiness = async (branchId, businessId) => {
  const branch = await Branch.findOne({ _id: branchId, business: businessId });
  if (!branch) {
    throw new ApiError(400, "Branch does not exist for this business.");
  }
  return branch;
};

const logTransaction = async ({
  business,
  branch,
  product,
  inventory,
  type,
  quantity,
  previousStock,
  newStock,
  reason,
  performedBy,
  referenceType = null,
  referenceId = null,
}) => {
  await InventoryTransaction.create({
    business,
    branch,
    product,
    inventory,
    type,
    quantity,
    previousStock,
    newStock,
    reason,
    performedBy,
    referenceType,
    referenceId,
  });
};

export const createInventory = async (businessId, data) => {
  await assertProductBelongsToBusiness(data.product, businessId);
  await assertBranchBelongsToBusiness(data.branch, businessId);

  const existing = await BranchInventory.findOne({ product: data.product, branch: data.branch });
  if (existing) {
    throw new ApiError(409, "Inventory record already exists for this product at this branch.");
  }

  try {
    const inventory = await BranchInventory.create({
      product: data.product,
      branch: data.branch,
      business: businessId,
      minStock: data.minStock ?? 0,
      maxStock: data.maxStock ?? null,
      reorderLevel: data.reorderLevel ?? 0,
    });
    return inventory;
  } catch (err) {
    if (err.code === 11000) {
      throw new ApiError(409, "Inventory record already exists for this product at this branch.");
    }
    throw err;
  }
};

export const getInventories = async (businessId, { branch, product, lowStock } = {}) => {
  const filter = { business: businessId };
  if (branch) filter.branch = branch;
  if (product) filter.product = product;

  let query = BranchInventory.find(filter)
    .populate("product", "name sku unit")
    .populate("branch", "name branchCode")
    .sort({ updatedAt: -1 });

  let inventories = await query;

  if (lowStock === "true" || lowStock === true) {
    inventories = inventories.filter((inv) => inv.currentStock <= inv.reorderLevel);
  }

  return inventories;
};

export const getInventoryById = async (businessId, inventoryId) => {
  const inventory = await BranchInventory.findOne({ _id: inventoryId, business: businessId })
    .populate("product", "name sku unit")
    .populate("branch", "name branchCode");
  if (!inventory) {
    throw new ApiError(404, "Inventory record not found.");
  }
  return inventory;
};

export const updateInventoryThresholds = async (businessId, inventoryId, data) => {
  const inventory = await BranchInventory.findOne({ _id: inventoryId, business: businessId });
  if (!inventory) {
    throw new ApiError(404, "Inventory record not found.");
  }

  const fields = ["minStock", "maxStock", "reorderLevel"];
  for (const field of fields) {
    if (data[field] !== undefined) inventory[field] = data[field];
  }

  await inventory.save();
  return inventory;
};

export const adjustStock = async (businessId, inventoryId, { action, quantity, reason }, userId) => {
  const inventory = await BranchInventory.findOne({ _id: inventoryId, business: businessId });
  if (!inventory) {
    throw new ApiError(404, "Inventory record not found.");
  }

  const previousStock = inventory.currentStock;
  let newStock;
  let type;

  if (action === "add") {
    newStock = previousStock + quantity;
    type = "IN";
  } else if (action === "remove") {
    newStock = previousStock - quantity;
    type = "OUT";
  } else {
    // "set" — absolute correction
    newStock = quantity;
    type = "ADJUSTMENT";
  }

  if (newStock < 0) {
    throw new ApiError(400, "Stock cannot become negative.");
  }
  if (newStock < inventory.reservedStock) {
    throw new ApiError(400, "Resulting stock cannot be less than reserved stock.");
  }

  inventory.currentStock = newStock;
  inventory.lastAdjustedAt = new Date();
  await inventory.save();

  await logTransaction({
    business: businessId,
    branch: inventory.branch,
    product: inventory.product,
    inventory: inventory._id,
    type,
    quantity,
    previousStock,
    newStock,
    reason: reason ?? null,
    performedBy: userId,
  });

  return inventory;
};

export const reserveStock = async (businessId, inventoryId, { quantity, reason }, userId) => {
  const inventory = await BranchInventory.findOne({ _id: inventoryId, business: businessId });
  if (!inventory) {
    throw new ApiError(404, "Inventory record not found.");
  }

  if (inventory.reservedStock + quantity > inventory.currentStock) {
    throw new ApiError(400, "Cannot reserve more stock than is currently available.");
  }

  const previousStock = inventory.currentStock;
  inventory.reservedStock += quantity;
  await inventory.save();

  await logTransaction({
    business: businessId,
    branch: inventory.branch,
    product: inventory.product,
    inventory: inventory._id,
    type: "RESERVE",
    quantity,
    previousStock,
    newStock: inventory.currentStock,
    reason: reason ?? null,
    performedBy: userId,
  });

  return inventory;
};

export const releaseStock = async (businessId, inventoryId, { quantity, reason }, userId) => {
  const inventory = await BranchInventory.findOne({ _id: inventoryId, business: businessId });
  if (!inventory) {
    throw new ApiError(404, "Inventory record not found.");
  }

  if (quantity > inventory.reservedStock) {
    throw new ApiError(400, "Cannot release more stock than is currently reserved.");
  }

  const previousStock = inventory.currentStock;
  inventory.reservedStock -= quantity;
  await inventory.save();

  await logTransaction({
    business: businessId,
    branch: inventory.branch,
    product: inventory.product,
    inventory: inventory._id,
    type: "RELEASE",
    quantity,
    previousStock,
    newStock: inventory.currentStock,
    reason: reason ?? null,
    performedBy: userId,
  });

  return inventory;
};

export const getInventoryHistory = async (businessId, inventoryId) => {
  const inventory = await BranchInventory.findOne({ _id: inventoryId, business: businessId });
  if (!inventory) {
    throw new ApiError(404, "Inventory record not found.");
  }

  return InventoryTransaction.find({ inventory: inventoryId, business: businessId })
    .populate("performedBy", "fullName email")
    .sort({ createdAt: -1 });
};

export const deleteInventory = async (businessId, inventoryId) => {
  const inventory = await BranchInventory.findOne({ _id: inventoryId, business: businessId });
  if (!inventory) {
    throw new ApiError(404, "Inventory record not found.");
  }
  if (inventory.currentStock > 0 || inventory.reservedStock > 0) {
    throw new ApiError(400, "Cannot delete inventory with existing stock. Adjust stock to zero first.");
  }

  await inventory.deleteOne();
  return inventory;
};
