// middleware.js — حماية قوية متعددة الطبقات
import { NextResponse } from "next/server";

// الصفحات المحمية
const PROTECTED_ROUTES = ["/courses", "/admin"];
const AUTH_ROUTES = ["/login", "/register"];

// عناوين IP محظورة (تقدر تضيف ليها)
const BLOCKED_IPS = [];

// معدل الطلبات المسموح به (حماية من الـ brute force)
const rateLimitMap = new Map();
const RATE_LIMIT = 30; // طلب كل دقيقة
const RATE_WINDOW = 60 * 1000; // دقيقة

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  if (!record) {
    rateLimitMap.set(ip, { count: 1, start: now });
    return true;
  }
  
  if (now - record.start > RATE_WINDOW) {
    rateLimitMap.set(ip, { count: 1, start: now });
    return true;
  }
  
  if (record.count >= RATE_LIMIT) return false;
  
  record.count++;
  return true;
}

export function middleware(request) {
  const { pathname, url } = request.nextUrl;
  
  // ===== طبقة 1: IP Blocking =====
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || 
             request.headers.get("x-real-ip") || "unknown";
  
  if (BLOCKED_IPS.includes(ip)) {
    return new NextResponse("Access Denied", { status: 403 });
  }

  // ===== طبقة 2: Rate Limiting (حماية من brute force) =====
  if (AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
    if (!checkRateLimit(ip)) {
      return new NextResponse(
        JSON.stringify({ error: "كتير أوي — استنى دقيقة وحاول تاني" }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // ===== طبقة 3: Security Headers =====
  const response = NextResponse.next();
  
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https://i.postimg.cc; " +
    "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com wss://*.firebaseio.com;"
  );

  // ===== طبقة 4: Auth Protection =====
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
    loginUrl.searchParams.set("from", pathname); // يرجعله بعد الدخول
    return NextResponse.redirect(loginUrl);
  }

  // صفحة login/register وهو مسجل → courses
  const isAuthPage = AUTH_ROUTES.some((r) => pathname.startsWith(r));
  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/courses", url));
  }

  // ===== طبقة 5: Admin Protection =====
  if (pathname.startsWith("/admin")) {
    const adminCookie = request.cookies.get("admin_session")?.value;
    if (!adminCookie || adminCookie !== "verified") {
      // الأدمن لازم يدخل من لوحة التحكم
      return NextResponse.redirect(new URL("/admin", url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg).*)",
  ],
};
