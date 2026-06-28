import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

// Edge-safe auth instance (no Prisma) for route protection.
const { auth } = NextAuth(authConfig);

const PROTECTED_PREFIXES = ["/dashboard", "/profile", "/onboarding", "/billing", "/settings"];
const AUTH_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password"];

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth?.user;
  const onboardingComplete = req.auth?.user?.onboardingComplete;
  const path = nextUrl.pathname;

  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));
  const isAuthRoute = AUTH_ROUTES.some((p) => path.startsWith(p));

  // Block unauthenticated access to protected areas.
  if (isProtected && !isLoggedIn) {
    const callbackUrl = encodeURIComponent(path + nextUrl.search);
    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${callbackUrl}`, nextUrl)
    );
  }

  // Logged-in users shouldn't see auth pages.
  if (isAuthRoute && isLoggedIn) {
    const dest = onboardingComplete ? "/dashboard" : "/onboarding";
    return NextResponse.redirect(new URL(dest, nextUrl));
  }

  // Force onboarding completion before using the app.
  if (
    isLoggedIn &&
    !onboardingComplete &&
    isProtected &&
    !path.startsWith("/onboarding")
  ) {
    return NextResponse.redirect(new URL("/onboarding", nextUrl));
  }

  // Finished onboarding users skip the onboarding screen.
  if (isLoggedIn && onboardingComplete && path.startsWith("/onboarding")) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
