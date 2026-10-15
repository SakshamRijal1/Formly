
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import imagekit from "../config/imagekit.js";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export const updateProfile = async (req, res, next) => {
  try {
    const { name } = req.body;
    const updates = {};
    console.log("Comming request")
    console.log(name,req.file)

    // Validate and update the user's name.
    if (name !== undefined) {
      if (
        typeof name !== "string" ||
        !name.trim() ||
        name.trim().length > 100
      ) {
        return res.status(400).json({
          message: "Name must be between 1 and 100 characters.",
        });
      }

      updates.name = name.trim();
    }

    // Validate and upload the profile image.
    if (req.file) {
      if (!ALLOWED_IMAGE_TYPES.has(req.file.mimetype)) {
        return res.status(400).json({
          message: "Only JPG, PNG, and WebP images are allowed.",
        });
      }

      if (req.file.size > MAX_IMAGE_SIZE) {
        return res.status(400).json({
          message: "Profile images must be 5 MB or smaller.",
        });
      }

      if (!req.file.buffer) {
        return res.status(400).json({
          message: "The uploaded image could not be read.",
        });
      }

      const uploadedImage = await imagekit.upload({
        file: req.file.buffer,
        fileName: `profile-${req.user._id}-${Date.now()}`,
        folder: "/formly/profiles",
        useUniqueFileName: true,
      });

      updates.profileImage = uploadedImage.url;
      updates.profileImageFileId = uploadedImage.fileId;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "Provide a name or profile image to update.",
      });
    }

    // Update MongoDB and return the updated document.
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      {
        returnDocument: "after",
        runValidators: true,
      }
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    return res.status(200).json({
      message: "Profile updated successfully.",
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage || "",
        isEmailVerified: user.isEmailVerified,
        authProvider: user.authProvider,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (
      typeof currentPassword !== "string" ||
      !currentPassword ||
      typeof newPassword !== "string" ||
      !newPassword
    ) {
      return res.status(400).json({
        message: "Current and new passwords are required.",
      });
    }

    if (newPassword.length < 8 || newPassword.length > 128) {
      return res.status(400).json({
        message: "New password must be between 8 and 128 characters.",
      });
    }

    if (
      !/[A-Za-z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword)
    ) {
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

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    if (!user.password) {
      return res.status(400).json({
        message:
          "This account does not have a password. Use password reset to set one.",
      });
    }

    const passwordMatches = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!passwordMatches) {
      return res.status(400).json({
        message: "Current password is incorrect.",
      });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    return res.status(200).json({
      message: "Password changed successfully.",
    });
  } catch (error) {
    return next(error);
  }
};
