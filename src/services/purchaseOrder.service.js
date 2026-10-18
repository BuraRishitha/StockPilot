import mongoose from "mongoose";
import { PurchaseOrder, PO_TRANSITIONS } from "../models/PurchaseOrder.js";
import { PurchaseOrderItem } from "../models/PurchaseOrderItem.js";
import { Branch } from "../models/Branch.js";
import { Supplier } from "../models/Supplier.js";
import { Product } from "../models/Product.js";
import { BranchInventory } from "../models/BranchInventory.js";
import { InventoryTransaction } from "../models/InventoryTransaction.js";
import { ApiError } from "../utils/ApiError.js";
import { generatePoNumber } from "../utils/poNumberGenerator.js";

const MAX_PO_NUMBER_RETRIES = 5;

const resolveUniquePoNumber = async (businessId) => {
  for (let attempt = 0; attempt < MAX_PO_NUMBER_RETRIES; attempt += 1) {
    const candidate = generatePoNumber();
    // eslint-disable-next-line no-await-in-loop
    const existing = await PurchaseOrder.findOne({ business: businessId, poNumber: candidate });
    if (!existing) return candidate;
  }
  throw new ApiError(500, "Failed to generate a unique PO number. Please try again.");
};

const assertBranchBelongsToBusiness = async (branchId, businessId) => {
  const branch = await Branch.findOne({ _id: branchId, business: businessId });
  if (!branch) throw new ApiError(400, "Branch does not exist for this business.");
  return branch;
};

const assertSupplierBelongsToBusiness = async (supplierId, businessId) => {
  const supplier = await Supplier.findOne({ _id: supplierId, business: businessId });
  if (!supplier) throw new ApiError(400, "Supplier does not exist for this business.");
  return supplier;
};

const assertProductBelongsToBusiness = async (productId, businessId) => {
  const product = await Product.findOne({ _id: productId, business: businessId });
  if (!product) throw new ApiError(400, "Product does not exist for this business.");
  return product;
};

const getEditablePO = async (businessId, poId, allowedStatuses = ["draft"]) => {
  const po = await PurchaseOrder.findOne({ _id: poId, business: businessId });
  if (!po) throw new ApiError(404, "Purchase order not found.");
  if (!allowedStatuses.includes(po.status)) {
    throw new ApiError(400, `This action is not allowed while the PO status is '${po.status}'.`);
  }
  return po;
};

const recalcTotals = async (poId) => {
  const items = await PurchaseOrderItem.find({ purchaseOrder: poId });

  const totals = items.reduce(
    (acc, item) => {
      const subtotal = item.quantity * item.unitCost;
      const taxAmount = (subtotal * item.taxPercentage) / 100;
      acc.totalQuantity += item.quantity;
      acc.subtotalAmount += subtotal;
      acc.totalDiscount += item.discount;
      acc.totalTax += taxAmount;
      acc.totalAmount += item.lineTotal;
      return acc;
    },
    { totalQuantity: 0, subtotalAmount: 0, totalDiscount: 0, totalTax: 0, totalAmount: 0 }
  );

  await PurchaseOrder.findByIdAndUpdate(poId, {
    $set: {
      totalQuantity: totals.totalQuantity,
      subtotalAmount: Math.round(totals.subtotalAmount * 100) / 100,
      totalDiscount: Math.round(totals.totalDiscount * 100) / 100,
      totalTax: Math.round(totals.totalTax * 100) / 100,
      totalAmount: Math.round(totals.totalAmount * 100) / 100,
    },
  });
};

export const createPurchaseOrder = async (businessId, data, userId) => {
  await assertBranchBelongsToBusiness(data.branch, businessId);
  await assertSupplierBelongsToBusiness(data.supplier, businessId);

  const poNumber = await resolveUniquePoNumber(businessId);

  const po = await PurchaseOrder.create({
    poNumber,
    business: businessId,
    branch: data.branch,
    supplier: data.supplier,
    expectedDeliveryDate: data.expectedDeliveryDate ?? null,
    notes: data.notes ?? null,
    createdBy: userId,
  });

  return po;
};

export const getPurchaseOrders = async (businessId, { status, branch, supplier, search } = {}) => {
  const filter = { business: businessId };
  if (status) filter.status = status;
  if (branch) filter.branch = branch;
  if (supplier) filter.supplier = supplier;
  if (search) filter.poNumber = { $regex: search, $options: "i" };

  return PurchaseOrder.find(filter)
    .populate("branch", "name branchCode")
    .populate("supplier", "companyName supplierCode")
    .populate("createdBy", "fullName email")
    .sort({ createdAt: -1 });
};

export const getPurchaseOrderById = async (businessId, poId) => {
  const po = await PurchaseOrder.findOne({ _id: poId, business: businessId })
    .populate("branch", "name branchCode")
    .populate("supplier", "companyName supplierCode")
    .populate("createdBy", "fullName email")
    .populate("approvedBy", "fullName email")
    .populate("receivedBy", "fullName email");

  if (!po) throw new ApiError(404, "Purchase order not found.");

  const items = await PurchaseOrderItem.find({ purchaseOrder: poId }).populate(
    "product",
    "name sku unit"
  );

  return { po, items };
};

