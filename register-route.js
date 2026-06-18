// app/api/register/route.js
// ✅ بيعمل hash لكلمة السر على السيرفر قبل ما يحفظها
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { createHash } from "crypto";

// نستخدم SHA-256 مع salt — بدون bcrypt عشان Edge Runtime ما يدعمش native modules
// لو عندك Node.js runtime ممكن تستبدلها بـ bcrypt
function hashPassword(password) {
  const salt = process.env.PASSWORD_SALT || "ahmed-tammam-platform-salt-2024";
  return createHash("sha256").update(password + salt).digest("hex");
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { password, ...rest } = body;

    if (!password || password.length < 6) {
      return NextResponse.json({ error: "كلمة السر قصيرة جداً" }, { status: 400 });
    }

    const hashedPassword = hashPassword(password);

    // بنرجع الداتا مع الـ hash بدل كلمة السر الأصلية
    return NextResponse.json({
      ...rest,
      password: hashedPassword,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
