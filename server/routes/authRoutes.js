
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
 * Get the frontend URL without trailing slashes.
 */
const clientURL = () => {
  const url = process.env.CLIENT_URL;

  if (!url) {
    throw new Error("CLIENT_URL is not configured.");
  }

  return url.replace(/\/+$/, "");
};

/**
 * Redirect to the frontend login page with a readable error.
 */
const redirectToLogin = (res, message) => {
  return res.redirect(
    `${clientURL()}/login?googleError=${encodeURIComponent(message)}`
  );
};

/**
 * Email/password authentication and account verification.
 */
router.post("/register", register);
router.post("/verify-email", verifyEmail);
router.post("/resend-otp", resendOTP);
router.post("/login", login);
router.post("/logout", logout);

/**
 * Return the currently authenticated user.
 * optionalAuth should allow requests without a valid cookie.
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

/**
 * Password recovery.
 */
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

/**
 * Step 1: Start Google OAuth.
 */
router.get("/google", (req, res, next) => {
  console.info("[Google OAuth] Step 1: Sign-in route reached.");

  const configured =
    Boolean(process.env.GOOGLE_CLIENT_ID) &&
    Boolean(process.env.GOOGLE_CLIENT_SECRET) &&
    Boolean(process.env.GOOGLE_CALLBACK_URL);

  if (!process.env.CLIENT_URL) {
    console.error("[Google OAuth] CLIENT_URL is missing.");

    return res
      .status(500)
      .send("Frontend URL is not configured.");
  }

  if (!configured) {
    console.error(
      "[Google OAuth] Configuration missing. Check Google environment variables."
    );

    return redirectToLogin(
      res,
      "Google login is not configured."
    );
  }

  console.info("[Google OAuth] Step 2: Redirecting to Google.");

  return passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })(req, res, next);
});

/**
 * Step 3: Handle Google's callback.
 */
router.get("/google/callback", (req, res, next) => {
  console.info("[Google OAuth] Step 3: Callback route reached.", {
    hasAuthorizationCode: Boolean(req.query.code),
    providerReturnedError: Boolean(req.query.error),
  });

  if (!process.env.CLIENT_URL) {
    console.error(
      "[Google OAuth] CLIENT_URL is missing at callback."
    );

    return res
      .status(500)
      .send("Frontend URL is not configured.");
  }

  // Google may redirect here with an authorization error.
  if (req.query.error) {
    console.warn(
      "[Google OAuth] Google authorization was not completed:",
      String(req.query.error)
    );

    return redirectToLogin(
      res,
      "Google authorization was not completed."
    );
  }

  return passport.authenticate(
    "google",
    { session: false },
    (error, user, info) => {
      // An unexpected Passport, database, or strategy error.
      if (error) {
        console.error(
          "[Google OAuth] Step 4 FAILED:",
          error.message
        );

        return next(error);
      }

      // Passport rejected the Google account.
      if (!user) {
        const message =
          info?.message || "Google authentication failed.";

        console.warn(
          "[Google OAuth] Step 4 REJECTED:",
          message
        );

        return redirectToLogin(res, message);
      }

      // Passport authenticated the user successfully.
      try {
        console.info(
          "[Google OAuth] Step 5: Account authenticated. Creating JWT."
        );

        const token = generateToken(user._id);

        setAuthCookie(res, token);

        console.info(
          "[Google OAuth] Step 6: Auth cookie set; redirecting to frontend."
        );

        return res.redirect(`${clientURL()}/`);
      } catch (tokenError) {
        console.error(
          "[Google OAuth] JWT/cookie setup failed:",
          tokenError.message
        );

        return next(tokenError);
      }
    }
  )(req, res, next);
});

/**
 * Export the Express router for server.js.
 */
export default router;
