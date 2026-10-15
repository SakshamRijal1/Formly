import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    description: {
      type: String,
      default: "",
    },
    type: {
      type: String,
      enum: [
        "short-answer",
        "paragraph",
        "multiple-choice",
        "checkboxes",
        "dropdown",
        "date",
        "time",
        "number",
        "file-upload",
      ],
      default: "short-answer",
    },
    required: {
      type: Boolean,
      default: false,
    },
    options: {
      type: [String],
      default: [],
    },
    imageUrl: {
      type: String,
      default: "",
    },
  },
  { _id: true }
);

const formSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
      default: "Untitled form",
    },
    description: {
      type: String,
      default: "",
      maxlength: 5000,
    },
    questions: {
      type: [questionSchema],
      default: [],
    },
    theme: {
      color: { type: String, default: "#673ab7" },
      backgroundColor: { type: String, default: "#f0ebf8" },
    },
settings: {
  collectEmail: {
    type: Boolean,
    default: false,
  },
  shuffleQuestions: {
    type: Boolean,
    default: false,
  },
  limitOneResponse: {
    type: Boolean,
    default: false,
  },
    confirmationMessage: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: "Your response has been recorded.",
  },
},
    isPublished: {
      type: Boolean,
      default: false,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Form", formSchema);