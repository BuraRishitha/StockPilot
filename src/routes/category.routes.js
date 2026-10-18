import { Router } from "express";
import * as categoryController from "../controllers/category.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/rbac.middleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { ROLES } from "../models/User.js";
import {
  validateCreateCategory,
  validateUpdateCategory,
} from "../validators/category.validator.js";

const router = Router();

router.use(protect);

router.get("/", categoryController.getCategories);
router.get("/:id", categoryController.getCategoryById);

router.post(
  "/",
  authorize(ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.BRANCH_MANAGER),
  validateRequest(validateCreateCategory),
  categoryController.createCategory
);

router.put(
  "/:id",
  authorize(ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.BRANCH_MANAGER),
  validateRequest(validateUpdateCategory),
  categoryController.updateCategory
);

router.delete(
  "/:id",
  authorize(ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.BRANCH_MANAGER),
  categoryController.deleteCategory
);

export default router;
