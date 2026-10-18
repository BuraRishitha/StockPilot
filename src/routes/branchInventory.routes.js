import { Router } from "express";
import * as inventoryController from "../controllers/branchInventory.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/rbac.middleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { ROLES } from "../models/User.js";
import {
  validateCreateInventory,
  validateUpdateInventory,
  validateStockAdjustment,
  validateReserveRelease,
} from "../validators/branchInventory.validator.js";

const router = Router();
const MANAGE_ROLES = [ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.BRANCH_MANAGER];
const ADJUST_ROLES = [...MANAGE_ROLES, ROLES.STAFF];

router.use(protect);

router.get("/", inventoryController.getInventories);
router.get("/:id", inventoryController.getInventoryById);
router.get("/:id/history", inventoryController.getInventoryHistory);

router.post(
  "/",
  authorize(...MANAGE_ROLES),
  validateRequest(validateCreateInventory),
  inventoryController.createInventory
);

router.put(
  "/:id",
  authorize(...MANAGE_ROLES),
  validateRequest(validateUpdateInventory),
  inventoryController.updateInventoryThresholds
);

router.post(
  "/:id/adjust",
  authorize(...ADJUST_ROLES),
  validateRequest(validateStockAdjustment),
  inventoryController.adjustStock
);

router.post(
  "/:id/reserve",
  authorize(...ADJUST_ROLES),
  validateRequest(validateReserveRelease),
  inventoryController.reserveStock
);

router.post(
  "/:id/release",
  authorize(...ADJUST_ROLES),
  validateRequest(validateReserveRelease),
  inventoryController.releaseStock
);

router.delete("/:id", authorize(...MANAGE_ROLES), inventoryController.deleteInventory);

export default router;
