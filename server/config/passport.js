
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/User.js";

const callbackURL =
  process.env.GOOGLE_CALLBACK_URL ||
  "http://localhost:3000/api/auth/google/callback";
  console.log(process.env.GOOGLE_CLIENT_ID)
  console.log(process.env.GOOGLE_CLIENT_SECRET)
  console.log(process.env.GOOGLE_CALLBACK_URL)

if (
  !process.env.GOOGLE_CLIENT_ID ||
  !process.env.GOOGLE_CLIENT_SECRET
) {
  console.warn(
    "Google OAuth is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env."
  );
} else {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value
            ?.trim()
            .toLowerCase();

          if (!email || profile.emails?.[0]?.verified === false) {
            return done(
              new Error("Google did not provide a verified email address.")
            );
          }

          let user = await User.findOne({
            $or: [
              { googleId: profile.id },
              { email },
            ],
          });

          if (user) {
            // Never silently link a local password account to Google.
            // The user must prove ownership through the existing login flow.
            if (!user.googleId && user.authProvider !== "google") {
              return done(
                null,
                false,
                {
                  message:
                    "An account already exists with this email. Log in with your existing method first.",
                }
              );
            }

            if (!user.googleId) {
              user.googleId = profile.id;
            }

            user.isEmailVerified = true;

            if (!user.profileImage && profile.photos?.[0]?.value) {
              user.profileImage = profile.photos[0].value;
            }

            await user.save();
          } else {
            user = await User.create({
              name: profile.displayName || email.split("@")[0],
              email,
              googleId: profile.id,
              authProvider: "google",
              isEmailVerified: true,
              profileImage: profile.photos?.[0]?.value || "",
            });
          }

          return done(null, user);
        } catch (error) {
          if (error.code === 11000) {
            return done(
              null,
              false,
              { message: "An account with this email already exists." }
            );
          }

          return done(error);
        }
      }
    )
  );
}

export default passport;
