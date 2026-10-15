import mongoose from "mongoose";
import Form from "../models/Form.js";
import Response from "../models/Response.js";

const validateQuestions = (questions) => {
  if (!Array.isArray(questions)) return false;
  if (questions.length > 200) return false;

  const allowedTypes = [
    "short-answer",
    "paragraph",
    "multiple-choice",
    "checkboxes",
    "dropdown",
    "date",
    "time",
    "number",
    "file-upload",
  ];

  return questions.every((q) => {
    if (!q || typeof q.title !== "string" || !q.title.trim()) return false;
    if (!allowedTypes.includes(q.type)) return false;

    if (
      ["multiple-choice", "checkboxes", "dropdown"].includes(q.type) &&
      (!Array.isArray(q.options) ||
        q.options.length === 0 ||
        q.options.length > 100 ||
        !q.options.every(
          (option) => typeof option === "string" && option.trim()
        ))
    ) {
      return false;
    }

    return true;
  });
};

export const createForm = async (req, res, next) => {
  try {
    const form = await Form.create({
      owner: req.user._id,
      title: "Untitled form",
    });

    res.status(201).json({ form });
  } catch (error) {
    next(error);
  }
};

export const getMyForms = async (req, res, next) => {
  try {
    const { search = "" } = req.query;

    const filter = { owner: req.user._id };

    if (typeof search === "string" && search.trim()) {
      const safeSearch = search.trim().slice(0, 100);
      filter.title = { $regex: safeSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
    }

    const forms = await Form.find(filter).sort({ updatedAt: -1 });

    res.json({ forms });
  } catch (error) {
    next(error);
  }
};
export const getPublicForm = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({
        message: "Form not found.",
      });
    }

    const form = await Form.findOne({
      _id: req.params.id,
      isPublished: true,
    })
      .select("+owner")
      .populate("owner");
   

    if (!form) {
      return res.status(404).json({
        message: "Form not found or unpublished.",
      });
    }

    res.status(200).json({
      form: form.toObject(),
    });
  } catch (error) {
    next(error);
  }
};

export const getOwnedForm = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Form not found." });
    }

    const form = await Form.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!form) {
      return res.status(404).json({ message: "Form not found." });
    }

    res.json({ form });
  } catch (error) {
    next(error);
  }
};

export const updateForm = async (req, res, next) => {
  try {
    const { title, description, questions, theme, settings } = req.body;

    const updates = {};

    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim() || title.length > 200) {
        return res.status(400).json({ message: "Invalid form title." });
      }
      updates.title = title.trim();
    }

    if (description !== undefined) {
      if (typeof description !== "string" || description.length > 5000) {
        return res.status(400).json({ message: "Invalid description." });
      }
      updates.description = description;
    }

    if (questions !== undefined) {
      if (!validateQuestions(questions)) {
        return res.status(400).json({
          message: "Questions contain invalid fields or options.",
        });
      }
      updates.questions = questions;
    }

    if (theme !== undefined) {
      updates.theme = theme;
    }

  if (settings !== undefined) {
  if (
    !settings ||
    typeof settings !== "object" ||
    Array.isArray(settings)
  ) {
    return res.status(400).json({
      message: "Invalid form settings.",
    });
  }

  const allowedSettings = [
    "collectEmail",
    "shuffleQuestions",
    "limitOneResponse",
  ];

  for (const key of allowedSettings) {
    if (
      settings[key] !== undefined &&
      typeof settings[key] !== "boolean"
    ) {
      return res.status(400).json({
        message: `${key} must be true or false.`,
      });
    }
  }

  updates.settings = settings;
}

    const form = await Form.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!form) {
      return res.status(404).json({ message: "Form not found." });
    }

    res.json({ message: "Form saved successfully.", form });
  } catch (error) {
    next(error);
  }
};

export const publishForm = async (req, res, next) => {
  try {
    const form = await Form.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!form) {
      return res.status(404).json({ message: "Form not found." });
    }

    if (!form.questions.length) {
      return res.status(400).json({
        message: "Add at least one question before publishing.",
      });
    }

    form.isPublished = true;
    form.publishedAt = form.publishedAt || new Date();
    await form.save();

    res.json({
      message: "Form published successfully.",
      form,
      publicUrl: `${process.env.CLIENT_URL}/forms/${form._id}`,
    });
  } catch (error) {
    next(error);
  }
};

export const unpublishForm = async (req, res, next) => {
  try {
    const form = await Form.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { $set: { isPublished: false } },
      { new: true }
    );

    if (!form) {
      return res.status(404).json({ message: "Form not found." });
    }

    res.json({ message: "Form unpublished.", form });
  } catch (error) {
    next(error);
  }
};

export const deleteForm = async (req, res, next) => {
  try {
    const form = await Form.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!form) {
      return res.status(404).json({ message: "Form not found." });
    }

    await Response.deleteMany({ form: form._id });

    res.json({ message: "Form and its responses deleted." });
  } catch (error) {
    next(error);
  }
};