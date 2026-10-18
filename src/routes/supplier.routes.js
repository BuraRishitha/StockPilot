import { Router } from "express";
import * as supplierController from "../controllers/supplier.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/rbac.middleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { ROLES } from "../models/User.js";
import {
  validateCreateSupplier,
  validateUpdateSupplier,
} from "../validators/supplier.validator.js";

const router = Router();

router.use(protect);

router.get("/", supplierController.getSuppliers);
router.get("/:id", supplierController.getSupplierById);

router.post(
  "/",
  authorize(ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.BRANCH_MANAGER),
  validateRequest(validateCreateSupplier),
  supplierController.createSupplier
);

router.put(
  "/:id",
  authorize(ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.BRANCH_MANAGER),
  validateRequest(validateUpdateSupplier),
  supplierController.updateSupplier
);

router.delete(
  "/:id",
  authorize(ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN),
  supplierController.deleteSupplier
);

export default router;
