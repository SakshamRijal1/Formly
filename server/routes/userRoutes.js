import express from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  updateProfile,
  changePassword,
} from "../controllers/userController.js";

const router = express.Router();

router.use(requireAuth);

router.patch("/profile", updateProfile);
router.patch("/password", changePassword);

export default router;