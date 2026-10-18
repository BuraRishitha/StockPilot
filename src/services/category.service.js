import { Category } from "../models/Category.js";
import { ApiError } from "../utils/ApiError.js";

export const createCategory = async (businessId, data) => {
  try {
    const category = await Category.create({
      name: data.name.trim(),
      description: data.description ?? null,
      status: data.status || "active",
      business: businessId,
    });
    return category;
  } catch (err) {
    if (err.code === 11000) {
      throw new ApiError(409, "A category with this name already exists for this business.");
    }
    throw err;
  }
};

export const getCategories = async (businessId, { includeInactive = true } = {}) => {
  const filter = { business: businessId, isDeleted: false };
  if (!includeInactive) filter.status = "active";
  return Category.find(filter).sort({ name: 1 });
};

export const getCategoryById = async (businessId, categoryId) => {
  const category = await Category.findOne({ _id: categoryId, business: businessId, isDeleted: false });
  if (!category) {
    throw new ApiError(404, "Category not found.");
  }
  return category;
};

export const updateCategory = async (businessId, categoryId, data) => {
  const category = await getCategoryById(businessId, categoryId);

  if (data.name !== undefined) category.name = data.name.trim();
  if (data.description !== undefined) category.description = data.description;
  if (data.status !== undefined) category.status = data.status;

  try {
    await category.save();
  } catch (err) {
    if (err.code === 11000) {
      throw new ApiError(409, "A category with this name already exists for this business.");
    }
    throw err;
  }

  return category;
};

export const deleteCategory = async (businessId, categoryId) => {
  const category = await getCategoryById(businessId, categoryId);

  category.isDeleted = true;
  category.deletedAt = new Date();
  category.status = "inactive";
  await category.save();

  return category;
};
