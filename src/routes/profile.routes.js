import { Router } from "express";
import * as profileController from "../controllers/profile.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import {
  validateUpdateProfile,
  validateChangePassword,
  validateUpdateProfileImage,
  validateNotificationPreferences,
  validateAccountPreferences,
} from "../validators/profile.validator.js";

const router = Router();

router.use(protect);

router.get("/me", profileController.getProfile);

router.put(
  "/me",
  validateRequest(validateUpdateProfile),
  profileController.updateProfile
);

router.put(
  "/me/password",
  validateRequest(validateChangePassword),
  profileController.changePassword
);

router.put(
  "/me/image",
  validateRequest(validateUpdateProfileImage),
  profileController.updateProfileImage
);

router.put(
  "/me/notification-preferences",
  validateRequest(validateNotificationPreferences),
  profileController.updateNotificationPreferences
);

router.put(
  "/me/account-preferences",
  validateRequest(validateAccountPreferences),
  profileController.updateAccountPreferences
);

export default router;
