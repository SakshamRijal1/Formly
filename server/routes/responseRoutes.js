import express from "express";
import { requireAuth,optionalAuth } from "../middleware/auth.js";
import {
  submitResponse,
  getFormResponses,
} from "../controllers/responseController.js";

const router = express.Router();

router.post("/:formId", optionalAuth, submitResponse);
router.get("/:formId", requireAuth, getFormResponses);

export default router;