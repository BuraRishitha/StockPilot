import { PO_STATUSES } from "../models/PurchaseOrder.js";

const isPositiveInt = (v) => Number.isInteger(v) && v > 0;
const isNonNegativeNumber = (v) => typeof v === "number" && !Number.isNaN(v) && v >= 0;

export const validateCreatePurchaseOrder = (body) => {
  const errors = [];
  const { branch, supplier, expectedDeliveryDate, notes } = body;

  if (!branch) {
    errors.push({ field: "branch", message: "Branch is required." });
  }
  if (!supplier) {
    errors.push({ field: "supplier", message: "Supplier is required." });
  }
  if (expectedDeliveryDate && Number.isNaN(Date.parse(expectedDeliveryDate))) {
    errors.push({ field: "expectedDeliveryDate", message: "Expected delivery date must be a valid date." });
  }
  if (notes && notes.length > 1000) {
    errors.push({ field: "notes", message: "Notes must not exceed 1000 characters." });
  }

  return errors;
};

export const validateUpdatePurchaseOrder = (body) => {
  const errors = [];
  const { expectedDeliveryDate, notes } = body;

  if (Object.keys(body || {}).length === 0) {
    errors.push({ field: "body", message: "At least one field must be provided to update." });
    return errors;
  }
  if (expectedDeliveryDate && Number.isNaN(Date.parse(expectedDeliveryDate))) {
    errors.push({ field: "expectedDeliveryDate", message: "Expected delivery date must be a valid date." });
  }
  if (notes && notes.length > 1000) {
    errors.push({ field: "notes", message: "Notes must not exceed 1000 characters." });
  }

  return errors;
};

export const validateAddItem = (body) => {
  const errors = [];
  const { product, quantity, unitCost, taxPercentage, discount } = body;

  if (!product) {
    errors.push({ field: "product", message: "Product is required." });
  }
  if (!isPositiveInt(quantity)) {
    errors.push({ field: "quantity", message: "Quantity must be a positive integer." });
  }
  if (!isNonNegativeNumber(unitCost)) {
    errors.push({ field: "unitCost", message: "Unit cost is required and cannot be negative." });
  }
  if (taxPercentage !== undefined && (taxPercentage < 0 || taxPercentage > 100)) {
    errors.push({ field: "taxPercentage", message: "Tax percentage must be between 0 and 100." });
  }
  if (discount !== undefined && !isNonNegativeNumber(discount)) {
    errors.push({ field: "discount", message: "Discount cannot be negative." });
  }

  return errors;
};

export const validateUpdateItem = (body) => {
  const errors = [];
  const { quantity, unitCost, taxPercentage, discount } = body;

  if (Object.keys(body || {}).length === 0) {
    errors.push({ field: "body", message: "At least one field must be provided to update." });
    return errors;
  }
  if (quantity !== undefined && !isPositiveInt(quantity)) {
    errors.push({ field: "quantity", message: "Quantity must be a positive integer." });
  }
  if (unitCost !== undefined && !isNonNegativeNumber(unitCost)) {
    errors.push({ field: "unitCost", message: "Unit cost cannot be negative." });
  }
  if (taxPercentage !== undefined && (taxPercentage < 0 || taxPercentage > 100)) {
    errors.push({ field: "taxPercentage", message: "Tax percentage must be between 0 and 100." });
  }
  if (discount !== undefined && !isNonNegativeNumber(discount)) {
    errors.push({ field: "discount", message: "Discount cannot be negative." });
  }

  return errors;
};

export const validateStatusChange = (body) => {
  const errors = [];
  const { status, receivedDate } = body;

  if (!status || !PO_STATUSES.includes(status)) {
    errors.push({ field: "status", message: `Status must be one of: ${PO_STATUSES.join(", ")}.` });
  }
  if (receivedDate && Number.isNaN(Date.parse(receivedDate))) {
    errors.push({ field: "receivedDate", message: "Received date must be a valid date." });
  }

  return errors;
};
