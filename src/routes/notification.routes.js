import { Router } from "express";
import * as notificationController from "../controllers/notification.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/rbac.middleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { ROLES } from "../models/User.js";
import { validateCreateNotification } from "../validators/notification.validator.js";

const router = Router();

router.use(protect);

router.get("/", notificationController.getNotifications);
router.get("/unread-count", notificationController.getUnreadCount);

// Manual/system notification creation — restricted to admins.
router.post(
  "/",
  authorize(ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN),
  validateRequest(validateCreateNotification),
  notificationController.createNotification
);

router.patch("/:id/read", notificationController.markAsRead);
router.patch("/:id/unread", notificationController.markAsUnread);
router.delete("/:id", notificationController.deleteNotification);

export default router;
