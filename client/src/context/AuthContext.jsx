
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import toast from "react-hot-toast";
import { api, getErrorMessage } from "../services/api";
import { socket } from "../services/socket";

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check whether the current browser has a valid login session.
  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      const currentUser = data?.user ?? null;

      setUser(currentUser);

      console.log(
        "Authentication check:",
        currentUser ? "Logged in" : "No active session"
      );

      return currentUser;
    } catch (error) {
      setUser(null);

      console.error(
        "Authentication check failed:",
        error?.response?.status ?? error.message
      );

      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Check the session when the app first loads.
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Connect the socket only for authenticated users.
  useEffect(() => {
    if (loading) return;

    if (user) {
      if (!socket.connected) {
        socket.connect();
      }
    } else {
      socket.disconnect();
    }

    return () => {
      socket.disconnect();
    };
  }, [user, loading]);

  // Log in.
  const login = async (credentials) => {
    try {
      const { data } = await api.post("/auth/login", credentials);
      const loggedInUser = data?.user ?? null;

      if (!loggedInUser) {
        throw new Error(
          "Login succeeded without returning user information. Check the backend login response."
        );
      }

      setUser(loggedInUser);
      setLoading(false);

      toast.success("Welcome back!");

      return loggedInUser;
    } catch (error) {
      toast.error(getErrorMessage(error));
      throw error;
    }
  };

  // Register a new account.
  const register = async (details) => {
    try {
      const { data } = await api.post("/auth/register", details);

      toast.success("Check your email for the verification code.");

      return data;
    } catch (error) {
      toast.error(getErrorMessage(error));
      throw error;
    }
  };

  // Verify email.
  const verifyEmail = async (details) => {
    try {
      const { data } = await api.post("/auth/verify-email", details);
      const verifiedUser = data?.user ?? null;

      if (verifiedUser) {
        setUser(verifiedUser);
        setLoading(false);
      }

      toast.success("Email verified successfully!");

      return verifiedUser;
    } catch (error) {
      toast.error(getErrorMessage(error));
      throw error;
    }
  };

  // Log out.
  const logout = async () => {
    try {
      await api.post("/auth/logout");
      toast.success("Logged out successfully.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      socket.disconnect();
      setUser(null);
      window.location.assign("/login");
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    verifyEmail,
    logout,
    refreshUser,
    setUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
