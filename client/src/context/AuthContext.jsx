
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

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.user);
      console.log(data)
      return data.user;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Connect only when the user is authenticated.
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

  const login = async (credentials) => {
    const { data } = await api.post("/auth/login", credentials);
    setUser(data.user);
    toast.success("Welcome back!");
    return data.user;
  };

  const register = async (details) => {
    const { data } = await api.post("/auth/register", details);
    toast.success("Check your email for the verification code.");
    return data;
  };

  const verifyEmail = async (details) => {
    const { data } = await api.post("/auth/verify-email", details);
    setUser(data.user);
    toast.success("Email verified successfully!");
    return data.user;
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
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
