export interface PasswordStrength {
  score: number; // 0-4
  label: string;
  color: string;
  checks: { label: string; passed: boolean }[];
}

export function getPasswordStrength(password: string): PasswordStrength {
  const checks = [
    { label: "8+ characters", passed: password.length >= 8 },
    { label: "Lowercase letter", passed: /[a-z]/.test(password) },
    { label: "Uppercase letter", passed: /[A-Z]/.test(password) },
    { label: "Number", passed: /[0-9]/.test(password) },
    { label: "Special character", passed: /[^A-Za-z0-9]/.test(password) },
  ];

  const passedCount = checks.filter((c) => c.passed).length;
  // map 0-5 passed checks to a 0-4 score
  const score = Math.min(4, Math.max(0, passedCount - 1));

  const meta = [
    { label: "Very weak", color: "bg-red-500" },
    { label: "Weak", color: "bg-orange-500" },
    { label: "Fair", color: "bg-amber-500" },
    { label: "Strong", color: "bg-lime-500" },
    { label: "Very strong", color: "bg-emerald-500" },
  ][score];

  return { score, label: meta.label, color: meta.color, checks };
}
