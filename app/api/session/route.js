// app/api/session/route.js
// ✅ بيتحكم في الجلسات — جهاز واحد بس في نفس الوقت
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";

// POST: تسجيل جلسة جديدة عند Login
export async function POST(request) {
  try {
    const { phone, sessionId } = await request.json();
    if (!phone || !sessionId) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }
    await db.collection("sessions").doc(phone).set({
      sessionId,
      loginAt: new Date().toISOString(),
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// GET: التحقق إن الجلسة الحالية صحيحة
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");
    const sessionId = searchParams.get("sessionId");
    if (!phone || !sessionId) {
      return NextResponse.json({ valid: false }, { status: 400 });
    }
    const snap = await db.collection("sessions").doc(phone).get();
    if (!snap.exists) {
      return NextResponse.json({ valid: false });
    }
    const data = snap.data();
    return NextResponse.json({ valid: data.sessionId === sessionId });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}

// DELETE: مسح الجلسة عند Logout
export async function DELETE(request) {
  try {
    const { phone } = await request.json();
    if (phone) {
      await db.collection("sessions").doc(phone).delete();
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
