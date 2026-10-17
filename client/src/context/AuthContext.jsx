
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

  // Restore the session from the backend cookie.
  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      const currentUser = data?.user ?? null;

      setUser(currentUser);
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

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Connect the socket only for authenticated users.
  useEffect(() => {
    if (loading || !user) {
      socket.disconnect();
      return;
    }

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.disconnect();
    };
  }, [user, loading]);

  const login = async (credentials) => {
    try {
      const { data } = await api.post("/auth/login", credentials);
      const loggedInUser = data?.user ?? null;

      if (!loggedInUser) {
        await refreshUser();

        if (!user) {
          throw new Error(
            "Login response did not contain user information."
          );
        }
      }

      const authenticatedUser = loggedInUser;
      if (authenticatedUser) {
        setUser(authenticatedUser);
      }

      setLoading(false);
      toast.success("Welcome back!");

      return authenticatedUser;
    } catch (error) {
      toast.error(getErrorMessage(error));
      throw error;
    }
  };

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
