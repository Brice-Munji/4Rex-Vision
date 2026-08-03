import NextAuth from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { authConfig } from "@/auth.config";
import { isSuperAdminEmail } from "@/lib/admin/roles";

// Edge-safe auth instance (no Prisma) for route protection.
const { auth } = NextAuth(authConfig);

const FORBIDDEN_HTML = `<!doctype html><html><head><meta charset="utf-8"><title>403 — Forbidden</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{height:100%;margin:0}body{display:flex;align-items:center;justify-content:center;background:#050505;color:#f5f5f5;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif}.b{text-align:center;max-width:26rem;padding:2rem}.c{font-size:.75rem;letter-spacing:.2em;color:#3b82f6;text-transform:uppercase}h1{font-size:3rem;margin:.5rem 0 0}p{color:#a3a3a3;margin:.75rem 0 1.5rem;line-height:1.5}a{display:inline-block;padding:.6rem 1.1rem;border-radius:.75rem;background:#111;border:1px solid #1f1f1f;color:#f5f5f5;text-decoration:none;font-size:.875rem}</style></head><body><div class="b"><div class="c">Owner Command Center</div><h1>403</h1><p>You don't have permission to access this area. This dashboard is restricted to the platform owner.</p><a href="/dashboard">Return to dashboard</a></div></body></html>`;

function forbidden(): NextResponse {
  return new NextResponse(FORBIDDEN_HTML, {
    status: 403,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

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
  "/growth",
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

  // Super-admin area: owner-only. Anonymous → login; authenticated non-admins
  // → hard 403. (API routes enforce the same rule server-side with a DB check.)
  if (path.startsWith("/super-admin")) {
    if (!isLoggedIn) {
      const callbackUrl = encodeURIComponent(path + nextUrl.search);
      return redirectTo(`/login?callbackUrl=${callbackUrl}`);
    }
    const isAdmin =
      req.auth?.user?.role === "SUPER_ADMIN" ||
      isSuperAdminEmail(req.auth?.user?.email);
    if (!isAdmin) return forbidden();
    return NextResponse.next();
  }

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
