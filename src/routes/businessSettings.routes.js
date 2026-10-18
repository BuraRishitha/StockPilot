import { Router } from "express";
import * as businessSettingsController from "../controllers/businessSettings.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/rbac.middleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { ROLES } from "../models/User.js";
import {
  validateCreateBusinessSettings,
  validateUpdateBusinessSettings,
} from "../validators/businessSettings.validator.js";

const router = Router();

router.use(protect);

router.get("/", businessSettingsController.getSettings);

router.post(
  "/",
  authorize(ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN),
  validateRequest(validateCreateBusinessSettings),
  businessSettingsController.createSettings
);

router.put(
  "/",
  authorize(ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN),
  validateRequest(validateUpdateBusinessSettings),
  businessSettingsController.updateSettings
);

router.delete(
  "/",
  authorize(ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN),
  businessSettingsController.deleteSettings
);

export default router;
