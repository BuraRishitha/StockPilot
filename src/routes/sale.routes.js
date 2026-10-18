import { Router } from "express";
import * as saleController from "../controllers/sale.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/rbac.middleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { ApiError } from "../utils/ApiError.js";
import { ROLES } from "../models/User.js";
import {
  validateCreateSale,
  validateUpdateSale,
  validateAddItem,
  validateUpdateItem,
  validateStatusChange,
} from "../validators/sale.validator.js";

const router = Router();
const SELL_ROLES = [ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.BRANCH_MANAGER, ROLES.STAFF];
const CANCEL_ROLES = [ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.BRANCH_MANAGER];

router.use(protect);

router.get("/", saleController.getSales);
router.get("/:id", saleController.getSaleById);

router.post(
  "/",
  authorize(...SELL_ROLES),
  validateRequest(validateCreateSale),
  saleController.createSale
);

router.put(
  "/:id",
  authorize(...SELL_ROLES),
  validateRequest(validateUpdateSale),
  saleController.updateSale
);

router.delete("/:id", authorize(...SELL_ROLES), saleController.deleteSale);

router.post(
  "/:id/items",
  authorize(...SELL_ROLES),
  validateRequest(validateAddItem),
  saleController.addItem
);

router.put(
  "/:id/items/:itemId",
  authorize(...SELL_ROLES),
  validateRequest(validateUpdateItem),
  saleController.updateItem
);

router.delete("/:id/items/:itemId", authorize(...SELL_ROLES), saleController.removeItem);

// Completing a sale is allowed for anyone who can sell; cancelling
// (which can reverse a completed sale's inventory) is restricted.
router.post(
  "/:id/status",
  authorize(...SELL_ROLES),
  validateRequest(validateStatusChange),
  (req, res, next) => {
    if (req.body.status === "cancelled" && !CANCEL_ROLES.includes(req.user.role)) {
      return next(new ApiError(403, "You do not have permission to cancel a sale."));
    }
    next();
  },
  saleController.changeStatus
);

export default router;
