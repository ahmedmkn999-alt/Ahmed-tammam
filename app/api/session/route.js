// app/api/session/route.js
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// ✅ Firebase Admin SDK — أكثر موثوقية من REST API
function getAdminDb() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  }
  return getFirestore();
}

// POST: تسجيل جلسة جديدة عند Login
export async function POST(request) {
  try {
    const { phone, sessionId } = await request.json();
    if (!phone || !sessionId) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    const db = getAdminDb();
    await db.collection("sessions").doc(phone).set({
      sessionId,
      loginAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("SESSION POST ERROR:", e);
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
      // ✅ لو بيانات ناقصة — مش بنطرد، بنقول valid عشان نتجنب false positive
      return NextResponse.json({ valid: true });
    }

    const db = getAdminDb();
    const docSnap = await db.collection("sessions").doc(phone).get();

    // ✅ لو مفيش document — ممكن تم مسحه أو مش موجود أصلاً، مش بنطرد
    if (!docSnap.exists) {
      return NextResponse.json({ valid: true });
    }

    const storedSessionId = docSnap.data()?.sessionId;

    // ✅ بنطرد بس لو في sessionId مختلف بالتأكيد
    return NextResponse.json({ valid: storedSessionId === sessionId });
  } catch (e) {
    console.error("SESSION GET ERROR:", e);
    // ✅ أي error = نقول valid عشان نحمي المستخدم من طرد غلط
    return NextResponse.json({ valid: true });
  }
}

// DELETE: مسح الجلسة عند Logout
export async function DELETE(request) {
  try {
    const { phone } = await request.json();
    if (phone) {
      const db = getAdminDb();
      await db.collection("sessions").doc(phone).delete();
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
