
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import toast from "react-hot-toast";
import { api, getErrorMessage } from "../services/api";
import { socket } from "../services/socket";

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider.");
  }

  return context;
}

const logAuth = (message, details = {}) => {
  console.info(`[Formly Auth] ${message}`, details);
};

const logAuthError = (message, error) => {
  console.error(`[Formly Auth] ${message}`, {
    status: error?.response?.status ?? "NETWORK/CORS ERROR",
    message: error?.response?.data?.message || error?.message,
  });
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore the session from the backend's HttpOnly cookie.
  const refreshUser = useCallback(async () => {
    logAuth("Checking the current session.");

    try {
      const response = await api.get("/auth/me");
      const currentUser = response.data?.user ?? null;

      setUser(currentUser);

      logAuth("Session check completed.", {
        authenticated: Boolean(currentUser),
        userId: currentUser?.id ?? currentUser?._id ?? null,
      });

      return currentUser;
    } catch (error) {
      logAuthError("Session check failed.", error);
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Check authentication once when the provider mounts.
  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      logAuth("Restoring the saved session.");

      try {
        const response = await api.get("/auth/me");

        if (!active) return;

        const currentUser = response.data?.user ?? null;
        setUser(currentUser);

        logAuth("Session restored.", {
          authenticated: Boolean(currentUser),
        });
      } catch (error) {
        if (!active) return;

        logAuthError("Could not restore the session.", error);
        setUser(null);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      active = false;
    };
  }, []);

  // Connect Socket.IO only when an authenticated user exists.
  useEffect(() => {
    if (loading || !user) {
      socket.disconnect();
      return undefined;
    }

    logAuth("Connecting authenticated socket.");

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.disconnect();
    };
  }, [user, loading]);

  // Email/password login.
  const login = useCallback(async (credentials) => {
    logAuth("Email login started.");

    try {
      const response = await api.post("/auth/login", credentials);

      // Normally the login endpoint returns { user: ... }.
      // If it does not, verify the newly created cookie session.
      let authenticatedUser = response.data?.user ?? null;

      if (!authenticatedUser) {
        logAuth("No user in login response; checking the session.");
        authenticatedUser = await refreshUser();
      }

      if (!authenticatedUser) {
        throw new Error(
          "Login returned no user and the session could not be restored."
        );
      }

      setUser(authenticatedUser);
      setLoading(false);

      logAuth("Email login succeeded.", {
        userId: authenticatedUser.id ?? authenticatedUser._id ?? null,
      });

      toast.success("Welcome back!");

      return authenticatedUser;
    } catch (error) {
      logAuthError("Email login failed.", error);
      toast.error(getErrorMessage(error));
      throw error;
    }
  }, [refreshUser]);

  // Register a local account. The user must verify their email.
  const register = useCallback(async (details) => {
    logAuth("Registration started.");

    try {
      const response = await api.post("/auth/register", details);

      logAuth("Registration request succeeded.", {
        status: response.status,
        userReturned: Boolean(response.data?.user),
      });

      toast.success("Check your email for the verification code.");

      return response.data;
    } catch (error) {
      logAuthError("Registration failed.", error);
      toast.error(getErrorMessage(error));
      throw error;
    }
  }, []);

  // Verify email. The backend should set the login cookie on success.
  const verifyEmail = useCallback(async (details) => {
    logAuth("Email verification started.");

    try {
      const response = await api.post("/auth/verify-email", details);

      let verifiedUser = response.data?.user ?? null;

      // Fallback for a backend response that omits the user object.
      if (!verifiedUser) {
        verifiedUser = await refreshUser();
      }

      if (verifiedUser) {
        setUser(verifiedUser);
        setLoading(false);
      }

      logAuth("Email verification request succeeded.", {
        authenticated: Boolean(verifiedUser),
      });

      toast.success("Email verified successfully!");

      return verifiedUser;
    } catch (error) {
      logAuthError("Email verification failed.", error);
      toast.error(getErrorMessage(error));
      throw error;
    }
  }, [refreshUser]);

  // Log out on the backend, clear local state, then return to login.
  const logout = useCallback(async () => {
    logAuth("Logout started.");

    try {
      await api.post("/auth/logout");
      toast.success("Logged out successfully.");
      logAuth("Logout request succeeded.");
    } catch (error) {
      logAuthError("Logout request failed.", error);
      toast.error(getErrorMessage(error));
    } finally {
      socket.disconnect();
      setUser(null);
      setLoading(false);
      window.location.assign("/login");
    }
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    isAuthenticated: Boolean(user),
    login,
    register,
    verifyEmail,
    logout,
    refreshUser,
    setUser,
  }), [
    user,
    loading,
    login,
    register,
    verifyEmail,
    logout,
    refreshUser,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
