
import multer from "multer";

const questionImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (req, file, callback) => {
    if (file.mimetype.startsWith("image/")) {
      return callback(null, true);
    }

    callback(new Error("Only image files are allowed."));
  },
});

export default questionImageUpload;
