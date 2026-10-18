import validator from "validator";

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const MAX_BCRYPT_PASSWORD_BYTES = 72;

const asObject = (body) =>
  body && typeof body === "object" && !Array.isArray(body) ? body : {};

export const validateUpdateProfile = (body) => {
  const errors = [];
  body = asObject(body);
  const { fullName, phone } = body;

  if (Object.keys(body).length === 0) {
    errors.push({ field: "body", message: "At least one field must be provided to update." });
    return errors;
  }

  for (const key of Object.keys(body)) {
    if (!["fullName", "phone"].includes(key)) {
      errors.push({ field: key, message: `Unknown profile field: ${key}` });
    }
  }

  if (
    fullName !== undefined &&
    (typeof fullName !== "string" || fullName.trim().length < 2 || fullName.trim().length > 100)
  ) {
    errors.push({ field: "fullName", message: "Full name must be between 2 and 100 characters." });
  }
  if (
    phone !== undefined &&
    ((typeof phone !== "string" && typeof phone !== "number") ||
      !validator.isMobilePhone(String(phone).trim(), "any"))
  ) {
    errors.push({ field: "phone", message: "A valid phone number is required." });
  }

  return errors;
};

export const validateChangePassword = (body) => {
  const errors = [];
  body = asObject(body);
  const { currentPassword, newPassword } = body;

  if (typeof currentPassword !== "string" || currentPassword.length === 0 || currentPassword.length > 1024) {
    errors.push({ field: "currentPassword", message: "Current password is required." });
  }
  if (
    typeof newPassword !== "string" ||
    Buffer.byteLength(newPassword, "utf8") > MAX_BCRYPT_PASSWORD_BYTES ||
    !PASSWORD_REGEX.test(newPassword)
  ) {
    errors.push({
      field: "newPassword",
      message:
        "New password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character.",
    });
  }
  if (currentPassword && newPassword && currentPassword === newPassword) {
    errors.push({ field: "newPassword", message: "New password must be different from the current password." });
  }

  return errors;
};

export const validateUpdateProfileImage = (body) => {
  const errors = [];
  body = asObject(body);
  const { imageUrl } = body;

  if (!imageUrl || !validator.isURL(String(imageUrl), { require_protocol: true })) {
    errors.push({ field: "imageUrl", message: "A valid image URL is required." });
  }

  return errors;
};

export const validateNotificationPreferences = (body) => {
  const errors = [];
  body = asObject(body);
  const allowedKeys = ["email", "sms", "push", "lowStockAlerts"];

  if (Object.keys(body).length === 0) {
    errors.push({ field: "body", message: "At least one preference must be provided." });
    return errors;
  }

  for (const [key, value] of Object.entries(body)) {
    if (!allowedKeys.includes(key)) {
      errors.push({ field: key, message: `Unknown notification preference: ${key}` });
    } else if (typeof value !== "boolean") {
      errors.push({ field: key, message: `${key} must be a boolean.` });
    }
  }

  return errors;
};

export const validateAccountPreferences = (body) => {
  const errors = [];
  body = asObject(body);
  const { language, timezone, theme } = body;

  if (Object.keys(body).length === 0) {
    errors.push({ field: "body", message: "At least one preference must be provided." });
    return errors;
  }

  if (language !== undefined && (typeof language !== "string" || language.trim().length === 0)) {
    errors.push({ field: "language", message: "Language must be a non-empty string." });
  }
  if (timezone !== undefined && (typeof timezone !== "string" || timezone.trim().length === 0)) {
    errors.push({ field: "timezone", message: "Timezone must be a non-empty string." });
  }
  if (theme !== undefined && !["light", "dark"].includes(theme)) {
    errors.push({ field: "theme", message: "Theme must be either 'light' or 'dark'." });
  }

  return errors;
};
