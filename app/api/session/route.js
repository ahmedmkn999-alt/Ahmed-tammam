// app/api/session/route.js
// ✅ بيستخدم Firebase REST API مباشرة — مش محتاج firebase-admin
export const runtime = "nodejs";
import { NextResponse } from "next/server";

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/sessions`;

// POST: تسجيل جلسة جديدة عند Login
export async function POST(request) {
  try {
    const { phone, sessionId } = await request.json();
    if (!phone || !sessionId) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    const url = `${FIRESTORE_URL}/${encodeURIComponent(phone)}`;
    await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: {
          sessionId: { stringValue: sessionId },
          loginAt: { stringValue: new Date().toISOString() },
        },
      }),
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

    const url = `${FIRESTORE_URL}/${encodeURIComponent(phone)}`;
    const res = await fetch(url);

    if (!res.ok) {
      return NextResponse.json({ valid: false });
    }

    const data = await res.json();
    const storedSessionId = data?.fields?.sessionId?.stringValue;
    return NextResponse.json({ valid: storedSessionId === sessionId });
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
      const url = `${FIRESTORE_URL}/${encodeURIComponent(phone)}`;
      await fetch(url, { method: "DELETE" });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
  }
    
