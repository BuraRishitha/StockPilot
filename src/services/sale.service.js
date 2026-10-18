import mongoose from "mongoose";
import { Sale, SALE_TRANSITIONS } from "../models/Sale.js";
import { SaleItem } from "../models/SaleItem.js";
import { Branch } from "../models/Branch.js";
import { Product } from "../models/Product.js";
import { BranchInventory } from "../models/BranchInventory.js";
import { InventoryTransaction } from "../models/InventoryTransaction.js";
import { ApiError } from "../utils/ApiError.js";
import { generateInvoiceNumber } from "../utils/invoiceNumberGenerator.js";

const MAX_INVOICE_RETRIES = 5;

const resolveUniqueInvoiceNumber = async (businessId) => {
  for (let attempt = 0; attempt < MAX_INVOICE_RETRIES; attempt += 1) {
    const candidate = generateInvoiceNumber();
    // eslint-disable-next-line no-await-in-loop
    const existing = await Sale.findOne({ business: businessId, invoiceNumber: candidate });
    if (!existing) return candidate;
  }
  throw new ApiError(500, "Failed to generate a unique invoice number. Please try again.");
};

const assertBranchBelongsToBusiness = async (branchId, businessId) => {
  const branch = await Branch.findOne({ _id: branchId, business: businessId });
  if (!branch) throw new ApiError(400, "Branch does not exist for this business.");
  return branch;
};

const assertProductBelongsToBusiness = async (productId, businessId) => {
  const product = await Product.findOne({ _id: productId, business: businessId });
  if (!product) throw new ApiError(400, "Product does not exist for this business.");
  return product;
};

const getEditableSale = async (businessId, saleId, allowedStatuses = ["draft"]) => {
  const sale = await Sale.findOne({ _id: saleId, business: businessId });
  if (!sale) throw new ApiError(404, "Sale not found.");
  if (!allowedStatuses.includes(sale.status)) {
    throw new ApiError(400, `This action is not allowed while the sale status is '${sale.status}'.`);
  }
  return sale;
};

const recalcTotals = async (saleId) => {
  const items = await SaleItem.find({ sale: saleId });

  const totals = items.reduce(
    (acc, item) => {
      const subtotal = item.quantity * item.unitPrice;
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

  await Sale.findByIdAndUpdate(saleId, {
    $set: {
      totalQuantity: totals.totalQuantity,
      subtotalAmount: Math.round(totals.subtotalAmount * 100) / 100,
      totalDiscount: Math.round(totals.totalDiscount * 100) / 100,
      totalTax: Math.round(totals.totalTax * 100) / 100,
      totalAmount: Math.round(totals.totalAmount * 100) / 100,
    },
  });
};

export const createSale = async (businessId, data, userId) => {
  await assertBranchBelongsToBusiness(data.branch, businessId);

  const invoiceNumber = await resolveUniqueInvoiceNumber(businessId);

  const sale = await Sale.create({
    invoiceNumber,
    business: businessId,
    branch: data.branch,
    customerName: data.customerName ?? "Walk-in Customer",
    customerPhone: data.customerPhone ?? null,
    customerEmail: data.customerEmail ?? null,
    notes: data.notes ?? null,
    createdBy: userId,
  });

  return sale;
};

export const getSales = async (businessId, { status, branch, paymentStatus, search } = {}) => {
  const filter = { business: businessId };
  if (status) filter.status = status;
  if (branch) filter.branch = branch;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (search) {
    filter.$or = [
      { invoiceNumber: { $regex: search, $options: "i" } },
      { customerName: { $regex: search, $options: "i" } },
      { customerPhone: { $regex: search, $options: "i" } },
    ];
  }

  return Sale.find(filter)
    .populate("branch", "name branchCode")
    .populate("createdBy", "fullName email")
    .sort({ createdAt: -1 });
};

export const getSaleById = async (businessId, saleId) => {
  const sale = await Sale.findOne({ _id: saleId, business: businessId })
    .populate("branch", "name branchCode")
    .populate("createdBy", "fullName email")
    .populate("completedBy", "fullName email")
    .populate("cancelledBy", "fullName email");

  if (!sale) throw new ApiError(404, "Sale not found.");

  const items = await SaleItem.find({ sale: saleId }).populate("product", "name sku unit");

  return { sale, items };
};

export const updateSale = async (businessId, saleId, data) => {
  const sale = await getEditableSale(businessId, saleId, ["draft"]);

  const fields = ["customerName", "customerPhone", "customerEmail", "notes"];
  for (const field of fields) {
    if (data[field] !== undefined) sale[field] = data[field];
  }

  await sale.save();
  return sale;
};

export const addItem = async (businessId, saleId, data) => {
  const sale = await getEditableSale(businessId, saleId, ["draft"]);
  await assertProductBelongsToBusiness(data.product, businessId);

  const existing = await SaleItem.findOne({ sale: saleId, product: data.product });
  if (existing) {
    throw new ApiError(409, "This product is already on the sale. Edit the existing line instead.");
  }

  const item = await SaleItem.create({
    sale: sale._id,
    business: businessId,
    product: data.product,
    quantity: data.quantity,
    unitPrice: data.unitPrice,
    taxPercentage: data.taxPercentage ?? 0,
    discount: data.discount ?? 0,
  });

  await recalcTotals(sale._id);
  return item;
};

export const updateItem = async (businessId, saleId, itemId, data) => {
  await getEditableSale(businessId, saleId, ["draft"]);

  const item = await SaleItem.findOne({ _id: itemId, sale: saleId, business: businessId });
  if (!item) throw new ApiError(404, "Sale item not found.");

  const fields = ["quantity", "unitPrice", "taxPercentage", "discount"];
  for (const field of fields) {
    if (data[field] !== undefined) item[field] = data[field];
  }

  await item.save();
  await recalcTotals(saleId);
  return item;
};

export const removeItem = async (businessId, saleId, itemId) => {
  await getEditableSale(businessId, saleId, ["draft"]);

  const item = await SaleItem.findOneAndDelete({ _id: itemId, sale: saleId, business: businessId });
  if (!item) throw new ApiError(404, "Sale item not found.");

  await recalcTotals(saleId);
  return item;
};

const completeSale = async (businessId, sale, data, userId) => {
  const items = await SaleItem.find({ sale: sale._id });
  if (items.length === 0) {
    throw new ApiError(400, "Cannot complete a sale with no items.");
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      for (const item of items) {
        // eslint-disable-next-line no-await-in-loop
        const inventory = await BranchInventory.findOne({
          product: item.product,
          branch: sale.branch,
        }).session(session);

        if (!inventory) {
          throw new ApiError(400, `No inventory record exists for this product at the selected branch.`);
        }

        const available = inventory.currentStock - inventory.reservedStock;
        if (available < item.quantity) {
          throw new ApiError(400, `Insufficient stock to complete this sale.`);
        }

        const previousStock = inventory.currentStock;
        const newStock = previousStock - item.quantity;

        inventory.currentStock = newStock;
        inventory.lastAdjustedAt = new Date();
        // eslint-disable-next-line no-await-in-loop
        await inventory.save({ session });

        // eslint-disable-next-line no-await-in-loop
        await InventoryTransaction.create(
          [
            {
              business: businessId,
              branch: sale.branch,
              product: item.product,
              inventory: inventory._id,
              type: "OUT",
              quantity: item.quantity,
              previousStock,
              newStock,
              reason: `Sale ${sale.invoiceNumber} completed`,
              performedBy: userId,
              referenceType: "Sale",
              referenceId: sale._id,
            },
          ],
          { session }
        );
      }

      sale.status = "completed";
      sale.completedBy = userId;
      sale.paymentMethod = data.paymentMethod;
      sale.paymentStatus = data.paymentStatus || "paid";
      if (data.amountPaid !== undefined) sale.amountPaid = data.amountPaid;
      await sale.save({ session });
    });
  } finally {
    session.endSession();
  }

  return sale;
};

