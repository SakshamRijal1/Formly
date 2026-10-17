
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

import {
  generateToken,
  setAuthCookie,
} from "../utils/token.js";
import { optionalAuth } from "../middleware/auth.js";

const router = express.Router();

/**
 * Frontend URL
 * Removes trailing slashes and avoids redirecting to an undefined URL.
 */
const clientURL = () => {
  const url = process.env.CLIENT_URL;

  if (!url) {
    throw new Error("CLIENT_URL is not configured.");
  }

  return url.replace(/\/+$/, "");
};

/**
 * Safely redirect to the frontend login page with an error message.
 */
const redirectToLogin = (res, message) => {
  return res.redirect(
    `${clientURL()}/login?googleError=${encodeURIComponent(message)}`
  );
};

/**
 * Email/password authentication
 */
router.post("/register", register);
router.post("/verify-email", verifyEmail);
router.post("/resend-otp", resendOTP);
router.post("/login", login);
router.post("/logout", logout);

/**
 * Return the current authenticated user.
 * getMe must safely handle requests without a valid session.
 */
router.get(
  "/me",
  (req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  },
  optionalAuth,
  getMe
);


router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

/**
 * Start Google OAuth
 */
router.get("/google", (req, res, next) => {
  const frontend = process.env.CLIENT_URL;
  const googleConfigured =
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_CALLBACK_URL;

  if (!frontend) {
    return res.status(500).send("Frontend URL is not configured.");
  }

  if (!googleConfigured) {
    return redirectToLogin(
      res,
      "Google login is not configured."
    );
  }

  return passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })(req, res, next);
});

/**
 * Handle Google's callback
 */
router.get("/google/callback", (req, res, next) => {
  if (!process.env.CLIENT_URL) {
    return res.status(500).send("Frontend URL is not configured.");
  }

  return passport.authenticate(
    "google",
    { session: false },
    (error, user, info) => {
      if (error) {
        // Keep internal errors and secrets out of the browser response.
        return next(error);
      }

      if (!user) {
        const message =
          info?.message || "Google authentication failed.";

        return redirectToLogin(res, message);
      }

      try {
        const token = generateToken(user._id);
        setAuthCookie(res, token);

        return res.redirect(`${clientURL()}/`);
      } catch (tokenError) {
        return next(tokenError);
      }
    }
  )(req, res, next);
});

export default router;
