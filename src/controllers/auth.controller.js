import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import * as authService from "../services/auth.service.js";
import {
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  getRefreshTokenFromRequest,
} from "../services/token.service.js";

export const register = asyncHandler(async (req, res) => {
  const { fullName, email, phone, password, businessName } = req.body;

  const user = await authService.registerBusinessAdmin({
    fullName,
    email,
    phone,
    password,
    businessName,
  });

  res
    .status(201)
    .json(
      new ApiResponse(
        "Registration successful. Please check your email to verify your account.",
        { user: user.toSafeJSON() }
      )
    );
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const user = await authService.verifyEmail(token);

  res
    .status(200)
    .json(new ApiResponse("Email verified successfully.", { user: user.toSafeJSON() }));
});

export const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;
  await authService.resendVerificationEmail(email);

  res.status(200).json(
    new ApiResponse(
      "If an account with that email exists and is not verified, a new verification email has been sent.",
      {}
    )
  );
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const { user, accessToken, refreshToken } = await authService.login({ email, password }, req);

  setRefreshTokenCookie(res, refreshToken);

  res.status(200).json(
    new ApiResponse("Login successful.", {
      user: user.toSafeJSON(),
      accessToken,
    })
  );
});

export const refresh = asyncHandler(async (req, res) => {
  const rawRefreshToken = getRefreshTokenFromRequest(req);

  const { user, accessToken, refreshToken } = await authService.refreshTokens(
    rawRefreshToken,
    req
  );

  setRefreshTokenCookie(res, refreshToken);

  res.status(200).json(
    new ApiResponse("Token refreshed.", {
      user: user.toSafeJSON(),
      accessToken,
    })
  );
});

export const logout = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated.");
  }

  await authService.logout(req.user._id, req);
  clearRefreshTokenCookie(res);

  res.status(200).json(new ApiResponse("Logged out successfully.", {}));
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  await authService.forgotPassword(email);

  // Deliberately generic response — does not confirm whether the email exists.
  res
    .status(200)
    .json(
      new ApiResponse("If an account with that email exists, a reset link has been sent.", {})
    );
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  const user = await authService.resetPassword(token, newPassword);

  res
    .status(200)
    .json(new ApiResponse("Password reset successfully.", { user: user.toSafeJSON() }));
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse("Current user fetched.", { user: req.user.toSafeJSON() }));
});
