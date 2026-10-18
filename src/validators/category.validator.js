export const validateCreateCategory = (body) => {
  const errors = [];
  const { name, description, status } = body;

  if (!name || name.trim().length < 2) {
    errors.push({ field: "name", message: "Category name must be at least 2 characters." });
  }
  if (name && name.trim().length > 100) {
    errors.push({ field: "name", message: "Category name must not exceed 100 characters." });
  }
  if (description && description.length > 500) {
    errors.push({ field: "description", message: "Description must not exceed 500 characters." });
  }
  if (status && !["active", "inactive"].includes(status)) {
    errors.push({ field: "status", message: "Status must be either 'active' or 'inactive'." });
  }

  return errors;
};

export const validateUpdateCategory = (body) => {
  const errors = [];
  const { name, description, status } = body;

  if (Object.keys(body || {}).length === 0) {
    errors.push({ field: "body", message: "At least one field must be provided to update." });
  }
  if (name !== undefined && name.trim().length < 2) {
    errors.push({ field: "name", message: "Category name must be at least 2 characters." });
  }
  if (name !== undefined && name.trim().length > 100) {
    errors.push({ field: "name", message: "Category name must not exceed 100 characters." });
  }
  if (description !== undefined && description !== null && description.length > 500) {
    errors.push({ field: "description", message: "Description must not exceed 500 characters." });
  }
  if (status !== undefined && !["active", "inactive"].includes(status)) {
    errors.push({ field: "status", message: "Status must be either 'active' or 'inactive'." });
  }

  return errors;
};
