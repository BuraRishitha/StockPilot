import { Product } from "../models/Product.js";
import { Category } from "../models/Category.js";
import { ApiError } from "../utils/ApiError.js";
import { generateSKU } from "../utils/skuGenerator.js";

const MAX_SKU_RETRIES = 5;

const assertCategoryBelongsToBusiness = async (categoryId, businessId) => {
  const category = await Category.findOne({ _id: categoryId, business: businessId, isDeleted: false });
  if (!category) {
    throw new ApiError(400, "Category does not exist for this business.");
  }
};

const resolveUniqueSKU = async (businessId, name, requestedSku) => {
  if (requestedSku) {
    const sku = requestedSku.trim().toUpperCase();
    const existing = await Product.findOne({ business: businessId, sku });
    if (existing) {
      throw new ApiError(409, "A product with this SKU already exists for this business.");
    }
    return sku;
  }

  for (let attempt = 0; attempt < MAX_SKU_RETRIES; attempt += 1) {
    const candidate = generateSKU(name);
    // eslint-disable-next-line no-await-in-loop
    const existing = await Product.findOne({ business: businessId, sku: candidate });
    if (!existing) return candidate;
  }

  throw new ApiError(500, "Failed to generate a unique SKU. Please provide one manually.");
};

export const createProduct = async (businessId, data) => {
  await assertCategoryBelongsToBusiness(data.category, businessId);

  const sku = await resolveUniqueSKU(businessId, data.name, data.sku);

  try {
    const product = await Product.create({
      ...data,
      sku,
      business: businessId,
    });
    return product;
  } catch (err) {
    if (err.code === 11000) {
      throw new ApiError(409, "A product with this SKU already exists for this business.");
    }
    throw err;
  }
};

export const getProducts = async (businessId, { category, status, search } = {}) => {
  const filter = { business: businessId };
  if (category) filter.category = category;
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { sku: { $regex: search, $options: "i" } },
      { barcode: { $regex: search, $options: "i" } },
    ];
  }

  return Product.find(filter).populate("category", "name").sort({ createdAt: -1 });
};

export const getProductById = async (businessId, productId) => {
  const product = await Product.findOne({ _id: productId, business: businessId }).populate(
    "category",
    "name"
  );
  if (!product) {
    throw new ApiError(404, "Product not found.");
  }
  return product;
};

export const updateProduct = async (businessId, productId, data) => {
  const product = await Product.findOne({ _id: productId, business: businessId });
  if (!product) {
    throw new ApiError(404, "Product not found.");
  }

  if (data.category && data.category !== String(product.category)) {
    await assertCategoryBelongsToBusiness(data.category, businessId);
  }

  if (data.sku && data.sku.trim().toUpperCase() !== product.sku) {
    const sku = data.sku.trim().toUpperCase();
    const existing = await Product.findOne({ business: businessId, sku, _id: { $ne: productId } });
    if (existing) {
      throw new ApiError(409, "A product with this SKU already exists for this business.");
    }
    product.sku = sku;
  }

  const fields = [
    "name",
    "barcode",
    "category",
    "supplier",
    "brand",
    "unit",
    "costPrice",
    "sellingPrice",
    "offerPrice",
    "taxPercentage",
    "lowStockThreshold",
    "imageUrl",
    "description",
    "status",
  ];
  for (const field of fields) {
    if (data[field] !== undefined) product[field] = data[field];
  }

  try {
    await product.save();
  } catch (err) {
    if (err.code === 11000) {
      throw new ApiError(409, "A product with this SKU already exists for this business.");
    }
    throw err;
  }

  return product;
};

export const deleteProduct = async (businessId, productId) => {
  const product = await Product.findOneAndDelete({ _id: productId, business: businessId });
  if (!product) {
    throw new ApiError(404, "Product not found.");
  }
  return product;
};
