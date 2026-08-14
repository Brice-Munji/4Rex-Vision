import type { Metadata } from "next";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Sign up · 4RexVision",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
