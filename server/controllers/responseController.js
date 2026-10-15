
import mongoose from "mongoose";
import Form from "../models/Form.js";
import Response from "../models/Response.js";
import imagekit from "../config/imagekit.js";
import { getIO } from "../config/socket.js";
import { responseEmailTemplate } from "../utils/responseEmailTemplate.js";
import transporter from "../config/mail.js";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_FILES = 10;

const uploadFolder = (formId, questionId) =>
  `/formly/responses/${formId}/${questionId}`;

const hasAnswer = (value) => {
  if (Array.isArray(value)) return value.length > 0;

  if (value && typeof value === "object") {
    return (
      Array.isArray(value.assetIds) &&
      value.assetIds.length > 0
    );
  }

  if (value === null || value === undefined || value === "") {
    return false;
  }

  if (typeof value === "number") return value > 0;

  return String(value).trim().length > 0;
};

const matchesAllowedType = (file, pattern) => {
  if (!pattern || pattern === "*/*") return true;

  const normalized = String(pattern).trim().toLowerCase();
  const mime = String(file.mimetype || "").toLowerCase();
  const name = String(file.originalname || "").toLowerCase();

  if (normalized.endsWith("/*")) {
    return mime.startsWith(normalized.slice(0, -1));
  }

  if (normalized.startsWith(".")) {
    return name.endsWith(normalized);
  }

  if (normalized.includes("/")) {
    return mime === normalized;
  }

  // Also support extension names such as "pdf" or "png".
  return name.endsWith(`.${normalized.replace(/^\./, "")}`);
};

const getQuestion = (form, questionId) =>
  form.questions.find(
    (question) => question._id.toString() === String(questionId)
  );

// Upload files to ImageKit for a question in a published form.

export const uploadResponseFiles = async (req, res, next) => {
  try {
    const { formId, questionId } = req.params;

    if (
      !mongoose.isValidObjectId(formId) ||
      !mongoose.isValidObjectId(questionId)
    ) {
      return res.status(400).json({
        message: "Invalid form or question ID.",
      });
    }

    if (!Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({
        message: "Please select at least one file to upload.",
      });
    }

    if (req.files.length > MAX_FILES) {
      return res.status(400).json({
        message: `You can upload a maximum of ${MAX_FILES} files at once.`,
      });
    }

    const form = await Form.findOne({
      _id: formId,
      isPublished: true,
    });

    if (!form) {
      return res.status(404).json({
        message: "Form not found or not accepting responses.",
      });
    }

    const question = getQuestion(form, questionId);

    if (
      !question ||
      !["file-upload", "image-upload"].includes(question.type)
    ) {
      return res.status(400).json({
        message: "This question does not accept file uploads.",
      });
    }

    const settings = question.fileUploadSettings ?? {};

 const maxFiles = 1;

    const maxSizeMB = Math.max(
      1,
      Math.min(20, Number(settings.maxSizeMB) || 10)
    );

    if (req.files.length > maxFiles) {
      return res.status(400).json({
        message: `This question allows a maximum of ${maxFiles} file(s).`,
      });
    }

    const allowedTypes =
      question.type === "image-upload"
        ? ["image/*"]
        : Array.isArray(settings.allowedTypes) &&
            settings.allowedTypes.length
          ? settings.allowedTypes
          : ["image/*", "application/pdf"];

    for (const file of req.files) {
      if (!file.buffer || !file.size) {
        return res.status(400).json({
          message: "One of the uploaded files is invalid or empty.",
        });
      }

      if (
        file.size >
        Math.min(MAX_FILE_SIZE, maxSizeMB * 1024 * 1024)
      ) {
        return res.status(400).json({
          message: `${file.originalname} exceeds the file-size limit.`,
        });
      }

      if (
        !allowedTypes.some((type) => matchesAllowedType(file, type))
      ) {
        return res.status(400).json({
          message: `${file.originalname} is not an allowed file type.`,
        });
      }

      if (
        question.type === "image-upload" &&
        !String(file.mimetype).startsWith("image/")
      ) {
        return res.status(400).json({
          message: "Only image files are allowed for this question.",
        });
      }
    }

    const folder = uploadFolder(form._id, question._id);

    const uploadedFiles = await Promise.all(
      req.files.map(async (file) => {
        const uploaded = await imagekit.upload({
          file: file.buffer,
          fileName: file.originalname,
          folder,
          useUniqueFileName: true,
          isPrivateFile: true,
        });

        return {
          assetId: uploaded.fileId,
          name: file.originalname,
          size: file.size,
          url: uploaded.url,
          mimeType: file.mimetype,
        };
      })
    );

    return res.status(201).json({
      message: "Files uploaded successfully.",
      files: uploadedFiles,
    });
  } catch (error) {
    next(error);
  }
};


