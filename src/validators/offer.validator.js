import { OFFER_TYPES } from "../models/Offer.js";

const isNonNegativeNumber = (v) => typeof v === "number" && !Number.isNaN(v) && v >= 0;
const isPositiveInt = (v) => Number.isInteger(v) && v > 0;
const isObjectIdArray = (arr) => arr === undefined || (Array.isArray(arr) && arr.every((v) => typeof v === "string"));

const validateTypeFields = (body, errors) => {
  const { offerType, value, buyQuantity, getQuantity } = body;

  if (offerType === "buy_x_get_y") {
    if (buyQuantity !== undefined && !isPositiveInt(buyQuantity)) {
      errors.push({ field: "buyQuantity", message: "Buy quantity must be a positive integer." });
    }
    if (getQuantity !== undefined && !isPositiveInt(getQuantity)) {
      errors.push({ field: "getQuantity", message: "Get quantity must be a positive integer." });
    }
  } else if (offerType === "percentage" || offerType === "flat") {
    if (value === undefined || !isNonNegativeNumber(value)) {
      errors.push({ field: "value", message: "Value is required and cannot be negative." });
    }
    if (offerType === "percentage" && typeof value === "number" && value > 100) {
      errors.push({ field: "value", message: "Percentage value cannot exceed 100." });
    }
  }
};

export const validateCreateOffer = (body) => {
  const errors = [];
  const {
    name,
    offerType,
    startDate,
    endDate,
    status,
    maxDiscountAmount,
    applicableProducts,
    applicableCategories,
    applicableBranches,
  } = body;

  if (!name || name.trim().length < 2) {
    errors.push({ field: "name", message: "Offer name must be at least 2 characters." });
  }

  if (!offerType || !OFFER_TYPES.includes(offerType)) {
    errors.push({ field: "offerType", message: `Offer type must be one of: ${OFFER_TYPES.join(", ")}.` });
  }

  if (!startDate || Number.isNaN(Date.parse(startDate))) {
    errors.push({ field: "startDate", message: "A valid start date is required." });
  }
  if (!endDate || Number.isNaN(Date.parse(endDate))) {
    errors.push({ field: "endDate", message: "A valid end date is required." });
  }
  if (
    startDate &&
    endDate &&
    !Number.isNaN(Date.parse(startDate)) &&
    !Number.isNaN(Date.parse(endDate)) &&
    new Date(endDate) < new Date(startDate)
  ) {
    errors.push({ field: "endDate", message: "End date cannot be before start date." });
  }

  if (status && !["active", "inactive"].includes(status)) {
    errors.push({ field: "status", message: "Status must be either 'active' or 'inactive'." });
  }

  if (maxDiscountAmount !== undefined && maxDiscountAmount !== null && !isNonNegativeNumber(maxDiscountAmount)) {
    errors.push({ field: "maxDiscountAmount", message: "Max discount amount cannot be negative." });
  }

  if (!isObjectIdArray(applicableProducts)) {
    errors.push({ field: "applicableProducts", message: "Applicable products must be an array of IDs." });
  }
  if (!isObjectIdArray(applicableCategories)) {
    errors.push({ field: "applicableCategories", message: "Applicable categories must be an array of IDs." });
  }
  if (!isObjectIdArray(applicableBranches)) {
    errors.push({ field: "applicableBranches", message: "Applicable branches must be an array of IDs." });
  }

  if (offerType && OFFER_TYPES.includes(offerType)) {
    validateTypeFields(body, errors);
  }

  return errors;
};

export const validateUpdateOffer = (body) => {
  const errors = [];

  if (Object.keys(body || {}).length === 0) {
    errors.push({ field: "body", message: "At least one field must be provided to update." });
    return errors;
  }

  const {
    name,
    offerType,
    startDate,
    endDate,
    status,
    maxDiscountAmount,
    applicableProducts,
    applicableCategories,
    applicableBranches,
  } = body;

  if (name !== undefined && name.trim().length < 2) {
    errors.push({ field: "name", message: "Offer name must be at least 2 characters." });
  }

  if (offerType !== undefined && !OFFER_TYPES.includes(offerType)) {
    errors.push({ field: "offerType", message: `Offer type must be one of: ${OFFER_TYPES.join(", ")}.` });
  }

  if (startDate !== undefined && Number.isNaN(Date.parse(startDate))) {
    errors.push({ field: "startDate", message: "A valid start date is required." });
  }
  if (endDate !== undefined && Number.isNaN(Date.parse(endDate))) {
    errors.push({ field: "endDate", message: "A valid end date is required." });
  }
  if (
    startDate !== undefined &&
    endDate !== undefined &&
    !Number.isNaN(Date.parse(startDate)) &&
    !Number.isNaN(Date.parse(endDate)) &&
    new Date(endDate) < new Date(startDate)
  ) {
    errors.push({ field: "endDate", message: "End date cannot be before start date." });
  }

  if (status !== undefined && !["active", "inactive"].includes(status)) {
    errors.push({ field: "status", message: "Status must be either 'active' or 'inactive'." });
  }

  if (maxDiscountAmount !== undefined && maxDiscountAmount !== null && !isNonNegativeNumber(maxDiscountAmount)) {
    errors.push({ field: "maxDiscountAmount", message: "Max discount amount cannot be negative." });
  }

  if (!isObjectIdArray(applicableProducts)) {
    errors.push({ field: "applicableProducts", message: "Applicable products must be an array of IDs." });
  }
  if (!isObjectIdArray(applicableCategories)) {
    errors.push({ field: "applicableCategories", message: "Applicable categories must be an array of IDs." });
  }
  if (!isObjectIdArray(applicableBranches)) {
    errors.push({ field: "applicableBranches", message: "Applicable branches must be an array of IDs." });
  }

  if (offerType !== undefined && OFFER_TYPES.includes(offerType)) {
    validateTypeFields(body, errors);
  }

  return errors;
};
