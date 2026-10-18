
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/User.js";

const isProduction = process.env.NODE_ENV === "production";

const clientID = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

const callbackURL =
  process.env.GOOGLE_CALLBACK_URL ||
  (!isProduction
    ? "http://localhost:3000/api/auth/google/callback"
    : undefined);

const maskEmail = (email = "") => {
  const [name, domain] = email.split("@");
  if (!name || !domain) return "[invalid email]";
  return `${name.slice(0, 2)}***@${domain}`;
};

if (!clientID || !clientSecret || !callbackURL) {
  console.error(
    "[Google OAuth] Configuration missing. Check GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_CALLBACK_URL."
  );
} else {
  console.info("[Google OAuth] Strategy configured.", {
    environment: process.env.NODE_ENV,
    callbackURL,
  });

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
        console.info("[Google OAuth] Google profile received.");

        try {
          const email = profile.emails?.[0]?.value
            ?.trim()
            .toLowerCase();

          const verified =
            profile._json?.email_verified ??
            profile.emails?.[0]?.verified;

          if (!email || verified !== true) {
            console.warn(
              "[Google OAuth] Rejected: missing or unverified email."
            );

            return done(null, false, {
              message: "Google must provide a verified email address.",
            });
          }

          console.info("[Google OAuth] Verified email received.", {
            email: maskEmail(email),
          });

          // Step 1: Find an account already linked to this Google ID.
          let user = await User.findOne({ googleId: profile.id });

          if (user) {
            console.info(
              "[Google OAuth] Existing Google-linked account found."
            );

            if (user.email?.toLowerCase() !== email) {
              console.warn(
                "[Google OAuth] Rejected: linked email does not match."
              );

              return done(null, false, {
                message:
                  "The Google account email does not match the linked account.",
              });
            }

            if (!user.profileImage && profile.photos?.[0]?.value) {
              user.profileImage = profile.photos[0].value;
            }

            if (!user.isEmailVerified) {
              user.isEmailVerified = true;
            }

            await user.save();

            console.info(
              "[Google OAuth] Existing linked account authenticated."
            );

            return done(null, user);
          }

          // Step 2: Check whether this email belongs to another account.
          const existingUser = await User.findOne({ email });

          if (existingUser) {
            console.warn(
              "[Google OAuth] REJECTED: email belongs to an existing account.",
              {
                email: maskEmail(email),
                authProvider: existingUser.authProvider,
                hasPassword: Boolean(existingUser.password),
                hasGoogleId: Boolean(existingUser.googleId),
              }
            );

            return done(null, false, {
              message:
                "An account already exists with this email. Sign in using your existing method first.",
            });
          }

          // Step 3: Create a new Google account.
          console.info("[Google OAuth] No matching account. Creating one.");

          user = await User.create({
            name: profile.displayName || email.split("@")[0],
            email,
            googleId: profile.id,
            authProvider: "google",
            isEmailVerified: true,
            profileImage: profile.photos?.[0]?.value || "",
          });

          console.info("[Google OAuth] New account created successfully.");

          return done(null, user);
        } catch (error) {
          if (error?.code === 11000) {
            console.warn(
              "[Google OAuth] Duplicate account/index conflict."
            );

            return done(null, false, {
              message:
                "An account with these details already exists. Please try signing in again.",
            });
          }

          console.error(
            "[Google OAuth] Strategy/database error:",
            error.message
          );

          return done(error);
        }
      }
    )
  );
}

export default passport;
