// middleware.js — حماية متعددة الطبقات (بدون مشاكل Vercel)
import { NextResponse } from "next/server";

// الصفحات المحمية
const PROTECTED_ROUTES = ["/courses", "/admin"];
const AUTH_ROUTES = ["/login", "/register"];

// عناوين IP محظورة
const BLOCKED_IPS = [];

export function middleware(request) {
  const { pathname, url } = request.nextUrl;

  // ===== طبقة 1: IP Blocking (بسيط، مش معتمد على الذاكرة) =====
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") || "unknown";

  if (BLOCKED_IPS.includes(ip)) {
    return new NextResponse("Access Denied", { status: 403 });
  }

  // ===== طبقة 2: Security Headers (بدون 'unsafe-inline' و 'unsafe-eval') =====
  const response = NextResponse.next();

  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  // CSP محسّنة (بدون unsafe-inline و unsafe-eval)
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; " +
    "script-src 'self' https://apis.google.com https://www.gstatic.com https://www.googletagmanager.com; " +
    "style-src 'self' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https://i.postimg.cc https://www.googletagmanager.com; " +
    "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com wss://*.firebaseio.com https://www.googletagmanager.com; " +
    "frame-src 'self' https://www.recaptcha.net https://recaptcha.google.com; " +
    "frame-ancestors 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self';"
  );

  // ===== طبقة 3: Auth Protection (Login/Register Redirect) =====
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

  // إذا زار صفحة محمية وما هو مسجل → login
  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
  if (isProtected && !isLoggedIn) {
    // لكن /admin لها معاملة خاصة (انظر الطبقة 4)
    if (pathname.startsWith("/courses")) {
      const loginUrl = new URL("/login", url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // إذا زار login/register وهو مسجل → courses
  const isAuthPage = AUTH_ROUTES.some((r) => pathname.startsWith(r));
  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/courses", url));
  }

  // ===== طبقة 4: Admin Protection (استخدام sessionStorage + check في الصفحة نفسها) =====
  // ملاحظة: الـ middleware مش الحل الأفضل للأدمن
  // الأفضل تعتمد على sessionStorage في الصفحة مع Firestore custom claims
  // لكن للآن، نتركها للصفحة نفسها بدل middleware
  if (pathname.startsWith("/admin")) {
    // لو ما هو مسجل زي ما هو، بيروح للصفحة نفسها وتتعامل مع Authentication
    // هذا أفضل من infinite redirect
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg|.*\\.webp).*)",
  ],
};
