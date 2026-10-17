
import jwt from "jsonwebtoken";

export const generateToken = (userId) =>
  jwt.sign(
    { userId: userId.toString() },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

const cookieOptions = () => {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
};

export const setAuthCookie = (res, token) => {
  res.cookie("formly_token", token, cookieOptions());
};

export const clearAuthCookie = (res) => {
  const { maxAge, ...options } = cookieOptions();

  res.clearCookie("formly_token", options);
};