export const updatePurchaseOrder = async (businessId, poId, data) => {
  const po = await getEditablePO(businessId, poId, ["draft", "pending"]);

  if (data.expectedDeliveryDate !== undefined) po.expectedDeliveryDate = data.expectedDeliveryDate;
  if (data.notes !== undefined) po.notes = data.notes;

  await po.save();
  return po;
};

export const addItem = async (businessId, poId, data) => {
  const po = await getEditablePO(businessId, poId, ["draft"]);
  await assertProductBelongsToBusiness(data.product, businessId);

  const existing = await PurchaseOrderItem.findOne({ purchaseOrder: poId, product: data.product });
  if (existing) {
    throw new ApiError(409, "This product is already on the purchase order. Edit the existing line instead.");
  }

  const item = await PurchaseOrderItem.create({
    purchaseOrder: po._id,
    business: businessId,
    product: data.product,
    quantity: data.quantity,
    unitCost: data.unitCost,
    taxPercentage: data.taxPercentage ?? 0,
    discount: data.discount ?? 0,
  });

  await recalcTotals(po._id);
  return item;
};

export const updateItem = async (businessId, poId, itemId, data) => {
  await getEditablePO(businessId, poId, ["draft"]);

  const item = await PurchaseOrderItem.findOne({ _id: itemId, purchaseOrder: poId, business: businessId });
  if (!item) throw new ApiError(404, "Purchase order item not found.");

  const fields = ["quantity", "unitCost", "taxPercentage", "discount"];
  for (const field of fields) {
    if (data[field] !== undefined) item[field] = data[field];
  }

  await item.save();
  await recalcTotals(poId);
  return item;
};

export const removeItem = async (businessId, poId, itemId) => {
  await getEditablePO(businessId, poId, ["draft"]);

  const item = await PurchaseOrderItem.findOneAndDelete({
    _id: itemId,
    purchaseOrder: poId,
    business: businessId,
  });
  if (!item) throw new ApiError(404, "Purchase order item not found.");

  await recalcTotals(poId);
  return item;
};

const receivePurchaseOrder = async (businessId, po, userId) => {
  const items = await PurchaseOrderItem.find({ purchaseOrder: po._id });
  if (items.length === 0) {
    throw new ApiError(400, "Cannot receive a purchase order with no items.");
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      for (const item of items) {
        // eslint-disable-next-line no-await-in-loop
        let inventory = await BranchInventory.findOne({
          product: item.product,
          branch: po.branch,
        }).session(session);

        if (!inventory) {
          // eslint-disable-next-line no-await-in-loop
          const created = await BranchInventory.create(
            [{ product: item.product, branch: po.branch, business: businessId }],
            { session }
          );
          [inventory] = created;
        }

        const previousStock = inventory.currentStock;
        const newStock = previousStock + item.quantity;

        inventory.currentStock = newStock;
        inventory.lastAdjustedAt = new Date();
        // eslint-disable-next-line no-await-in-loop
        await inventory.save({ session });

        item.receivedQuantity = item.quantity;
        // eslint-disable-next-line no-await-in-loop
        await item.save({ session });

        // eslint-disable-next-line no-await-in-loop
        await InventoryTransaction.create(
          [
            {
              business: businessId,
              branch: po.branch,
              product: item.product,
              inventory: inventory._id,
              type: "IN",
              quantity: item.quantity,
              previousStock,
              newStock,
              reason: `Purchase order ${po.poNumber} received`,
              performedBy: userId,
              referenceType: "PurchaseOrder",
              referenceId: po._id,
            },
          ],
          { session }
        );
      }

      po.status = "received";
      po.receivedDate = new Date();
      po.receivedBy = userId;
      await po.save({ session });
    });
  } finally {
    session.endSession();
  }

  return po;
};

export const changeStatus = async (businessId, poId, { status: nextStatus, receivedDate }, userId) => {
  const po = await PurchaseOrder.findOne({ _id: poId, business: businessId });
  if (!po) throw new ApiError(404, "Purchase order not found.");

  const allowedNext = PO_TRANSITIONS[po.status] || [];
  if (!allowedNext.includes(nextStatus)) {
    throw new ApiError(
      400,
      `Cannot move purchase order from '${po.status}' to '${nextStatus}'. Statuses cannot be skipped.`
    );
  }

  if (nextStatus === "received") {
    return receivePurchaseOrder(businessId, po, userId);
  }

  po.status = nextStatus;
  if (nextStatus === "approved") po.approvedBy = userId;
  if (receivedDate) po.receivedDate = receivedDate;

  await po.save();
  return po;
};

export const deletePurchaseOrder = async (businessId, poId) => {
  const po = await getEditablePO(businessId, poId, ["draft"]);

  await PurchaseOrderItem.deleteMany({ purchaseOrder: poId });
  await po.deleteOne();

  return po;
};
