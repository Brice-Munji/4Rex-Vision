import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "4RexVision AI — See Beyond the Charts.",
  description:
    "Transform trading screenshots into intelligent market analysis using AI-powered chart vision, technical analysis and economic intelligence.",
  keywords: [
    "AI trading",
    "chart analysis",
    "forex",
    "technical analysis",
    "market intelligence",
    "trading journal",
  ],
  openGraph: {
    title: "4RexVision AI — See Beyond the Charts.",
    description:
      "Transform trading screenshots into intelligent market analysis using AI-powered chart vision.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
