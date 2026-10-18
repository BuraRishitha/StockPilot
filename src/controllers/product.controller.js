import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { resolveBusinessId } from "../utils/resolveBusinessId.js";
import * as productService from "../services/product.service.js";

export const createProduct = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const product = await productService.createProduct(businessId, req.body);
  res.status(201).json(new ApiResponse("Product created.", { product }));
});

export const getProducts = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const { category, status, search } = req.query;
  const products = await productService.getProducts(businessId, { category, status, search });
  res.status(200).json(new ApiResponse("Products fetched.", { products }));
});

export const getProductById = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const product = await productService.getProductById(businessId, req.params.id);
  res.status(200).json(new ApiResponse("Product fetched.", { product }));
});

export const updateProduct = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const product = await productService.updateProduct(businessId, req.params.id, req.body);
  res.status(200).json(new ApiResponse("Product updated.", { product }));
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  await productService.deleteProduct(businessId, req.params.id);
  res.status(200).json(new ApiResponse("Product deleted.", {}));
});
