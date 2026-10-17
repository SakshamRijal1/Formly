
import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../models/User.js";
import { sendEmail } from "../config/mail.js";
import { generateOTP, hashOTP } from "../utils/otp.js";
import {
  generateToken,
  setAuthCookie,
  clearAuthCookie,
} from "../utils/token.js";

// Safely format user data for API responses.
const publicUser = (user) => {
  if (!user) return null;

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    profileImage: user.profileImage,
    isEmailVerified: user.isEmailVerified,
    authProvider: user.authProvider,
  };
};

const makeOTPExpiry = () => new Date(Date.now() + 10 * 60 * 1000);

// Generate, save, and email a six-digit verification code.
const sendVerificationOTP = async (user) => {
  const otp = generateOTP();

  user.otp = hashOTP(otp);
  user.otpExpiresAt = makeOTPExpiry();

  await user.save();

  await sendEmail({
    to: user.email,
    subject: "Verify your Formly email",
    html: `
      <h2>Welcome to Formly!</h2>
      <p>Your verification code is:</p>
      <h1 style="letter-spacing:6px">${otp}</h1>
      <p>This code expires in 10 minutes. Do not share it with anyone.</p>
    `,
  });
};

// REGISTER
export const register = async (req, res, next) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        message: "Name, email and password are required.",
      });
    }

    if (name.trim().length > 100) {
      return res.status(400).json({
        message: "Name must be 100 characters or fewer.",
      });
    }

    if (password.length < 8 || password.length > 128) {
      return res.status(400).json({
        message: "Password must be between 8 and 128 characters.",
      });
    }

    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({
        message: "Password must contain at least one letter and one number.",
      });
    }

    if (confirmPassword !== password) {
      return res.status(400).json({
        message: "Passwords do not match.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      authProvider: "local",
      isEmailVerified: false,
    });

    try {
      await sendVerificationOTP(user);
    } catch (emailError) {
      // Preserve the original behavior: remove the new account
      // if its initial verification email cannot be sent.
      await User.deleteOne({ _id: user._id });
      throw emailError;
    }

    return res.status(201).json({
      message: "Account created. Check your email for the verification code.",
      user: publicUser(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    return next(error);
  }
};

// VERIFY EMAIL
export const verifyEmail = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !/^\d{6}$/.test(String(otp || ""))) {
      return res.status(400).json({
        message: "Enter your email and six-digit verification code.",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+otp +otpExpiresAt");

    if (!user || user.isEmailVerified) {
      return res.status(400).json({
        message: "Account not found or already verified.",
      });
    }

    if (
      !user.otp ||
      !user.otpExpiresAt ||
      user.otpExpiresAt.getTime() < Date.now() ||
      user.otp !== hashOTP(String(otp))
    ) {
      return res.status(400).json({
        message: "Invalid or expired verification code.",
      });
    }

    user.isEmailVerified = true;
    user.otp = undefined;
    user.otpExpiresAt = undefined;

    await user.save();

    const token = generateToken(user._id);
    setAuthCookie(res, token);

    return res.json({
      message: "Email verified successfully.",
      user: publicUser(user),
    });
  } catch (error) {
    return next(error);
  }
};

// RESEND OTP
export const resendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required.",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+otp +otpExpiresAt");

    // Do not reveal whether an account exists.
    if (!user || user.isEmailVerified) {
      return res.json({
        message: "If verification is needed, a code will be sent.",
      });
    }

    // Do not resend while the current code is still valid.
    if (
      user.otpExpiresAt &&
      user.otpExpiresAt.getTime() > Date.now()
    ) {
      return res.status(429).json({
        message: "Your current code is still valid. Please wait for it to expire.",
      });
    }

    await sendVerificationOTP(user);

    return res.json({
      message: "If verification is needed, a code will be sent.",
    });
  } catch (error) {
    return next(error);
  }
};

// LOGIN
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+password");

    if (!user || !user.password) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        message: "Please verify your email before logging in.",
        code: "EMAIL_NOT_VERIFIED",
      });
    }

    const token = generateToken(user._id);
    setAuthCookie(res, token);

    return res.json({
      message: "Login successful.",
      user: publicUser(user),
    });
  } catch (error) {
    return next(error);
  }
};

