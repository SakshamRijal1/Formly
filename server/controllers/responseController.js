
import mongoose from "mongoose";
import Form from "../models/Form.js";
import Response from "../models/Response.js";
import { getIO } from "../config/socket.js";
import { responseEmailTemplate } from "../utils/responseEmailTemplate.js";
import transporter from "../config/mail.js";


const hasAnswer = (value) => {
  if (Array.isArray(value)) return value.length > 0;
  if (value === null || value === undefined) return false;
  return String(value).trim().length > 0;
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
// Email a copy after the response has been saved.


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

    // LIMIT TO ONE RESPONSE PER EMAIL
    // This check applies when both settings are enabled.
  
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

      submitted.set(questionId, answer.value);
    }

    const allowedQuestionIds = new Set(
      form.questions.map((q) => q._id.toString())
    );

    for (const questionId of submitted.keys()) {
      if (!allowedQuestionIds.has(questionId)) {
        return res.status(400).json({
          message: "An answer refers to a question outside this form.",
        });
      }
    }

    for (const question of form.questions) {
      const value = submitted.get(question._id.toString());

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
    }

    const response = await Response.create({
      form: form._id,
      respondentEmail: normalizedEmail,
      answers: form.questions
        .filter((q) => submitted.has(q._id.toString()))
        .map((q) => ({
          questionId: q._id,
          value: submitted.get(q._id.toString()),
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
    // Do not undo a successful form submission if email delivery fails.
    console.error("Response receipt email failed:", emailError.message);
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
