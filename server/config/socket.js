
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import Form from "../models/Form.js";

let io;

// Parse cookies without depending on the cookie package.
const parseCookies = (rawCookie = "") => {
  return Object.fromEntries(
    rawCookie
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");

        if (index === -1) return [part, ""];

        const name = part.slice(0, index);
        const value = part.slice(index + 1);

        try {
          return [name, decodeURIComponent(value)];
        } catch {
          return [name, value];
        }
      })
  );
};

export const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const rawCookie = socket.handshake.headers.cookie || "";
      const cookies = parseCookies(rawCookie);
      const token = cookies.formly_token;

      if (!token) {
        return next(new Error("Authentication required."));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select("_id");

      if (!user) {
        return next(new Error("User account not found."));
      }

      socket.data.userId = user._id.toString();
      next();
    } catch (error) {
      console.error("Socket authentication failed:", error.message);
      next(new Error("Invalid or expired session."));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId;

    socket.join(`user:${userId}`);
    console.log(`Authenticated socket connected: ${socket.id}`);

    socket.on("form:join", async (payload, callback) => {
      const reply = typeof callback === "function" ? callback : () => {};

      try {
        const formId = payload?.formId;

        if (!mongoose.isValidObjectId(formId)) {
          return reply({ ok: false, message: "Invalid form ID." });
        }

        const form = await Form.findOne({
          _id: formId,
          owner: userId,
        }).select("_id");

        if (!form) {
          return reply({
            ok: false,
            message: "You are not authorized to edit this form.",
          });
        }

        await socket.join(`form:${formId}`);
        reply({ ok: true });
      } catch (error) {
        console.error("Failed to join form room:", error.message);
        reply({ ok: false, message: "Unable to join form room." });
      }
    });

    socket.on("form:leave", (payload) => {
      const formId = payload?.formId;

      if (mongoose.isValidObjectId(formId)) {
        socket.leave(`form:${formId}`);
      }
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO has not been initialized.");
  }

  return io;
};