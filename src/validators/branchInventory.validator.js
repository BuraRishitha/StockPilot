const isNonNegativeNumber = (v) => typeof v === "number" && !Number.isNaN(v) && v >= 0;

export const validateCreateInventory = (body) => {
  const errors = [];
  const { product, branch, minStock, maxStock, reorderLevel } = body;

  if (!product) {
    errors.push({ field: "product", message: "Product is required." });
  }
  if (!branch) {
    errors.push({ field: "branch", message: "Branch is required." });
  }
  if (minStock !== undefined && !isNonNegativeNumber(minStock)) {
    errors.push({ field: "minStock", message: "Minimum stock cannot be negative." });
  }
  if (maxStock !== undefined && maxStock !== null && !isNonNegativeNumber(maxStock)) {
    errors.push({ field: "maxStock", message: "Maximum stock cannot be negative." });
  }
  if (
    minStock !== undefined &&
    maxStock !== undefined &&
    maxStock !== null &&
    isNonNegativeNumber(minStock) &&
    isNonNegativeNumber(maxStock) &&
    minStock > maxStock
  ) {
    errors.push({ field: "maxStock", message: "Maximum stock must be >= minimum stock." });
  }
  if (reorderLevel !== undefined && !isNonNegativeNumber(reorderLevel)) {
    errors.push({ field: "reorderLevel", message: "Reorder level cannot be negative." });
  }

  return errors;
};

export const validateUpdateInventory = (body) => {
  const errors = [];
  const { minStock, maxStock, reorderLevel } = body;

  if (Object.keys(body || {}).length === 0) {
    errors.push({ field: "body", message: "At least one field must be provided to update." });
    return errors;
  }

  if (minStock !== undefined && !isNonNegativeNumber(minStock)) {
    errors.push({ field: "minStock", message: "Minimum stock cannot be negative." });
  }
  if (maxStock !== undefined && maxStock !== null && !isNonNegativeNumber(maxStock)) {
    errors.push({ field: "maxStock", message: "Maximum stock cannot be negative." });
  }
  if (
    minStock !== undefined &&
    maxStock !== undefined &&
    maxStock !== null &&
    isNonNegativeNumber(minStock) &&
    isNonNegativeNumber(maxStock) &&
    minStock > maxStock
  ) {
    errors.push({ field: "maxStock", message: "Maximum stock must be >= minimum stock." });
  }
  if (reorderLevel !== undefined && !isNonNegativeNumber(reorderLevel)) {
    errors.push({ field: "reorderLevel", message: "Reorder level cannot be negative." });
  }

  return errors;
};

export const validateStockAdjustment = (body) => {
  const errors = [];
  const { action, quantity, reason } = body;

  if (!action || !["add", "remove", "set"].includes(action)) {
    errors.push({ field: "action", message: "Action must be one of: add, remove, set." });
  }
  if (!isNonNegativeNumber(quantity)) {
    errors.push({ field: "quantity", message: "Quantity is required and cannot be negative." });
  }
  if (reason !== undefined && reason !== null && String(reason).length > 300) {
    errors.push({ field: "reason", message: "Reason must not exceed 300 characters." });
  }

  return errors;
};

export const validateReserveRelease = (body) => {
  const errors = [];
  const { quantity, reason } = body;

  if (!isNonNegativeNumber(quantity) || quantity === 0) {
    errors.push({ field: "quantity", message: "Quantity must be a positive number." });
  }
  if (reason !== undefined && reason !== null && String(reason).length > 300) {
    errors.push({ field: "reason", message: "Reason must not exceed 300 characters." });
  }

  return errors;
};
