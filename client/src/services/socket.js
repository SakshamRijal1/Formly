
import { io } from "socket.io-client";

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "https://formly-x8f0.onrender.com/api"
).replace(/\/+$/, "");

// Socket.IO connects to the backend root, not /api.
const SOCKET_URL = API_URL.replace(/\/api$/, "");

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
  transports: ["polling", "websocket"],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});

socket.on("connect_error", (error) => {
  if (import.meta.env.DEV) {
    console.error("[Socket] Connection error:", error.message);
  }
});
