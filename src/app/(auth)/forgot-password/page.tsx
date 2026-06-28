import type { Metadata } from "next";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = {
  title: "Forgot password · 4RexVision AI",
};

export default function ForgotPasswordPage() {
  return <ForgotForm />;
}
