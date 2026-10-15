
import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:3000/api",
  withCredentials: true,
  headers: {
    "X-Requested-With": "formly",
  },
});

api.interceptors.request.use((config) => {
  // Let the browser generate the multipart boundary for FormData.
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
    delete config.headers["content-type"];
  }

  return config;
});

export const getErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong.";