const cancelSale = async (businessId, sale, userId) => {
  const wasCompleted = sale.status === "completed";
  const items = wasCompleted ? await SaleItem.find({ sale: sale._id }) : [];

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      for (const item of items) {
        // eslint-disable-next-line no-await-in-loop
        const inventory = await BranchInventory.findOne({
          product: item.product,
          branch: sale.branch,
        }).session(session);

        if (inventory) {
          const previousStock = inventory.currentStock;
          const newStock = previousStock + item.quantity;

          inventory.currentStock = newStock;
          inventory.lastAdjustedAt = new Date();
          // eslint-disable-next-line no-await-in-loop
          await inventory.save({ session });

          // eslint-disable-next-line no-await-in-loop
          await InventoryTransaction.create(
            [
              {
                business: businessId,
                branch: sale.branch,
                product: item.product,
                inventory: inventory._id,
                type: "IN",
                quantity: item.quantity,
                previousStock,
                newStock,
                reason: `Sale ${sale.invoiceNumber} cancelled — stock restored`,
                performedBy: userId,
                referenceType: "Sale",
                referenceId: sale._id,
              },
            ],
            { session }
          );
        }
      }

      sale.status = "cancelled";
      sale.cancelledBy = userId;
      await sale.save({ session });
    });
  } finally {
    session.endSession();
  }

  return sale;
};

export const changeStatus = async (businessId, saleId, data, userId) => {
  const sale = await Sale.findOne({ _id: saleId, business: businessId });
  if (!sale) throw new ApiError(404, "Sale not found.");

  const nextStatus = data.status;
  const allowedNext = SALE_TRANSITIONS[sale.status] || [];
  if (!allowedNext.includes(nextStatus)) {
    throw new ApiError(
      400,
      `Cannot move sale from '${sale.status}' to '${nextStatus}'. Statuses cannot be skipped.`
    );
  }

  if (nextStatus === "completed") {
    return completeSale(businessId, sale, data, userId);
  }

  if (nextStatus === "cancelled") {
    return cancelSale(businessId, sale, userId);
  }

  sale.status = nextStatus;
  await sale.save();
  return sale;
};

export const deleteSale = async (businessId, saleId) => {
  const sale = await getEditableSale(businessId, saleId, ["draft"]);

  await SaleItem.deleteMany({ sale: saleId });
  await sale.deleteOne();

  return sale;
};
