import { Router } from "express";
import * as poController from "../controllers/purchaseOrder.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/rbac.middleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { ROLES } from "../models/User.js";
import {
  validateCreatePurchaseOrder,
  validateUpdatePurchaseOrder,
  validateAddItem,
  validateUpdateItem,
  validateStatusChange,
} from "../validators/purchaseOrder.validator.js";

const router = Router();
const MANAGE_ROLES = [ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.BRANCH_MANAGER];
const APPROVE_ROLES = [ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN];

router.use(protect);

router.get("/", poController.getPurchaseOrders);
router.get("/:id", poController.getPurchaseOrderById);

router.post(
  "/",
  authorize(...MANAGE_ROLES),
  validateRequest(validateCreatePurchaseOrder),
  poController.createPurchaseOrder
);

router.put(
  "/:id",
  authorize(...MANAGE_ROLES),
  validateRequest(validateUpdatePurchaseOrder),
  poController.updatePurchaseOrder
);

router.delete("/:id", authorize(...MANAGE_ROLES), poController.deletePurchaseOrder);

router.post(
  "/:id/items",
  authorize(...MANAGE_ROLES),
  validateRequest(validateAddItem),
  poController.addItem
);

router.put(
  "/:id/items/:itemId",
  authorize(...MANAGE_ROLES),
  validateRequest(validateUpdateItem),
  poController.updateItem
);

router.delete("/:id/items/:itemId", authorize(...MANAGE_ROLES), poController.removeItem);

// Approval / receiving / cancellation carries higher stakes than day-to-day
// editing, so it's restricted to Business Admin and Super Admin.
router.post(
  "/:id/status",
  authorize(...APPROVE_ROLES),
  validateRequest(validateStatusChange),
  poController.changeStatus
);

export default router;
