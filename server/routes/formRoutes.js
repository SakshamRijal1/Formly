import express from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  createForm,
  getMyForms,
  getPublicForm,
  getOwnedForm,
  updateForm,
  publishForm,
  unpublishForm,
  deleteForm,
} from "../controllers/formController.js";

const router = express.Router();

// Public form access
router.get("/public/:id", getPublicForm);

// All routes below require login
router.use(requireAuth);

router.post("/", createForm);
router.get("/", getMyForms);
router.get("/:id", getOwnedForm);
router.patch("/:id", updateForm);
router.post("/:id/publish", publishForm);
router.post("/:id/unpublish", unpublishForm);
router.delete("/:id", deleteForm);

export default router;