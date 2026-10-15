
import express from "express";
import passport from "../config/passport.js";

import {
  register,
  verifyEmail,
  resendOTP,
  login,
  logout,
  getMe,

  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";


import { requireAuth } from "../middleware/auth.js";
import {
  generateToken,
  setAuthCookie,
} from "../utils/token.js";

const router = express.Router();

const clientURL = () =>
  (process.env.CLIENT_URL).replace(/\/+$/, "");

// Email/password authentication
router.post("/register", register);
router.post("/verify-email", verifyEmail);
router.post("/resend-otp", resendOTP);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", requireAuth, getMe);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// Start Google OAuth
router.get("/google", (req, res, next) => {
  if (
    !process.env.GOOGLE_CLIENT_ID ||
    !process.env.GOOGLE_CLIENT_SECRET
  ) {
    return res.redirect(
      `${clientURL()}/login?googleError=${encodeURIComponent(
        "Google login is not configured."
      )}`
    );
  }

  return passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })(req, res, next);
});

// Google OAuth callback
router.get("/google/callback", (req, res, next) => {
  passport.authenticate(
    "google",
    { session: false },
    (error, user, info) => {
      if (error) return next(error);

      if (!user) {
        const message =
          info?.message || "Google authentication failed.";

        return res.redirect(
          `${clientURL()}/login?googleError=${encodeURIComponent(message)}`
        );
      }

      setAuthCookie(res, generateToken(user._id));

      return res.redirect(`${clientURL()}/`);
    }
  )(req, res, next);
});

export default router;
