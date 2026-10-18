import { UNITS } from "../models/Product.js";

const isNonNegativeNumber = (v) => typeof v === "number" && !Number.isNaN(v) && v >= 0;

export const validateCreateProduct = (body) => {
  const errors = [];
  const {
    name,
    sku,
    category,
    unit,
    costPrice,
    sellingPrice,
    offerPrice,
    taxPercentage,
    lowStockThreshold,
    status,
  } = body;

  if (!name || name.trim().length < 2) {
    errors.push({ field: "name", message: "Product name must be at least 2 characters." });
  }

  if (sku !== undefined && sku !== null && String(sku).trim().length < 2) {
    errors.push({ field: "sku", message: "SKU must be at least 2 characters if provided." });
  }

  if (!category) {
    errors.push({ field: "category", message: "Category is required." });
  }

  if (!unit || !UNITS.includes(unit)) {
    errors.push({ field: "unit", message: `Unit must be one of: ${UNITS.join(", ")}.` });
  }

  if (!isNonNegativeNumber(costPrice)) {
    errors.push({ field: "costPrice", message: "Cost price is required and cannot be negative." });
  }

  if (!isNonNegativeNumber(sellingPrice)) {
    errors.push({ field: "sellingPrice", message: "Selling price is required and cannot be negative." });
  }

  if (
    isNonNegativeNumber(costPrice) &&
    isNonNegativeNumber(sellingPrice) &&
    sellingPrice < costPrice
  ) {
    errors.push({ field: "sellingPrice", message: "Selling price must be >= cost price." });
  }

  if (offerPrice !== undefined && offerPrice !== null) {
    if (!isNonNegativeNumber(offerPrice)) {
      errors.push({ field: "offerPrice", message: "Offer price cannot be negative." });
    } else if (isNonNegativeNumber(sellingPrice) && offerPrice > sellingPrice) {
      errors.push({ field: "offerPrice", message: "Offer price must be <= selling price." });
    }
  }

  if (taxPercentage !== undefined && (taxPercentage < 0 || taxPercentage > 100)) {
    errors.push({ field: "taxPercentage", message: "Tax percentage must be between 0 and 100." });
  }

  if (lowStockThreshold !== undefined && !isNonNegativeNumber(lowStockThreshold)) {
    errors.push({ field: "lowStockThreshold", message: "Low stock threshold cannot be negative." });
  }

  if (status && !["active", "inactive"].includes(status)) {
    errors.push({ field: "status", message: "Status must be either 'active' or 'inactive'." });
  }

  return errors;
};

export const validateUpdateProduct = (body) => {
  const errors = [];

  if (Object.keys(body || {}).length === 0) {
    errors.push({ field: "body", message: "At least one field must be provided to update." });
    return errors;
  }

  const { name, unit, costPrice, sellingPrice, offerPrice, taxPercentage, lowStockThreshold, status } = body;

  if (name !== undefined && name.trim().length < 2) {
    errors.push({ field: "name", message: "Product name must be at least 2 characters." });
  }

  if (unit !== undefined && !UNITS.includes(unit)) {
    errors.push({ field: "unit", message: `Unit must be one of: ${UNITS.join(", ")}.` });
  }

  if (costPrice !== undefined && !isNonNegativeNumber(costPrice)) {
    errors.push({ field: "costPrice", message: "Cost price cannot be negative." });
  }

  if (sellingPrice !== undefined && !isNonNegativeNumber(sellingPrice)) {
    errors.push({ field: "sellingPrice", message: "Selling price cannot be negative." });
  }

  if (
    costPrice !== undefined &&
    sellingPrice !== undefined &&
    isNonNegativeNumber(costPrice) &&
    isNonNegativeNumber(sellingPrice) &&
    sellingPrice < costPrice
  ) {
    errors.push({ field: "sellingPrice", message: "Selling price must be >= cost price." });
  }

  if (offerPrice !== undefined && offerPrice !== null) {
    if (!isNonNegativeNumber(offerPrice)) {
      errors.push({ field: "offerPrice", message: "Offer price cannot be negative." });
    } else if (sellingPrice !== undefined && offerPrice > sellingPrice) {
      errors.push({ field: "offerPrice", message: "Offer price must be <= selling price." });
    }
  }

  if (taxPercentage !== undefined && (taxPercentage < 0 || taxPercentage > 100)) {
    errors.push({ field: "taxPercentage", message: "Tax percentage must be between 0 and 100." });
  }

  if (lowStockThreshold !== undefined && !isNonNegativeNumber(lowStockThreshold)) {
    errors.push({ field: "lowStockThreshold", message: "Low stock threshold cannot be negative." });
  }

  if (status !== undefined && !["active", "inactive"].includes(status)) {
    errors.push({ field: "status", message: "Status must be either 'active' or 'inactive'." });
  }

  return errors;
};