export const submitResponse = async (req, res, next) => {
  try {
    const { answers, respondentEmail, sendCopy } = req.body;

    if (sendCopy && !req.user?.email) {
      return res.status(401).json({
        message: "Please log in to receive a copy of your responses.",
        code: "LOGIN_REQUIRED",
      });
    }

    const receiptEmail = sendCopy ? req.user.email : null;

    if (!mongoose.isValidObjectId(req.params.formId)) {
      return res.status(404).json({
        message: "Form not found.",
      });
    }

    if (!Array.isArray(answers)) {
      return res.status(400).json({
        message: "Answers must be an array.",
      });
    }

    const form = await Form.findOne({
      _id: req.params.formId,
      isPublished: true,
    });

    if (!form) {
      return res.status(404).json({
        message: "Form not found or not accepting responses.",
      });
    }

    const settings = form.settings || {};
    let normalizedEmail = "";

    if (settings.collectEmail) {
      if (
        typeof respondentEmail !== "string" ||
        !respondentEmail.trim()
      ) {
        return res.status(400).json({
          message: "An email address is required for this form.",
        });
      }

      normalizedEmail = respondentEmail.trim().toLowerCase();
    }

    if (settings.limitOneResponse && settings.collectEmail) {
      const existingResponse = await Response.findOne({
        form: form._id,
        respondentEmail: normalizedEmail,
      }).lean();

      if (existingResponse) {
        return res.status(409).json({
          message: "You have already submitted a response to this form.",
          code: "ALREADY_RESPONDED",
        });
      }
    }

    const submitted = new Map();

    for (const answer of answers) {
      const questionId = String(answer?.questionId || "");

      if (!mongoose.isValidObjectId(questionId)) {
        return res.status(400).json({
          message: "Invalid question ID.",
        });
      }

      if (submitted.has(questionId)) {
        return res.status(400).json({
          message: "Duplicate answers were submitted for a question.",
        });
      }

      // Accept the assetIds field from the updated PublicForm as well.
      let value = answer.value;

      if (
        value === undefined &&
        Array.isArray(answer.assetIds)
      ) {
        value = { assetIds: answer.assetIds };
      }

      submitted.set(questionId, value);
    }

    const allowedQuestionIds = new Set(
      form.questions.map((question) => question._id.toString())
    );

    for (const questionId of submitted.keys()) {
      if (!allowedQuestionIds.has(questionId)) {
        return res.status(400).json({
          message: "An answer refers to a question outside this form.",
        });
      }
    }

    for (const question of form.questions) {
      const questionId = question._id.toString();
      const value = submitted.get(questionId);

      if (question.required && !hasAnswer(value)) {
        return res.status(400).json({
          message: `Please answer: ${question.title}`,
        });
      }

      if (value === undefined || value === null || value === "") {
        continue;
      }

      if (
        ["multiple-choice", "dropdown"].includes(question.type) &&
        (typeof value !== "string" ||
          !question.options.includes(value))
      ) {
        return res.status(400).json({
          message: `Invalid option for: ${question.title}`,
        });
      }

      if (
        question.type === "checkboxes" &&
        (!Array.isArray(value) ||
          !value.every((item) => question.options.includes(item)))
      ) {
        return res.status(400).json({
          message: `Invalid options for: ${question.title}`,
        });
      }

      if (
        ["short-answer", "paragraph"].includes(question.type) &&
        (typeof value !== "string" || value.length > 10000)
      ) {
        return res.status(400).json({
          message: `Invalid text for: ${question.title}`,
        });
      }

      if (question.type === "number") {
        const number = Number(value);

        if (
          (typeof value !== "number" && typeof value !== "string") ||
          String(value).trim() === "" ||
          !Number.isFinite(number)
        ) {
          return res.status(400).json({
            message: `Invalid number for: ${question.title}`,
          });
        }
      }

      // Added: rating validation.
      if (question.type === "rating") {
        const scale =
          Number(question.ratingSettings?.scale) === 10 ? 10 : 5;

        if (
          typeof value !== "number" ||
          !Number.isInteger(value) ||
          value < 1 ||
          value > scale
        ) {
          return res.status(400).json({
            message: `Choose a valid rating for: ${question.title}`,
          });
        }
      }

      // Added: validate uploaded asset IDs against this form/question.
      if (
        ["file-upload", "image-upload"].includes(question.type)
      ) {
        const assetIds = value?.assetIds;

        if (
          !value ||
          typeof value !== "object" ||
          !Array.isArray(assetIds) ||
          assetIds.length === 0
        ) {
          if (question.required) {
            return res.status(400).json({
              message: `Please upload a file for: ${question.title}`,
            });
          }

          continue;
        }

        const uploadSettings = question.fileUploadSettings ?? {};
        const maxFiles = Math.max(
          1,
          Math.min(MAX_FILES, Number(uploadSettings.maxFiles) || 1)
        );

        if (
          assetIds.length > maxFiles ||
          assetIds.some(
            (assetId) =>
              typeof assetId !== "string" || !assetId.trim()
          ) ||
          new Set(assetIds).size !== assetIds.length
        ) {
          return res.status(400).json({
            message: `Invalid uploaded files for: ${question.title}`,
          });
        }

        const expectedFolder = uploadFolder(form._id, question._id);

        for (const assetId of assetIds) {
          const file = await imagekit.getFileDetails(assetId);

          const actualPath = String(file.filePath || "").replace(
            /\/+$/,
            ""
          );
          const expectedPath = expectedFolder.replace(/\/+$/, "");

          if (
            actualPath !== expectedPath &&
            !actualPath.startsWith(`${expectedPath}/`)
          ) {
            return res.status(400).json({
              message: `An uploaded file does not belong to: ${question.title}`,
            });
          }

          if (
            question.type === "image-upload" &&
            !String(file.fileType || "").toLowerCase().includes("image")
          ) {
            return res.status(400).json({
              message: `Only images are allowed for: ${question.title}`,
            });
          }
        }

        // Save a predictable answer shape.
        submitted.set(questionId, { assetIds });
      }
    }

    const response = await Response.create({
      form: form._id,
      respondent: req.user?._id ?? null,
      respondentEmail: normalizedEmail,
      answers: form.questions
        .filter((question) =>
          submitted.has(question._id.toString())
        )
        .map((question) => ({
          questionId: question._id,
          value: submitted.get(question._id.toString()),
        })),
    });

    if (sendCopy && receiptEmail) {
      try {
        const html = responseEmailTemplate({
          form,
          answers: response.answers,
          submittedAt: response.createdAt,
        });

        await transporter.sendMail({
          from: process.env.SMTP_FROM,
          to: receiptEmail,
          subject: `Your response copy — ${form.title || "Formly form"}`,
          html,
        });
      } catch (emailError) {
        console.error(
          "Response receipt email failed:",
          emailError.message
        );
      }
    }

    // Notify the owner after saving the response.
    try {
      const io = getIO();

      const total = await Response.countDocuments({
        form: form._id,
      });

      io.to(`user:${form.owner.toString()}`).emit("response:new", {
        formId: form._id.toString(),
        responseId: response._id.toString(),
        createdAt: response.createdAt,
        total,
      });
    } catch (socketError) {
      console.error(
        "Failed to send response notification:",
        socketError.message
      );
    }

    return res.status(201).json({
      message: "Your response has been submitted.",
      responseId: response._id,
    });
  } catch (error) {
    next(error);
  }
};

