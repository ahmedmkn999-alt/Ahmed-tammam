// middleware.js
import { NextResponse } from "next/server";

const PROTECTED_ROUTES = ["/courses"];
const AUTH_ROUTES = ["/login", "/register"];
const BLOCKED_IPS = [];

export function middleware(request) {
  const { pathname, url } = request.nextUrl;

  // ===== طبقة 1: IP Blocking =====
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ||
             request.headers.get("x-real-ip") || "unknown";

  if (BLOCKED_IPS.includes(ip)) {
    return new NextResponse("Access Denied", { status: 403 });
  }

  // ===== طبقة 2: Security Headers =====
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

  // ===== طبقة 3: Auth Protection =====
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

  // صفحة محمية وغير مسجل → login
  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL("/login", url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // صفحة login/register وهو مسجل → courses
  const isAuthPage = AUTH_ROUTES.some((r) => pathname.startsWith(r));
  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/courses", url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg).*)",
  ],
};
