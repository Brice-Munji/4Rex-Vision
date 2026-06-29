import NextAuth from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { authConfig } from "@/auth.config";

// Edge-safe auth instance (no Prisma) for route protection.
const { auth } = NextAuth(authConfig);

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/profile",
  "/onboarding",
  "/billing",
  "/settings",
  "/analyze",
  "/journal",
  "/history",
  "/market",
  "/help",
];
const AUTH_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password"];

/**
 * Resolve the request's public origin.
 *
 * Behind a reverse proxy (e.g. the preview/dev proxy) `nextUrl` carries the
 * internal `http://localhost:3000` origin, so building redirects from it sends
 * the browser to localhost. Prefer the forwarded host/proto headers so absolute
 * redirects always target the host the user is actually on.
 */
function getPublicOrigin(req: NextRequest): string {
  const forwardedHost = req.headers.get("x-forwarded-host");
  const host = forwardedHost ?? req.headers.get("host");
  if (!host) return req.nextUrl.origin;
  const proto =
    req.headers.get("x-forwarded-proto") ??
    (host.includes("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth?.user;
  const onboardingComplete = req.auth?.user?.onboardingComplete;
  const path = nextUrl.pathname;

  const origin = getPublicOrigin(req);
  const redirectTo = (target: string) =>
    NextResponse.redirect(new URL(target, origin));

  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));
  const isAuthRoute = AUTH_ROUTES.some((p) => path.startsWith(p));

  // Block unauthenticated access to protected areas.
  if (isProtected && !isLoggedIn) {
    const callbackUrl = encodeURIComponent(path + nextUrl.search);
    return redirectTo(`/login?callbackUrl=${callbackUrl}`);
  }

  // Logged-in users shouldn't see auth pages.
  if (isAuthRoute && isLoggedIn) {
    return redirectTo(onboardingComplete ? "/dashboard" : "/onboarding");
  }

  // Force onboarding completion before using the app.
  if (
    isLoggedIn &&
    !onboardingComplete &&
    isProtected &&
    !path.startsWith("/onboarding")
  ) {
    return redirectTo("/onboarding");
  }

  // Finished onboarding users skip the onboarding screen.
  if (isLoggedIn && onboardingComplete && path.startsWith("/onboarding")) {
    return redirectTo("/dashboard");
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
