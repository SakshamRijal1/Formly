import bcrypt from "bcryptjs";
import User from "../models/User.js";

export const updateProfile = async (req, res, next) => {
  try {
    const { name, profileImage } = req.body;
    const updates = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim() || name.trim().length > 100) {
        return res.status(400).json({ message: "Invalid name." });
      }

      updates.name = name.trim();
    }

    if (profileImage !== undefined) {
      if (typeof profileImage !== "string" || profileImage.length > 2048) {
        return res.status(400).json({ message: "Invalid profile image URL." });
      }

      updates.profileImage = profileImage;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.json({
      message: "Profile updated successfully.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage,
        isEmailVerified: user.isEmailVerified,
        authProvider: user.authProvider,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Current and new passwords are required.",
      });
    }

    if (newPassword.length < 8 || newPassword.length > 128) {
      return res.status(400).json({
        message: "New password must be between 8 and 128 characters.",
      });
    }

    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return res.status(400).json({
        message: "New password must contain a letter and a number.",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: "Passwords do not match.",
      });
    }

    const user = await User.findById(req.user._id).select("+password");

    if (!user.password) {
      return res.status(400).json({
        message: "This account does not have a password. Use password reset to set one.",
      });
    }

    const valid = await bcrypt.compare(currentPassword, user.password);

    if (!valid) {
      return res.status(400).json({
        message: "Current password is incorrect.",
      });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    res.json({ message: "Password changed successfully." });
  } catch (error) {
    next(error);
  }
};