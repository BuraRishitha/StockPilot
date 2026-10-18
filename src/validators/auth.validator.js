import validator from "validator";
import { ROLES } from "../models/User.js";

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const TOKEN_REGEX = /^[a-f\d]{64}$/i;
const MAX_BCRYPT_PASSWORD_BYTES = 72;

const asObject = (body) =>
  body && typeof body === "object" && !Array.isArray(body) ? body : {};

const isValidPassword = (password) =>
  typeof password === "string" &&
  Buffer.byteLength(password, "utf8") <= MAX_BCRYPT_PASSWORD_BYTES &&
  PASSWORD_REGEX.test(password);

const isValidEmail = (email) =>
  typeof email === "string" && validator.isEmail(email.trim());

const isValidToken = (token) => typeof token === "string" && TOKEN_REGEX.test(token);

export const validateRegister = (body) => {
  const errors = [];
  body = asObject(body);
  const { fullName, email, phone, password, businessName, role, branchId } = body;

  if (typeof fullName !== "string" || fullName.trim().length < 2 || fullName.trim().length > 100) {
    errors.push({
      field: "fullName",
      message: "Full name must be between 2 and 100 characters.",
    });
  }

  if (!isValidEmail(email)) {
    errors.push({ field: "email", message: "A valid email address is required." });
  }

  if (
    (typeof phone !== "string" && typeof phone !== "number") ||
    !validator.isMobilePhone(String(phone).trim(), "any")
  ) {
    errors.push({ field: "phone", message: "A valid phone number is required." });
  }

  if (!password || !isValidPassword(password)) {
    errors.push({
      field: "password",
      message:
        "Password must be 8-72 UTF-8 bytes and include an uppercase letter, a lowercase letter, a number, and a special character.",
    });
  }

  // Public registration is restricted to Business Admin (creating a new business).
  // Manager/Staff accounts are created by a Business Admin through a separate
  // authenticated "invite user" flow, not this public endpoint.
  if (role && role !== ROLES.BUSINESS_ADMIN) {
    errors.push({
      field: "role",
      message: "Public registration is only permitted for a Business Admin.",
    });
  }

  if (
    typeof businessName !== "string" ||
    businessName.trim().length < 2 ||
    businessName.trim().length > 100
  ) {
    errors.push({
      field: "businessName",
      message: "Business name must be between 2 and 100 characters.",
    });
  }

  if (branchId) {
    errors.push({
      field: "branchId",
      message: "Business Admin registration cannot be pre-assigned to a branch.",
    });
  }

  return errors;
};

export const validateLogin = (body) => {
  const errors = [];
  body = asObject(body);
  const { email, password } = body;

  if (!isValidEmail(email)) {
    errors.push({ field: "email", message: "A valid email address is required." });
  }
  if (typeof password !== "string" || password.length === 0 || password.length > 1024) {
    errors.push({
      field: "password",
      message: "Password is required and cannot exceed 1024 characters.",
    });
  }

  return errors;
};

export const validateForgotPassword = (body) => {
  body = asObject(body);
  const errors = [];
  if (!isValidEmail(body.email)) {
    errors.push({ field: "email", message: "A valid email address is required." });
  }
  return errors;
};

export const validateResendVerification = (body) => {
  body = asObject(body);
  const errors = [];
  if (!isValidEmail(body.email)) {
    errors.push({ field: "email", message: "A valid email address is required." });
  }
  return errors;
};

export const validateResetPassword = (body) => {
  body = asObject(body);
  const errors = [];
  if (!isValidToken(body.token)) {
    errors.push({ field: "token", message: "Reset token is required." });
  }
  if (!body.newPassword || !isValidPassword(body.newPassword)) {
    errors.push({
      field: "newPassword",
      message:
        "Password must be 8-72 UTF-8 bytes and include an uppercase letter, a lowercase letter, a number, and a special character.",
    });
  }
  return errors;
};

export const validateVerifyEmail = (body) => {
  body = asObject(body);
  const errors = [];
  if (!isValidToken(body.token)) {
    errors.push({ field: "token", message: "Verification token is required." });
  }
  return errors;
};
