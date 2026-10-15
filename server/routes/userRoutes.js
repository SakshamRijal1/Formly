
import express from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  updateProfile,
  changePassword,
} from "../controllers/userController.js";
import upload from "../middleware/upload.js";

const router = express.Router();

// Protect all routes below.
router.use(requireAuth);
router.put("/", upload.single("avatar"), updateProfile);
router.patch("/profile", updateProfile);
router.patch("/password", changePassword);


export default router;
