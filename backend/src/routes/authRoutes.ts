import { Router } from "express";
import {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  verifyOTPHandler,
  resendOtpHandler,
  googleLoginHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
  requestSetPasswordHandler,
  confirmSetPasswordHandler,
} from "../controllers/authController";
import { authMiddleware } from "../middlewares/authMiddleware";
import rateLimit from "express-rate-limit";

const router = Router();

// Limiters defined but NOT USED in routes during LOAD TEST
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: "Too many verification attempts. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many login attempts. Please cool down." },
});

// Authentication Routes (🚀 LIMITERS REMOVED FOR TESTING)
router.post("/register", registerUser);
router.post("/login", /* loginLimiter, */ loginUser);
router.post("/verify-otp", /* otpLimiter, */ verifyOTPHandler);
router.post("/resend-otp", /* otpLimiter, */ resendOtpHandler);

// Google OAuth Route
router.post("/google", googleLoginHandler);

// Password Reset Routes
router.post("/forgot-password", forgotPasswordHandler);
router.post("/reset-password", resetPasswordHandler);

// 🚀 ACCOUNT LINKING Routes (LIMITERS REMOVED FOR TESTING)
router.post(
  "/set-password/request",
  authMiddleware,
  /* otpLimiter, */
  requestSetPasswordHandler,
);
router.post(
  "/set-password/confirm",
  authMiddleware,
  /* otpLimiter, */
  confirmSetPasswordHandler,
);

// Security & Session Routes
router.post("/refresh", refreshAccessToken);
router.post("/logout", logoutUser);

export default router;
