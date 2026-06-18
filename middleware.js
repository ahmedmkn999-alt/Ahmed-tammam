// middleware.js
import { NextResponse } from "next/server";

const PROTECTED_ROUTES = ["/courses", "/lectures"];
const ADMIN_ROUTE = "/admin";
const AUTH_ROUTES = ["/login", "/register"];
const BLOCKED_IPS = [];

const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now - entry.firstAttempt > WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
    return false;
  }
  entry.count++;
  return entry.count > MAX_ATTEMPTS;
}

export function middleware(request) {
  const { pathname, url } = request.nextUrl;

  // IP Blocking
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (BLOCKED_IPS.includes(ip)) {
    return new NextResponse("Access Denied", { status: 403 });
  }

  // Rate Limiting on Login
  if (pathname.startsWith("/login") && request.method === "POST") {
    if (checkRateLimit(ip)) {
      return new NextResponse(
        JSON.stringify({ error: "Too many login attempts. Try again in 15 minutes." }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // Security Headers
  const response = NextResponse.next();
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https://i.postimg.cc; " +
    "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com wss://*.firebaseio.com;"
  );

  // Auth Check
  const userCookie = request.cookies.get("currentUser")?.value;
  let isLoggedIn = false;
  if (userCookie) {
    try {
      const parsed = JSON.parse(decodeURIComponent(userCookie));
      isLoggedIn = !!(parsed?.phone || parsed?.studentPhone);
    } catch {
      isLoggedIn = false;
    }
  }

  // Admin Route - just return with security headers (auth handled client-side via API)
  if (pathname.startsWith(ADMIN_ROUTE)) {
    return response;
  }

  // Protected routes - redirect to login if not logged in
  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL("/login", url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Auth pages - redirect to courses if already logged in
  const isAuthPage = AUTH_ROUTES.some((r) => pathname.startsWith(r));
  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/courses", url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
