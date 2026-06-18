// lib/firebase-admin.js
// ✅ Firebase Admin SDK - بيشتغل على السيرفر فقط
import { initializeApp, getApps, getApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const adminApp = getApps().length
  ? getApp()
  : initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });

export const db = getFirestore(adminApp);
