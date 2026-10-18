import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import {
  loginRateLimiter,
  forgotPasswordRateLimiter,
  registerRateLimiter,
  resendVerificationRateLimiter,
  verifyEmailRateLimiter,
  resetPasswordRateLimiter,
} from "../middlewares/rateLimiter.middleware.js";
import {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResendVerification,
  validateResetPassword,
  validateVerifyEmail,
} from "../validators/auth.validator.js";

const router = Router();

// Public routes
router.post(
  "/register",
  registerRateLimiter,
  validateRequest(validateRegister),
  authController.register
);

router.post(
  "/verify-email",
  verifyEmailRateLimiter,
  validateRequest(validateVerifyEmail),
  authController.verifyEmail
);

router.post(
  "/resend-verification",
  resendVerificationRateLimiter,
  validateRequest(validateResendVerification),
  authController.resendVerification
);

router.post(
  "/login",
  loginRateLimiter,
  validateRequest(validateLogin),
  authController.login
);

router.post("/refresh-token", authController.refresh);

router.post(
  "/forgot-password",
  forgotPasswordRateLimiter,
  validateRequest(validateForgotPassword),
  authController.forgotPassword
);

router.post(
  "/reset-password",
  resetPasswordRateLimiter,
  validateRequest(validateResetPassword),
  authController.resetPassword
);

// Protected routes
router.post("/logout", protect, authController.logout);
router.get("/me", protect, authController.getCurrentUser);

export default router;
