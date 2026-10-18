import { Router } from "express";
import * as activityLogController from "../controllers/activityLog.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/rbac.middleware.js";
import { ROLES } from "../models/User.js";

const router = Router();

router.use(protect);

// Audit logs are sensitive — restricted to admins.
router.get(
  "/",
  authorize(ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN),
  activityLogController.getActivityLogs
);

export default router;
