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

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  profileImage: user.profileImage,
  isEmailVerified: user.isEmailVerified,
  authProvider: user.authProvider,
});

const makeOTPExpiry = () => new Date(Date.now() + 10 * 60 * 1000);

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
    const existingUser = await User.findOne({ email: normalizedEmail });

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
      await User.deleteOne({ _id: user._id });
      throw emailError;
    }

    res.status(201).json({
      message: "Account created. Check your email for the verification code.",
      user: publicUser(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    next(error);
  }
};

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

    res.json({
      message: "Email verified successfully.",
      user: publicUser(user),
    });
  } catch (error) {
    next(error);
  }
};

export const resendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+otp +otpExpiresAt");

    // Avoid revealing whether an email address has an account.
    if (!user || user.isEmailVerified) {
      return res.json({
        message: "If verification is needed, a code will be sent.",
      });
    }

    if (user.otpExpiresAt && user.otpExpiresAt.getTime() > Date.now() - 9 * 60 * 1000) {
      return res.status(429).json({
        message: "Please wait before requesting another code.",
      });
    }

    await sendVerificationOTP(user);

    res.json({ message: "If verification is needed, a code will be sent." });
  } catch (error) {
    next(error);
  }
};

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

    setAuthCookie(res, generateToken(user._id));

    res.json({
      message: "Login successful.",
      user: publicUser(user),
    });
  } catch (error) {
    next(error);
  }
};

export const logout = (req, res) => {
  clearAuthCookie(res);
  res.json({ message: "Logged out successfully." });
};

export const getMe = (req, res) => {
  res.json({ user: publicUser(req.user) });
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select('+password');

    // Keep the response the same whether the account exists or not.
    if (!user || !user.password) {
      return res.json({
        message: "If an eligible account exists, reset instructions will be sent.",
      });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");

    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    user.resetPasswordExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    const resetUrl =
      `${process.env.CLIENT_URL}/reset-password?token=${rawToken}` +
      `&email=${encodeURIComponent(user.email)}`;

    try {
      await sendEmail({
        to: user.email,
        subject: "Reset your Formly password",
        html: `
          <p>Use the link below to reset your password. It expires in 15 minutes.</p>
          <a href="${resetUrl}">Reset password</a>
        `,
      });
    } catch (emailError) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpiresAt = undefined;
      await user.save();
      throw emailError;
    }

    res.json({
      message: "If an eligible account exists, reset instructions will be sent.",
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { email, token, password, confirmPassword } = req.body;

    if (!email || !token || !password) {
      return res.status(400).json({
        message: "Email, reset token and new password are required.",
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

    if (password !== confirmPassword) {
      return res.status(400).json({
        message: "Passwords do not match.",
      });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
      resetPasswordToken: hashedToken,
      resetPasswordExpiresAt: { $gt: new Date() },
    }).select("+resetPasswordToken +resetPasswordExpiresAt +password");

    if (!user) {
      return res.status(400).json({
        message: "Reset link is invalid or expired.",
      });
    }

    user.password = await bcrypt.hash(password, 12);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiresAt = undefined;
    await user.save();

    res.json({
      message: "Password reset successfully. Please log in.",
    });
  } catch (error) {
    next(error);
  }
};