import validator from "validator";
import { PAYMENT_TERMS } from "../models/Supplier.js";

export const validateCreateSupplier = (body) => {
  const errors = [];
  const { companyName, email, phone, paymentTerms, creditLimit, status } = body;

  if (!companyName || companyName.trim().length < 2) {
    errors.push({ field: "companyName", message: "Company name must be at least 2 characters." });
  }

  if (email && !validator.isEmail(email)) {
    errors.push({ field: "email", message: "A valid email address is required." });
  }

  if (phone && !validator.isMobilePhone(String(phone), "any")) {
    errors.push({ field: "phone", message: "A valid phone number is required." });
  }

  if (!email && !phone) {
    errors.push({ field: "email", message: "At least one of email or phone is required." });
  }

  if (paymentTerms && !PAYMENT_TERMS.includes(paymentTerms)) {
    errors.push({ field: "paymentTerms", message: `Payment terms must be one of: ${PAYMENT_TERMS.join(", ")}.` });
  }

  if (creditLimit !== undefined && (typeof creditLimit !== "number" || creditLimit < 0)) {
    errors.push({ field: "creditLimit", message: "Credit limit cannot be negative." });
  }

  if (status && !["active", "inactive"].includes(status)) {
    errors.push({ field: "status", message: "Status must be either 'active' or 'inactive'." });
  }

  return errors;
};

export const validateUpdateSupplier = (body) => {
  const errors = [];

  if (Object.keys(body || {}).length === 0) {
    errors.push({ field: "body", message: "At least one field must be provided to update." });
    return errors;
  }

  const { companyName, email, phone, paymentTerms, creditLimit, status } = body;

  if (companyName !== undefined && companyName.trim().length < 2) {
    errors.push({ field: "companyName", message: "Company name must be at least 2 characters." });
  }

  if (email !== undefined && email !== null && !validator.isEmail(email)) {
    errors.push({ field: "email", message: "A valid email address is required." });
  }

  if (phone !== undefined && phone !== null && !validator.isMobilePhone(String(phone), "any")) {
    errors.push({ field: "phone", message: "A valid phone number is required." });
  }

  if (paymentTerms !== undefined && !PAYMENT_TERMS.includes(paymentTerms)) {
    errors.push({ field: "paymentTerms", message: `Payment terms must be one of: ${PAYMENT_TERMS.join(", ")}.` });
  }

  if (creditLimit !== undefined && (typeof creditLimit !== "number" || creditLimit < 0)) {
    errors.push({ field: "creditLimit", message: "Credit limit cannot be negative." });
  }

  if (status !== undefined && !["active", "inactive"].includes(status)) {
    errors.push({ field: "status", message: "Status must be either 'active' or 'inactive'." });
  }

  return errors;
};
