
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

/**
 * Start Google OAuth
 */
router.get("/google", (req, res, next) => {
  console.info("[Google OAuth] Step 1: Sign-in route reached.");

  const frontend = process.env.CLIENT_URL;
  const configured =
    Boolean(process.env.GOOGLE_CLIENT_ID) &&
    Boolean(process.env.GOOGLE_CLIENT_SECRET) &&
    Boolean(process.env.GOOGLE_CALLBACK_URL);

  if (!frontend) {
    console.error("[Google OAuth] CLIENT_URL is missing.");
    return res.status(500).send("Frontend URL is not configured.");
  }

  if (!configured) {
    console.error("[Google OAuth] Google environment configuration missing.");

    return res.redirect(
      `${frontend.replace(/\/+$/, "")}/login?googleError=` +
        encodeURIComponent("Google login is not configured.")
    );
  }

  console.info("[Google OAuth] Step 2: Redirecting to Google.");

  return passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })(req, res, next);
});

/**
 * Handle Google's callback
 */
router.get("/google/callback", (req, res, next) => {
  console.info("[Google OAuth] Step 3: Callback route reached.", {
    hasAuthorizationCode: Boolean(req.query.code),
    providerReturnedError: Boolean(req.query.error),
  });

  if (req.query.error) {
    console.warn(
      "[Google OAuth] Google returned an authorization error:",
      String(req.query.error)
    );

    const frontend = process.env.CLIENT_URL?.replace(/\/+$/, "");

    if (!frontend) {
      return res.status(500).send("Frontend URL is not configured.");
    }

    return res.redirect(
      `${frontend}/login?googleError=` +
        encodeURIComponent("Google authorization was not completed.")
    );
  }

  if (!process.env.CLIENT_URL) {
    console.error("[Google OAuth] CLIENT_URL is missing at callback.");
    return res.status(500).send("Frontend URL is not configured.");
  }

  return passport.authenticate(
    "google",
    { session: false },
    (error, user, info) => {
      if (error) {
        console.error(
          "[Google OAuth] Step 4 FAILED: Passport error:",
          error.message
        );

        return next(error);
      }

      if (!user) {
        const message =
          info?.message || "Google authentication failed.";

        console.warn(
          "[Google OAuth] Step 4 REJECTED:",
          message
        );

        const frontend = process.env.CLIENT_URL.replace(/\/+$/, "");

        return res.redirect(
          `${frontend}/login?googleError=${encodeURIComponent(message)}`
        );
      }

      try {
        console.info(
          "[Google OAuth] Step 5: Account authenticated. Creating JWT."
        );

        const token = generateToken(user._id);
        setAuthCookie(res, token);

        console.info(
          "[Google OAuth] Step 6: Auth cookie set; redirecting to frontend."
        );

        return res.redirect(
          `${process.env.CLIENT_URL.replace(/\/+$/, "")}/`
        );
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
