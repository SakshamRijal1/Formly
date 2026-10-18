
import axios from "axios";

const configuredURL = import.meta.env.VITE_API_URL?.trim();

const baseURL = (
  configuredURL || "https://formly-x8f0.onrender.com/api"
).replace(/\/+$/, "");

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

// Do not log passwords, OTPs, reset tokens, cookies, or JWTs.
api.interceptors.request.use(
  (config) => {
    const url = config.url || "";
    const isAuthRequest = url.includes("/auth/");
    const isFormData =
      typeof FormData !== "undefined" &&
      config.data instanceof FormData;

    // Let Axios/browser set the multipart boundary for file uploads.
    if (isFormData) {
      config.headers.delete?.("Content-Type");
      config.headers.delete?.("content-type");

      // Fallback for header objects without a delete method.
      if (config.headers && typeof config.headers.delete !== "function") {
        delete config.headers["Content-Type"];
        delete config.headers["content-type"];
      }
    }

    if (isAuthRequest) {
      console.info("[Formly API] Request:", {
        method: config.method?.toUpperCase(),
        endpoint: url,
        baseURL: config.baseURL,
        withCredentials: config.withCredentials,
      });
    }

    if (isFormData) {
      console.info("[Formly API] File upload request:", {
        endpoint: url,
        fields: [...config.data.entries()].map(([key, value]) => ({
          key,
          value:
            typeof File !== "undefined" && value instanceof File
              ? {
                  name: value.name,
                  size: value.size,
                  type: value.type,
                }
              : value,
        })),
      });
    }

    return config;
  },
  (error) => {
    console.error(
      "[Formly API] Request setup failed:",
      error.message
    );
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    if ((response.config.url || "").includes("/auth/")) {
      console.info("[Formly API] Response:", {
        endpoint: response.config.url,
        status: response.status,
        hasUser: Boolean(response.data?.user),
      });
    }

    return response;
  },
  (error) => {
    const endpoint = error.config?.url || "unknown endpoint";

    console.error("[Formly API] Request failed:", {
      endpoint,
      status: error.response?.status ?? "NETWORK/CORS ERROR",
      message:
        error.response?.data?.message ||
        error.message ||
        "Unknown request error",
    });

    return Promise.reject(error);
  }
);

// Compatibility helper used by the auth pages.
export const getErrorMessage = (error) =>
  error.response?.data?.message ||
  error.message ||
  "Something went wrong. Please try again.";
