
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

function escapeHtml(value = "") {
  const entities = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };

  return String(value).replace(/[&<>"']/g, (char) => entities[char]);
}


const makeOTPExpiry = () => new Date(Date.now() + 10 * 60 * 1000);

// Generate, save, and email a six-digit verification code.

const sendVerificationOTP = async (user) => {
  const otp = generateOTP();

  user.otp = hashOTP(otp);
  user.otpExpiresAt = makeOTPExpiry();

  await user.save();

  await sendEmail({
    to: user.email,
    subject: `${otp} is your Formly verification code`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="color-scheme" content="light" />
        <title>Verify your Formly email</title>
      </head>

      <body style="margin:0;padding:0;background-color:#f5f6fa;font-family:Arial,Helvetica,sans-serif;color:#172033;">

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
          style="background-color:#f5f6fa;padding:36px 12px;">
          <tr>
            <td align="center">

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                style="max-width:560px;background-color:#ffffff;border-radius:18px;overflow:hidden;">

                <!-- Brand header -->
                <tr>
                  <td align="center"
                    style="background-color:#6d4aff;padding:32px 24px;">

                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center"
                          style="width:42px;height:42px;background-color:#ffffff;border-radius:12px;color:#6d4aff;font-size:25px;font-weight:bold;">
                          F
                        </td>
                        <td style="padding-left:12px;color:#ffffff;font-size:27px;font-weight:bold;letter-spacing:-0.5px;">
                          Formly
                        </td>
                      </tr>
                    </table>

                    <p style="margin:14px 0 0;color:#eee9ff;font-size:14px;line-height:22px;">
                      Simple forms. Meaningful responses.
                    </p>
                  </td>
                </tr>

                <!-- Main content -->
                <tr>
                  <td style="padding:36px 30px 24px;">

                    <p style="margin:0 0 12px;color:#6d4aff;font-size:12px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;">
                      Email verification
                    </p>

                    <h1 style="margin:0 0 16px;color:#172033;font-size:27px;line-height:36px;font-weight:700;">
                      Welcome to Formly!
                    </h1>

                    <p style="margin:0 0 14px;color:#596579;font-size:15px;line-height:25px;">
                      Hi ${escapeHtml(user.name || "there")},
                    </p>

                    <p style="margin:0 0 24px;color:#596579;font-size:15px;line-height:25px;">
                      Thanks for creating your Formly account. Please verify your email address using the code below to finish setting up your account.
                    </p>

                    <!-- OTP card -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                      style="background-color:#f7f5ff;border:1px solid #e5ddff;border-radius:14px;">
                      <tr>
                        <td align="center" style="padding:24px 16px;">

                          <p style="margin:0 0 14px;color:#6d4aff;font-size:12px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;">
                            Your verification code
                          </p>

                          <p style="margin:0;color:#4325c7;font-size:36px;font-weight:bold;letter-spacing:10px;line-height:48px;font-family:Arial,Helvetica,sans-serif;">
                            ${otp}
                          </p>

                          <p style="margin:16px 0 0;color:#596579;font-size:13px;line-height:21px;">
                            This code expires in <strong>10 minutes</strong>.
                          </p>

                        </td>
                      </tr>
                    </table>

                    <p style="margin:24px 0 0;color:#596579;font-size:14px;line-height:23px;">
                      Enter this code on the Formly verification page. You do not need to reply to this email.
                    </p>

                    <!-- Security notice -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                      style="margin-top:24px;background-color:#fff8eb;border-left:4px solid #f4b740;">
                      <tr>
                        <td style="padding:14px 16px;">
                          <p style="margin:0;color:#805a16;font-size:13px;line-height:21px;">
                            <strong>Security tip:</strong> Never share this code with anyone. Formly will never ask you to disclose your verification code to another person.
                          </p>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:24px 0 0;color:#596579;font-size:14px;line-height:23px;">
                      If you did not create a Formly account, you can safely ignore this email.
                    </p>

                    <p style="margin:28px 0 0;color:#172033;font-size:14px;line-height:23px;">
                      Best regards,<br />
                      <strong>The Formly Team</strong>
                    </p>

                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td align="center"
                    style="padding:22px 24px;background-color:#fafaff;border-top:1px solid #eeeaf8;">

                    <p style="margin:0 0 8px;color:#7b8495;font-size:12px;line-height:20px;">
                      This is an automated security email.
                    </p>

                    <p style="margin:0;color:#9aa2b1;font-size:11px;line-height:18px;">
                      © ${new Date().getFullYear()} Formly. All rights reserved.
                    </p>

                  </td>
                </tr>

              </table>

            </td>
          </tr>
        </table>

      </body>
      </html>
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
  let user = null;

  try {
    console.log("[Forgot Password] Request received.");

    // 1. Validate email input
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";

    if (!email) {
      console.warn("[Forgot Password] Email is missing.");

      return res.status(400).json({
        success: false,
        message: "Please enter your email address.",
      });
    }

    // Basic email validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      console.warn("[Forgot Password] Invalid email format.");

      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }


    // 2. Validate frontend URL configuration
    const clientURL = process.env.CLIENT_URL?.trim().replace(/\/+$/, "");

    if (!clientURL) {
      console.error("[Forgot Password] CLIENT_URL is missing.");

      throw new Error("CLIENT_URL is not configured.");
    }

    let parsedClientURL;

    try {
      parsedClientURL = new URL(clientURL);
    } catch {
      console.error("[Forgot Password] CLIENT_URL is invalid.");

      throw new Error("CLIENT_URL must be a valid URL.");
    }

    if (
      parsedClientURL.protocol !== "https:" &&
      process.env.NODE_ENV === "production"
    ) {
      console.error(
        "[Forgot Password] Production CLIENT_URL must use HTTPS."
      );

      throw new Error(
        "CLIENT_URL must be configured as an HTTPS URL."
      );
    }

    if (
      process.env.NODE_ENV === "production" &&
      parsedClientURL.hostname !== "formly-green.vercel.app"
    ) {
      console.error(
        "[Forgot Password] Unexpected production frontend hostname."
      );

      throw new Error("Production CLIENT_URL is not the expected frontend.");
    }

   

    // 3. Find eligible local-password account.
    // Do not reveal whether an email is registered.
    user = await User.findOne({ email }).select(
      "+password +resetPasswordToken +resetPasswordExpiresAt"
    );

    if (!user || !user.password) {
      console.log(
        "[Forgot Password] No eligible local-password account found."
      );

      return res.json({
        success: true,
        message:
          "If an eligible account exists, reset instructions will be sent.",
      });
    }

  

    // 4. Generate a secure, single-use reset token.
    const rawToken = crypto.randomBytes(32).toString("hex");

    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const resetUrl = new URL("/reset-password", parsedClientURL.origin);

    resetUrl.searchParams.set("token", rawToken);
    resetUrl.searchParams.set("email", user.email);

    // 5. Store only the token hash. Expire in 15 minutes.
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpiresAt = new Date(
      Date.now() + 15 * 60 * 1000
    );

    await user.save();

  
    // 6. Send reset email.
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
      console.error(
        "[Forgot Password] Email delivery failed:",
        emailError.message
      );

      // Invalidate the reset token if email delivery fails.
      user.resetPasswordToken = undefined;
      user.resetPasswordExpiresAt = undefined;

      try {
        await user.save();
    
      } catch (cleanupError) {
        console.error(
          "[Forgot Password] CRITICAL: Could not invalidate reset token:",
          cleanupError.message
        );
      }

      throw new Error("Password reset email could not be delivered.");
    }

    // 7. Return a generic response.
    return res.json({
      success: true,
      message:
        "If an eligible account exists, reset instructions will be sent.",
    });
  } catch (error) {
    console.error(
      "[Forgot Password] Request failed:",
      error.message
    );

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

