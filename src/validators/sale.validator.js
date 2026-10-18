import validator from "validator";
import { PAYMENT_METHODS, PAYMENT_STATUSES, SALE_STATUSES } from "../models/Sale.js";

const isPositiveInt = (v) => Number.isInteger(v) && v > 0;
const isNonNegativeNumber = (v) => typeof v === "number" && !Number.isNaN(v) && v >= 0;

export const validateCreateSale = (body) => {
  const errors = [];
  const { branch, customerPhone, customerEmail, notes } = body;

  if (!branch) {
    errors.push({ field: "branch", message: "Branch is required." });
  }
  if (customerPhone && !validator.isMobilePhone(String(customerPhone), "any")) {
    errors.push({ field: "customerPhone", message: "A valid customer phone number is required." });
  }
  if (customerEmail && !validator.isEmail(customerEmail)) {
    errors.push({ field: "customerEmail", message: "A valid customer email address is required." });
  }
  if (notes && notes.length > 1000) {
    errors.push({ field: "notes", message: "Notes must not exceed 1000 characters." });
  }

  return errors;
};

export const validateUpdateSale = (body) => {
  const errors = [];
  const { customerPhone, customerEmail, notes } = body;

  if (Object.keys(body || {}).length === 0) {
    errors.push({ field: "body", message: "At least one field must be provided to update." });
    return errors;
  }
  if (customerPhone !== undefined && customerPhone !== null && !validator.isMobilePhone(String(customerPhone), "any")) {
    errors.push({ field: "customerPhone", message: "A valid customer phone number is required." });
  }
  if (customerEmail !== undefined && customerEmail !== null && !validator.isEmail(customerEmail)) {
    errors.push({ field: "customerEmail", message: "A valid customer email address is required." });
  }
  if (notes !== undefined && notes !== null && notes.length > 1000) {
    errors.push({ field: "notes", message: "Notes must not exceed 1000 characters." });
  }

  return errors;
};

export const validateAddItem = (body) => {
  const errors = [];
  const { product, quantity, unitPrice, taxPercentage, discount } = body;

  if (!product) {
    errors.push({ field: "product", message: "Product is required." });
  }
  if (!isPositiveInt(quantity)) {
    errors.push({ field: "quantity", message: "Quantity must be a positive integer." });
  }
  if (!isNonNegativeNumber(unitPrice)) {
    errors.push({ field: "unitPrice", message: "Unit price is required and cannot be negative." });
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
  const { quantity, unitPrice, taxPercentage, discount } = body;

  if (Object.keys(body || {}).length === 0) {
    errors.push({ field: "body", message: "At least one field must be provided to update." });
    return errors;
  }
  if (quantity !== undefined && !isPositiveInt(quantity)) {
    errors.push({ field: "quantity", message: "Quantity must be a positive integer." });
  }
  if (unitPrice !== undefined && !isNonNegativeNumber(unitPrice)) {
    errors.push({ field: "unitPrice", message: "Unit price cannot be negative." });
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
  const { status, paymentMethod, paymentStatus, amountPaid } = body;

  if (!status || !SALE_STATUSES.includes(status)) {
    errors.push({ field: "status", message: `Status must be one of: ${SALE_STATUSES.join(", ")}.` });
  }
  if (status === "completed" && !paymentMethod) {
    errors.push({ field: "paymentMethod", message: "Payment method is required to complete a sale." });
  }
  if (paymentMethod !== undefined && !PAYMENT_METHODS.includes(paymentMethod)) {
    errors.push({ field: "paymentMethod", message: `Payment method must be one of: ${PAYMENT_METHODS.join(", ")}.` });
  }
  if (paymentStatus !== undefined && !PAYMENT_STATUSES.includes(paymentStatus)) {
    errors.push({ field: "paymentStatus", message: `Payment status must be one of: ${PAYMENT_STATUSES.join(", ")}.` });
  }
  if (amountPaid !== undefined && !isNonNegativeNumber(amountPaid)) {
    errors.push({ field: "amountPaid", message: "Amount paid cannot be negative." });
  }

  return errors;
};
