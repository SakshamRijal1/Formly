
import express from "express";
import {
  requireAuth,
  optionalAuth,
} from "../middleware/auth.js";

import {
  submitResponse,
  getFormResponses,
  uploadResponseFiles,
  openResponseFile

} from "../controllers/responseController.js";


import responseUpload from "../middleware/responseUpload.js";

const router = express.Router();

// Upload files for a question in a published form.
router.post(
  "/:formId/upload/:questionId",
  optionalAuth,
  responseUpload.array("files", 10),
  uploadResponseFiles
);
router.get("/:formId/files/:fileId", requireAuth, openResponseFile);

// Submit a response.
router.post("/:formId", optionalAuth, submitResponse);

// Get responses for a form owned by the logged-in user.
router.get("/:formId", requireAuth, getFormResponses);

export default router;