export const getFormResponses = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.formId)) {
      return res.status(404).json({
        message: "Form not found.",
      });
    }

    const form = await Form.findOne({
      _id: req.params.formId,
      owner: req.user._id,
    });

    if (!form) {
      return res.status(404).json({
        message: "Form not found.",
      });
    }

    const responses = await Response.find({
      form: form._id,
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      total: responses.length,
      responses,
    });
  } catch (error) {
    next(error);
  }
};


export const openResponseFile = async (req, res, next) => {
  try {
    const { formId, fileId } = req.params;

    if (!mongoose.isValidObjectId(formId) || !fileId) {
      return res.status(400).json({
        message: "Invalid form or file ID.",
      });
    }

    // Only the owner of this form can access its uploaded files.
    const form = await Form.findOne({
      _id: formId,
      owner: req.user._id,
    }).select("_id");

    if (!form) {
      return res.status(404).json({
        message: "Form or file not found.",
      });
    }

    // Ensure this file ID was actually submitted in a response
    // belonging to this form.
    const responses = await Response.find({
      form: form._id,
    })
      .select("answers")
      .lean();

    const fileBelongsToResponse = responses.some((response) =>
      response.answers.some((answer) =>
        Array.isArray(answer.value?.assetIds) &&
        answer.value.assetIds.includes(fileId)
      )
    );

    if (!fileBelongsToResponse) {
      return res.status(404).json({
        message: "File not found.",
      });
    }

    // Verify the file belongs to this form's upload folder.
    const file = await imagekit.getFileDetails(fileId);

    const expectedFolder = `/formly/responses/${form._id}/`;
    const actualPath = String(file.filePath || "");

    if (!actualPath.startsWith(expectedFolder)) {
      return res.status(404).json({
        message: "File not found.",
      });
    }

    // Generate a short-lived URL for the private ImageKit file.
    const signedUrl = imagekit.url({
      path: actualPath,
      signed: true,
      expireSeconds: 60,
    });

    return res.redirect(302, signedUrl);
  } catch (error) {
    next(error);
  }
};
