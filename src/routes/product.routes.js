import { Router } from "express";
import * as productController from "../controllers/product.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/rbac.middleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { ROLES } from "../models/User.js";
import {
  validateCreateProduct,
  validateUpdateProduct,
} from "../validators/product.validator.js";

const router = Router();

router.use(protect);

router.get("/", productController.getProducts);
router.get("/:id", productController.getProductById);

router.post(
  "/",
  authorize(ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.BRANCH_MANAGER),
  validateRequest(validateCreateProduct),
  productController.createProduct
);

router.put(
  "/:id",
  authorize(ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.BRANCH_MANAGER),
  validateRequest(validateUpdateProduct),
  productController.updateProduct
);

router.delete(
  "/:id",
  authorize(ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN),
  productController.deleteProduct
);

export default router;