// LOGOUT
export const logout = (req, res) => {
  clearAuthCookie(res);

  return res.json({
    message: "Logged out successfully.",
  });
};

// CURRENT USER
export const getMe = (req, res) => {
  // /auth/me must also work when no session exists.
  if (!req.user) {
    return res.json({ user: null });
  }

  return res.json({
    user: publicUser(req.user),
  });
};

// FORGOT PASSWORD

export const forgotPassword = async (req, res, next) => {
  try {
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";

    if (!email) {
      return res.status(400).json({
        message: "Email is required.",
      });
    }

    // Avoid revealing whether an account exists.
    const user = await User.findOne({ email }).select(
      "+resetPasswordToken +resetPasswordExpiresAt +password"
    );

    if (!user || !user.password) {
      return res.json({
        message:
          "If an eligible account exists, reset instructions will be sent.",
      });
    }

    // Generate a cryptographically secure, single-use token.
    const rawToken = crypto.randomBytes(32).toString("hex");

    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const clientURL = process.env.CLIENT_URL?.replace(/\/+$/, "");

    if (!clientURL || !/^https:\/\//i.test(clientURL)) {
      throw new Error(
        "CLIENT_URL must be configured as an HTTPS URL."
      );
    }

    // Save only the hash of the reset token.
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpiresAt = new Date(
      Date.now() + 15 * 60 * 1000
    );

    await user.save();

    const resetUrl = new URL("/reset-password", clientURL);
    resetUrl.searchParams.set("token", rawToken);
    resetUrl.searchParams.set("email", user.email);

    try {
      await sendEmail({
        to: user.email,
        subject: "Reset your Formly password",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
            <h2>Reset your Formly password</h2>
            <p>We received a request to reset your password.</p>
            <p>This link expires in 15 minutes and can be used only once.</p>
            <p>
              <a href="${resetUrl.toString()}"
                 style="display:inline-block;padding:12px 20px;
                 background:#2563eb;color:#fff;text-decoration:none;
                 border-radius:6px">
                Reset password
              </a>
            </p>
            <p>If you did not request this, you can ignore this email.</p>
          </div>
        `,
        text: `Reset your Formly password using this link: ${resetUrl.toString()}. This link expires in 15 minutes.`,
      });
    } catch (emailError) {
      // Invalidate the token if the email could not be sent.
      user.resetPasswordToken = undefined;
      user.resetPasswordExpiresAt = undefined;
      await user.save();

      // Let Express's error handler report the delivery failure.
      throw emailError;
    }

    return res.json({
      message:
        "If an eligible account exists, reset instructions will be sent.",
    });
  } catch (error) {
    return next(error);
  }
};


// RESET PASSWORD

export const resetPassword = async (req, res, next) => {
  try {
    const { email, token, password, confirmPassword } = req.body;

    // 1. Validate required fields.
    if (
      typeof email !== "string" ||
      typeof token !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !token.trim()
    ) {
      return res.status(400).json({
        message: "Email, reset token and new password are required.",
      });
    }

    // 2. Validate password length.
    if (password.length < 8 || password.length > 128) {
      return res.status(400).json({
        message: "Password must be between 8 and 128 characters.",
      });
    }

    // 3. Require at least one letter and one number.
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({
        message:
          "Password must contain at least one letter and one number.",
      });
    }

    // 4. Check confirmation.
    if (password !== confirmPassword) {
      return res.status(400).json({
        message: "Passwords do not match.",
      });
    }

    // 5. Hash the submitted token before comparing with the database.
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // 6. Find a matching, unexpired reset token.
    const user = await User.findOne({
      email: email.trim().toLowerCase(),
      resetPasswordToken: hashedToken,
      resetPasswordExpiresAt: { $gt: new Date() },
    }).select("+resetPasswordToken +resetPasswordExpiresAt +password");

    if (!user || !user.password) {
      return res.status(400).json({
        message: "Reset link is invalid or expired.",
      });
    }

    // 7. Hash the new password.
    user.password = await bcrypt.hash(password, 12);

    // 8. Make the reset token single-use.
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiresAt = undefined;

    await user.save();

    // 9. Do not automatically log in; require normal login.
    clearAuthCookie(res);

    return res.status(200).json({
      message: "Password reset successfully. Please log in.",
    });
  } catch (error) {
    return next(error);
  }
};

