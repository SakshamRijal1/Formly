
import axios from "axios";

export const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL,
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