import validator from "validator";

const CURRENCY_REGEX = /^[A-Z]{3}$/;

const validateAddress = (address, errors) => {
  if (address === undefined) return;
  if (typeof address !== "object" || Array.isArray(address)) {
    errors.push({ field: "address", message: "Address must be an object." });
    return;
  }
  const allowed = ["line1", "line2", "city", "state", "country", "postalCode"];
  for (const key of Object.keys(address)) {
    if (!allowed.includes(key)) {
      errors.push({ field: `address.${key}`, message: `Unknown address field: ${key}` });
    }
  }
};

export const validateCreateBusinessSettings = (body) => {
  const errors = [];
  const { currency, timezone, contactEmail, contactPhone } = body;

  if (currency && !CURRENCY_REGEX.test(currency)) {
    errors.push({ field: "currency", message: "Currency must be a 3-letter ISO code (e.g. INR, USD)." });
  }

  if (timezone && typeof timezone !== "string") {
    errors.push({ field: "timezone", message: "Timezone must be a valid string (IANA format)." });
  }

  if (contactEmail && !validator.isEmail(contactEmail)) {
    errors.push({ field: "contactEmail", message: "A valid contact email is required." });
  }

  if (contactPhone && !validator.isMobilePhone(String(contactPhone), "any")) {
    errors.push({ field: "contactPhone", message: "A valid contact phone number is required." });
  }

  validateAddress(body.address, errors);

  return errors;
};

export const validateUpdateBusinessSettings = (body) => {
  const errors = validateCreateBusinessSettings(body);

  if (Object.keys(body || {}).length === 0) {
    errors.push({ field: "body", message: "At least one field must be provided to update." });
  }

  return errors;
};
