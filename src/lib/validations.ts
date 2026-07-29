import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(8, "At least 8 characters")
  .regex(/[a-z]/, "One lowercase letter")
  .regex(/[A-Z]/, "One uppercase letter")
  .regex(/[0-9]/, "One number")
  .regex(/[^A-Za-z0-9]/, "One special character");

export const registerSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required").max(50),
    lastName: z.string().trim().min(1, "Last name is required").max(50),
    email: z.string().trim().toLowerCase().email("Enter a valid email"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional().default(true),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const onboardingSchema = z.object({
  experienceLevel: z.enum(["BEGINNER", "INTERMEDIATE", "PROFESSIONAL"]),
  tradingStyle: z.enum([
    "SCALPING",
    "DAY_TRADING",
    "SWING_TRADING",
    "POSITION_TRADING",
  ]),
  favoritePairs: z.array(z.string()).min(1, "Pick at least one pair"),
  themePreference: z.enum(["DARK", "LIGHT", "SYSTEM"]),
});

export const profileSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(50),
  lastName: z.string().trim().min(1, "Last name is required").max(50),
  avatar: z.string().url("Enter a valid URL").or(z.literal("")).optional(),
});

export const preferencesSchema = z.object({
  experienceLevel: z
    .enum(["BEGINNER", "INTERMEDIATE", "PROFESSIONAL"])
    .optional(),
  tradingStyle: z
    .enum(["SCALPING", "DAY_TRADING", "SWING_TRADING", "POSITION_TRADING"])
    .optional(),
  favoritePairs: z.array(z.string()).optional(),
  themePreference: z.enum(["DARK", "LIGHT", "SYSTEM"]).optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
