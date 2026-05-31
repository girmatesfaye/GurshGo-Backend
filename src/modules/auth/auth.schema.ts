import { z } from "zod";

export const userRoleSchema = z.enum([
  "customer",
  "merchant",
  "driver",
  "admin",
]);

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  phone: z.string().trim().min(8, "Phone is required"),
  email: z.string().trim().email().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: userRoleSchema,
});

export const loginSchema = z.object({
  phone: z.string().trim().min(8, "Phone is required"),
  password: z.string().min(1, "Password is required"),
});

export const otpSendSchema = z.object({
  phone: z.string().trim().min(8, "Phone is required"),
});

export const otpVerifySchema = z.object({
  phone: z.string().trim().min(8, "Phone is required"),
  otp: z.string().trim().length(6, "OTP must be 6 digits"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type OtpSendInput = z.infer<typeof otpSendSchema>;
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;
