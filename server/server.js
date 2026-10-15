
import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "node:http";

import connectDB from "./config/db.js";
import { initializeSocket } from "./config/socket.js";

import authRoutes from "./routes/authRoutes.js";
import formRoutes from "./routes/formRoutes.js";
import responseRoutes from "./routes/responseRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import { notFound, errorHandler } from "./middleware/error.js";

const app = express();
const httpServer = createServer(app);

app.disable("x-powered-by");

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.json({ message: "Formly API is running." });
});

app.use("/api/auth", authRoutes);
app.use("/api/forms", formRoutes);
app.use("/api/responses", responseRoutes);
app.use("/api/users", userRoutes);

app.use(notFound);
app.use(errorHandler);
const startServer = async () => {
  try {
    if (!process.env.MONGO_URI || !process.env.JWT_SECRET) {
      throw new Error("Missing required environment variables.");
    }

    await connectDB();

    initializeSocket(httpServer);

    const PORT = Number(process.env.PORT || 3000);

    httpServer.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.error(
          `Port ${PORT} is already in use. Stop the existing server or change PORT in .env.`
        );
        process.exit(1);
      }

      console.error("HTTP server error:", error);
      process.exit(1);
    });

    httpServer.listen(PORT, () => {
      console.log(`Formly API running at http://localhost:${PORT}`);
      console.log("Socket.IO initialized.");
    });
  } catch (error) {
    console.error("Failed to start Formly server:", error.message);
    process.exit(1);
  }
};

startServer();