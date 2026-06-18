// app/api/login/route.js
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { createHash } from "crypto";

function hashPassword(password) {
  const salt = process.env.PASSWORD_SALT || "ahmed-tammam-platform-salt-2024";
  return createHash("sha256").update(password + salt).digest("hex");
}

export async function POST(request) {
  try {
    const { password } = await request.json();
    if (!password) {
      return NextResponse.json({ error: "كلمة السر مطلوبة" }, { status: 400 });
    }
    const hashed = hashPassword(password);
    return NextResponse.json({ hashedPassword: hashed });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
