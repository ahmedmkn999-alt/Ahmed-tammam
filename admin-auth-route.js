// app/api/admin-auth/route.js
// ✅ الـ API Route ده بيشتغل على السيرفر فقط — مش في المتصفح
// فالـ ADMIN_PASSWORD هنا آمن ومش مكشوف للـ client

import { NextResponse } from "next/server";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now - entry.firstAttempt > WINDOW_MS) {
    attempts.set(ip, { count: 1, firstAttempt: now });
    return false;
  }
  entry.count++;
  return entry.count > MAX_ATTEMPTS;
}

export async function POST(request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many attempts. Wait 15 minutes." },
      { status: 429 }
    );
  }

  try {
    const { password } = await request.json();

    // ✅ ADMIN_PASSWORD بدون NEXT_PUBLIC → سيرفر فقط، مش في الـ bundle
    const correctPassword = process.env.ADMIN_PASSWORD;

    if (!correctPassword) {
      return NextResponse.json(
        { error: "Server misconfiguration" },
        { status: 500 }
      );
    }

    if (password !== correctPassword) {
      return NextResponse.json({ error: "Wrong password" }, { status: 401 });
    }

    // إنشاء response مع session cookie آمنة
    const response = NextResponse.json({ success: true });
    response.cookies.set("admin_session", "1", {
      httpOnly: true,       // ✅ مش قابلة للوصول من JS
      secure: process.env.NODE_ENV === "production", // ✅ HTTPS فقط في production
      sameSite: "strict",   // ✅ حماية من CSRF
      maxAge: 60 * 60 * 8,  // 8 ساعات
      path: "/admin",
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(request) {
  const response = NextResponse.json({ success: true });
  response.cookies.set("admin_session", "", {
    httpOnly: true,
    maxAge: 0,
    path: "/admin",
  });
  return response;
}
