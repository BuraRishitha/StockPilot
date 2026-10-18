import validator from "validator";
import { BRANCH_TYPES, DAYS } from "../models/Branch.js";

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const validateBusinessHours = (businessHours, errors) => {
  if (businessHours === undefined) return;
  if (typeof businessHours !== "object" || Array.isArray(businessHours)) {
    errors.push({ field: "businessHours", message: "Business hours must be an object keyed by day." });
    return;
  }
  for (const [day, hours] of Object.entries(businessHours)) {
    if (!DAYS.includes(day)) {
      errors.push({ field: `businessHours.${day}`, message: `Unknown day: ${day}` });
      continue;
    }
    if (hours?.isClosed) continue;
    if (hours?.openTime && !TIME_REGEX.test(hours.openTime)) {
      errors.push({ field: `businessHours.${day}.openTime`, message: "Time must be in HH:mm format." });
    }
    if (hours?.closeTime && !TIME_REGEX.test(hours.closeTime)) {
      errors.push({ field: `businessHours.${day}.closeTime`, message: "Time must be in HH:mm format." });
    }
  }
};

export const validateCreateBranch = (body) => {
  const errors = [];
  const { name, branchType, phone, email, status, businessHours } = body;

  if (!name || name.trim().length < 2) {
    errors.push({ field: "name", message: "Branch name must be at least 2 characters." });
  }

  if (!branchType || !BRANCH_TYPES.includes(branchType)) {
    errors.push({ field: "branchType", message: `Branch type must be one of: ${BRANCH_TYPES.join(", ")}.` });
  }

  if (phone && !validator.isMobilePhone(String(phone), "any")) {
    errors.push({ field: "phone", message: "A valid phone number is required." });
  }

  if (email && !validator.isEmail(email)) {
    errors.push({ field: "email", message: "A valid email address is required." });
  }

  if (status && !["active", "inactive"].includes(status)) {
    errors.push({ field: "status", message: "Status must be either 'active' or 'inactive'." });
  }

  validateBusinessHours(businessHours, errors);

  return errors;
};

export const validateUpdateBranch = (body) => {
  const errors = [];

  if (Object.keys(body || {}).length === 0) {
    errors.push({ field: "body", message: "At least one field must be provided to update." });
    return errors;
  }

  const { name, branchType, phone, email, status, businessHours } = body;

  if (name !== undefined && name.trim().length < 2) {
    errors.push({ field: "name", message: "Branch name must be at least 2 characters." });
  }

  if (branchType !== undefined && !BRANCH_TYPES.includes(branchType)) {
    errors.push({ field: "branchType", message: `Branch type must be one of: ${BRANCH_TYPES.join(", ")}.` });
  }

  if (phone !== undefined && phone !== null && !validator.isMobilePhone(String(phone), "any")) {
    errors.push({ field: "phone", message: "A valid phone number is required." });
  }

  if (email !== undefined && email !== null && !validator.isEmail(email)) {
    errors.push({ field: "email", message: "A valid email address is required." });
  }

  if (status !== undefined && !["active", "inactive"].includes(status)) {
    errors.push({ field: "status", message: "Status must be either 'active' or 'inactive'." });
  }

  validateBusinessHours(businessHours, errors);

  return errors;
};
