import crypto from "crypto";

export const generateOTP = () =>
  crypto.randomInt(100000, 1000000).toString();

export const hashOTP = (otp) =>
  crypto.createHash("sha256").update(otp).digest("hex");