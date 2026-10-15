
import mongoose from "mongoose";

const uploadAssetSchema = new mongoose.Schema(
  {
    form: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Form",
      required: true,
      index: true,
    },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    fileId: { type: String, required: true },
    url: { type: String, required: true },
    name: { type: String, required: true, maxlength: 255 },
    mimeType: { type: String, required: true, maxlength: 150 },
    size: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "attached"],
      default: "pending",
      index: true,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
      index: { expires: 0 },
    },
  },
  { timestamps: true }
);

export default mongoose.model("UploadAsset", uploadAssetSchema);
