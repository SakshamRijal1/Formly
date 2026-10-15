
import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    "X-Requested-With": "formly",
  },
});

export const getErrorMessage = (error) =>
  error.response?.data?.message || "Something went wrong. Please try again.";
