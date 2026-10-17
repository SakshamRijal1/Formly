
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/User.js";

const isProduction = process.env.NODE_ENV === "production";

const clientID = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

const callbackURL =
  process.env.GOOGLE_CALLBACK_URL ||
  (!isProduction
    ? "http://localhost:4000/api/auth/google/callback"
    : undefined);

if (!clientID || !clientSecret || !callbackURL) {
  console.warn(
    "Google OAuth is not configured. Check GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_CALLBACK_URL."
  );
} else {
  passport.use(
    "google",
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL,
        passReqToCallback: false,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          // Accept only an email Google explicitly confirms as verified.
          const email = profile.emails?.[0]?.value
            ?.trim()
            .toLowerCase();

          const verified =
            profile._json?.email_verified ??
            profile.emails?.[0]?.verified;

          if (!email || verified !== true) {
            return done(
              null,
              false,
              {
                message:
                  "Google must provide a verified email address.",
              }
            );
          }

          // First, look for an account already linked to this Google ID.
          let user = await User.findOne({
            googleId: profile.id,
          });

          if (user) {
            // Prevent a Google identity from silently switching emails.
            if (user.email?.toLowerCase() !== email) {
              return done(
                null,
                false,
                {
                  message:
                    "The Google account email does not match the linked account.",
                }
              );
            }

            // Update only profile fields; never overwrite passwords or roles.
            if (!user.profileImage && profile.photos?.[0]?.value) {
              user.profileImage = profile.photos[0].value;
            }

            if (!user.isEmailVerified) {
              user.isEmailVerified = true;
            }

            await user.save();

            return done(null, user);
          }

          // Do not silently link Google to an existing local account.
          const existingUser = await User.findOne({ email });

          if (existingUser) {
            return done(
              null,
              false,
              {
                message:
                  "An account already exists with this email. Sign in using your existing method first.",
              }
            );
          }

          // Create a new Google account.
          user = await User.create({
            name: profile.displayName || email.split("@")[0],
            email,
            googleId: profile.id,
            authProvider: "google",
            isEmailVerified: true,
            profileImage: profile.photos?.[0]?.value || "",
          });

          return done(null, user);
        } catch (error) {
          // Handle duplicate email/Google ID caused by concurrent requests.
          if (error?.code === 11000) {
            return done(
              null,
              false,
              {
                message:
                  "An account with these details already exists. Please try signing in again.",
              }
            );
          }

          return done(error);
        }
      }
    )
  );
}

export default passport;
