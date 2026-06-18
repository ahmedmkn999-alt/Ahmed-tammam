// app/login/page.js
// تسجيل الدخول + نسيت كلمة السر — ملف واحد متكامل: فيه التصميم والناف بار والفوتر وكل المنطق
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

const GLOBAL_CSS = `
a { color: inherit; text-decoration: none; }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --black: #050505;
      --white: #FAFAFA;
      --teal: #00FFB3;
      --teal-glow: rgba(0, 255, 179, 0.4);
      --purple-glow: rgba(157, 0, 255, 0.2);
      --gray-900: #07080a;
      --gray-800: #121214;
      --gray-700: #1A1A1E;
      --gray-400: #A0A0A5;
      --glass: rgba(255, 255, 255, 0.02);
      --glass-border: rgba(255, 255, 255, 0.08);
    }

    html { scroll-behavior: smooth; }

    body {
      background-color: var(--black);
      color: var(--white);
      font-family: 'Cairo', 'Inter', sans-serif;
      overflow-x: hidden;
      line-height: 1.6;
    }

    /* PREMIUM CUSTOM NOTIFICATION (TOAST) */
    .custom-toast {
      position: fixed;
      top: 25px;
      left: 50%;
      transform: translateX(-50%) translateY(-40px);
      background: rgba(10, 10, 12, 0.85);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--teal);
      box-shadow: 0 15px 40px rgba(0, 255, 179, 0.25), inset 0 1px 0 rgba(255,255,255,0.1);
      padding: 1rem 2.5rem;
      border-radius: 16px;
      color: var(--white);
      font-weight: 700;
      font-size: 1.05rem;
      z-index: 2000;
      opacity: 0;
      pointer-events: none;
      transition: all 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.2);
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .custom-toast.show {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
      pointer-events: auto;
    }

    /* BACKGROUND BIOLOGY ANIMATIONS */
    .bio-bg {
      position: fixed;
      inset: 0;
      z-index: 1;
      pointer-events: none;
      overflow: hidden;
    }
    .cell-element {
      position: absolute;
      border: 2px solid rgba(0, 255, 179, 0.1);
      border-radius: 50%;
      background: rgba(0, 255, 179, 0.01);
      animation: floatCell 12s infinite ease-in-out;
    }
    .cell-1 { width: 120px; height: 120px; top: 15%; right: 5%; animation-duration: 14s; }
    .cell-2 { width: 80px; height: 80px; top: 60%; left: 8%; animation-duration: 18s; animation-delay: 2s; }
    .cell-3 { width: 150px; height: 150px; bottom: 10%; right: 12%; animation-duration: 22s; }
    
    .cell-element::before {
      content: '';
      position: absolute;
      width: 15px; height: 15px;
      background: var(--teal);
      border-radius: 50%;
      top: 40%; left: 40%;
      box-shadow: 0 0 10px var(--teal);
      opacity: 0.6;
    }

    @keyframes floatCell {
      0%, 100% { transform: translateY(0) rotate(0deg) scale(1); }
      50% { transform: translateY(-30px) rotate(180deg) scale(1.05); }
    }

    /* NAVBAR */
    nav {
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 100;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.2rem 4rem;
      background: rgba(5, 5, 5, 0.75);
      backdrop-filter: blur(20px);
      border-bottom: 1px solid var(--glass-border);
    }
    .nav-logo {
      font-size: 1.4rem;
      font-weight: 900;
      color: var(--white);
      font-family: 'Inter', sans-serif;
      letter-spacing: -0.5px;
      cursor: pointer;
    }
    .nav-logo span { color: var(--teal); text-shadow: 0 0 15px var(--teal-glow); }
    
    .nav-auth-buttons {
      display: flex;
      gap: 1rem;
      direction: ltr;
    }
    .btn-login {
      background: transparent;
      color: var(--white);
      border: 1px solid var(--glass-border);
      padding: 0.6rem 1.4rem;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      font-family: 'Cairo', sans-serif;
      transition: all 0.3s;
    }
    .btn-login:hover {
      background: rgba(255,255,255,0.05);
      border-color: var(--white);
    }
    .btn-register {
      background: linear-gradient(135deg, var(--teal), #00b3ff);
      color: var(--black);
      border: none;
      padding: 0.6rem 1.4rem;
      border-radius: 8px;
      font-weight: 700;
      cursor: pointer;
      font-family: 'Cairo', sans-serif;
      box-shadow: 0 4px 15px var(--teal-glow);
      transition: all 0.3s;
    }
    .btn-register:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 25px var(--teal-glow);
    }

    /* HERO SECTION */
    .hero {
      min-height: 100vh;
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      align-items: center;
      padding: 8rem 4rem 4rem;
      position: relative;
      z-index: 2;
    }
    
    .hero-text { position: relative; }
    
    .subject-title {
      font-size: clamp(1.5rem, 2.5vw, 2.5rem);
      font-weight: 900;
      color: var(--white);
      margin-bottom: 0.5rem;
      font-family: 'Inter', 'Cairo', sans-serif;
    }
    .subject-title span {
      background: linear-gradient(90deg, var(--teal), #00e1ff);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .platform-punchline {
      font-size: 1.1rem;
      font-weight: 700;
      color: #ffd700;
      margin-bottom: 2rem;
      text-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
      display: inline-block;
      background: rgba(255, 215, 0, 0.05);
      padding: 0.4rem 1.2rem;
      border-radius: 50px;
      border: 1px solid rgba(255, 215, 0, 0.2);
    }

    .teacher-title-hq {
      font-size: clamp(1.8rem, 3.5vw, 3.2rem);
      font-weight: 900;
      color: var(--white);
      line-height: 1.3;
      margin-bottom: 1.5rem;
    }
    
    .hero-desc {
      font-size: 1.1rem;
      color: var(--gray-400);
      max-width: 550px;
      margin-bottom: 2rem;
      line-height: 1.8;
    }

    /* HERO IMAGE ANIMATION */
    .hero-image-wrapper {
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .dna-animation {
      position: absolute;
      width: 100%;
      height: 100%;
      background: radial-gradient(circle, var(--purple-glow) 0%, transparent 70%);
      pointer-events: none;
    }
    .teacher-frame {
      width: 360px;
      height: 480px;
      border-radius: 30px;
      overflow: hidden;
      border: 2px solid rgba(0, 255, 179, 0.3);
      box-shadow: 0 0 50px rgba(0, 255, 179, 0.15), 0 20px 50px rgba(0,0,0,0.8);
      animation: premiumFloat 6s ease-in-out infinite;
      background: #111;
    }
    @keyframes premiumFloat {
      0%, 100% { transform: translateY(0) scale(1); }
      50% { transform: translateY(-15px) scale(1.02); }
    }
    .teacher-frame img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    /* GLASS CONTAINERS SECTION */
    .glass-section {
      padding: 4rem 4rem 8rem;
      position: relative;
      z-index: 2;
      max-width: 900px;
      margin: 0 auto;
    }
    .glass-container-stack {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .glass-card {
      background: var(--glass);
      backdrop-filter: blur(15px);
      -webkit-backdrop-filter: blur(15px);
      border: 1px solid var(--glass-border);
      border-radius: 20px;
      padding: 2rem;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
    }
    .glass-card::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at var(--x, 50%) var(--y, 50%), rgba(0, 255, 179, 0.15) 0%, transparent 50%);
      opacity: 0;
      transition: opacity 0.3s;
    }
    .glass-card:hover {
      transform: translateY(-5px);
      border-color: var(--teal);
      box-shadow: 0 10px 40px rgba(0, 255, 179, 0.12);
      background: rgba(255, 255, 255, 0.04);
    }
    .glass-card:hover::before { opacity: 1; }
    .glass-card h3 { font-size: 1.25rem; color: var(--teal); margin-bottom: 0.6rem; font-weight: 700; }
    .glass-card p { color: #D1D1D6; font-size: 0.98rem; line-height: 1.7; }

    /* AUTH FORMS PAGES STYLING */
    .auth-page-wrapper {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 6rem 2rem 4rem;
      position: relative;
      z-index: 10;
    }
    .auth-card {
      background: rgba(255, 255, 255, 0.01);
      backdrop-filter: blur(25px);
      -webkit-backdrop-filter: blur(25px);
      border: 1px solid var(--glass-border);
      width: 100%;
      max-width: 650px;
      border-radius: 24px;
      padding: 2.5rem;
      box-shadow: 0 20px 50px rgba(0,0,0,0.6);
    }
    .auth-card-small { max-width: 450px; }
    
    .auth-header { text-align: center; margin-bottom: 2rem; }
    .auth-header h2 { font-size: 2rem; font-weight: 900; margin-bottom: 0.5rem; }
    .auth-header p { color: var(--gray-400); font-size: 0.95rem; font-weight: 600; }
    
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.2rem; }
    .form-grid-three { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; }
    @media (max-width: 600px) { 
      .form-grid, .form-grid-three { grid-template-columns: 1fr; } 
    }
    
    .form-group { margin-bottom: 1.2rem; display: flex; flex-direction: column; gap: 0.5rem; }
    .form-group label { font-size: 0.9rem; font-weight: 700; color: #E5E5EA; text-align: right; }
    .form-group label span { color: var(--teal); }
    
    /* INPUT WITH EYE CONTAINER */
    .password-input-container {
      position: relative;
      display: flex;
      align-items: center;
    }
    .password-input-container input {
      width: 100%;
      padding-left: 3rem !important;
    }
    .toggle-password-btn {
      position: absolute;
      left: 12px;
      background: none;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--gray-400);
      transition: color 0.2s;
    }
    .toggle-password-btn:hover { color: var(--teal); }
    .toggle-password-btn svg {
      width: 20px; height: 20px;
      fill: none; stroke: currentColor; stroke-width: 2;
      stroke-linecap: round; stroke-linejoin: round;
    }

    .form-group input {
      background: var(--gray-800);
      border: 1px solid var(--glass-border);
      padding: 0.85rem 1rem;
      border-radius: 12px;
      color: var(--white);
      font-family: 'Cairo', sans-serif;
      font-size: 0.9rem;
      outline: none;
      transition: all 0.3s;
    }
    .form-group input:focus { border-color: var(--teal); box-shadow: 0 0 10px rgba(0, 255, 179, 0.2); }
    
    .btn-submit-form {
      width: 100%;
      background: linear-gradient(135deg, var(--teal), #00b3ff);
      color: var(--black);
      border: none;
      padding: 0.95rem;
      border-radius: 12px;
      font-weight: 900;
      font-size: 1rem;
      cursor: pointer;
      font-family: 'Cairo', sans-serif;
      box-shadow: 0 4px 20px var(--teal-glow);
      transition: all 0.3s;
      margin-top: 1rem;
    }
    .btn-submit-form:hover { transform: translateY(-2px); box-shadow: 0 6px 30px var(--teal-glow); }
    
    .auth-switch-text { text-align: center; margin-top: 1.5rem; font-size: 0.9rem; color: var(--gray-400); }
    .auth-switch-text span { color: var(--teal); font-weight: 700; cursor: pointer; text-decoration: underline; margin-right: 0.3rem; }

    /* PREMIUM FOOTER */
    .premium-footer {
      background: #040507;
      padding: 5rem 2rem 3rem;
      border-top: 1px solid rgba(255, 255, 255, 0.03);
      text-align: center;
      position: relative;
      z-index: 5;
    }
    .society-brand {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.6rem;
      margin-bottom: 3.5rem;
    }
    .society-icon { color: #bbf7d0; display: flex; align-items: center; }
    .society-icon svg { width: 24px; height: 24px; }
    .society-main-title { font-family: 'Inter', sans-serif; font-size: 1.75rem; font-weight: 800; color: #FAFAFA; letter-spacing: -0.5px; }
    .society-sub-title { font-family: 'Inter', sans-serif; font-size: 0.85rem; font-weight: 600; color: #85a5ff; letter-spacing: 1.5px; }
    
    .developer-row { display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-family: 'Inter', sans-serif; font-size: 0.88rem; color: #6366f1; margin-bottom: 0.8rem; }
    .dev-by { color: #4e5154; }
    .dev-badge { background: #11141a; border: 1px solid #1f242e; padding: 0.25rem 0.8rem; border-radius: 6px; color: #ffffff; font-weight: 700; display: inline-flex; align-items: center; gap: 0.3rem; }
    .dev-divider { color: #1f242e; margin: 0 0.4rem; }
    .rights-text { font-family: 'Inter', sans-serif; font-size: 0.82rem; color: #4e5154; margin-bottom: 2.5rem; letter-spacing: 0.5px; }
    .powered-by-box { display: flex; flex-direction: column; gap: 0.3rem; }
    .powered-label { font-family: 'Inter', sans-serif; font-size: 0.65rem; font-weight: 700; color: #3d4147; letter-spacing: 2px; }
    .powered-brand { font-family: 'Inter', sans-serif; font-size: 1rem; font-weight: 900; color: #6e7582; letter-spacing: 4px; }

    @media (max-width: 900px) {
      nav { padding: 1rem 1.5rem; }
      .hero { grid-template-columns: 1fr; padding: 7rem 1.5rem 2rem; text-align: center; }
      .hero-desc { margin: 0 auto 2rem; }
      .hero-image-wrapper { order: -1; margin-bottom: 2rem; }
      .teacher-frame { width: 280px; height: 380px; }
      .glass-section { padding: 2rem 1.5rem 5rem; }
    }
  </style>

`;

// تحويل رقم مصري محلي (01xxxxxxxxx) إلى الصيغة الدولية المطلوبة لإرسال SMS (+20...)
function toE164(localPhone) {
  let p = localPhone.trim();
  if (p.startsWith("+")) return p;
  if (p.startsWith("0")) p = p.slice(1);
  return "+20" + p;
}

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

const EyeOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
    <line x1="1" y1="1" x2="23" y2="23"></line>
  </svg>
);

function Toast({ show, message, icon }) {
  return (
    <div className={`custom-toast ${show ? "show" : ""}`}>
      <span>{icon}</span>
      <span>{message}</span>
    </div>
  );
}

function Nav({ user, onLogout }) {
  return (
    <nav>
      <Link href="/" className="nav-logo">
        Dr. Ahmed <span>Tammam</span>
      </Link>
      <div className="nav-auth-buttons">
        {user ? (
          <>
            <span style={{ color: "#00FFB3", fontWeight: 700, fontSize: "0.95rem" }}>
              مرحباً {user.firstName} 🔬
            </span>
            <button className="btn-login" onClick={onLogout}>
              تسجيل الخروج
            </button>
          </>
        ) : (
          <>
            <Link href="/login">
              <button className="btn-login">تسجيل الدخول</button>
            </Link>
            <Link href="/register">
              <button className="btn-register">إنشاء حساب</button>
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="premium-footer">
      <div className="society-brand">
        <div className="society-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <div className="society-main-title">
          Tammam <span className="society-sub-title">SOCIETY</span>
        </div>
      </div>

      <div className="developer-row">
        <span className="dev-by">&lt; Developed By</span>
        <div className="dev-badge">Ahmed & Elgizawy 👑</div>
        <span>/&gt;</span>
        <span className="dev-divider">|</span>
      </div>

      <div className="rights-text">All Rights Reserved @2026</div>

      <div className="powered-by-box">
        <div className="powered-label">POWERED BY</div>
        <div className="powered-brand">GIZA-TECH</div>
      </div>
    </footer>
  );
}

export default function LoginPage() {
  const router = useRouter();

  const [toast, setToast] = useState({ show: false, message: "", icon: "✨" });
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  function showToast(message, icon = "✨") {
    setToast({ show: true, message, icon });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 3500);
  }

  useEffect(() => {
    const saved = localStorage.getItem("currentUser");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setUser(parsed);
        router.replace("/courses");
        return;
      } catch (e) {
        localStorage.removeItem("currentUser");
      }
    }
    setChecking(false);
  }, []);

  function handleLogout() {
    localStorage.removeItem("currentUser");
    document.cookie = "currentUser=; path=/; max-age=0";
    setUser(null);
    showToast("تم تسجيل الخروج بنجاح", "👋");
  }

  // بيانات تسجيل الدخول العادي
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // حالات تدفق "نسيت كلمة السر": login -> forgot-phone -> forgot-otp -> forgot-reset
  const [mode, setMode] = useState("login");
  const [resetPhone, setResetPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const confirmationResultRef = useRef(null);
  const recaptchaVerifierRef = useRef(null);

  // ----- تسجيل الدخول العادي -----
  async function handleLogin(e) {
    e.preventDefault();
    try {
      const userRef = doc(db, "students", phone.trim());
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        showToast("هذا الرقم غير مسجل لدينا.", "❌");
        return;
      }

      const userData = userSnap.data();
      if (userData.password !== password) {
        showToast("كلمة السر التي أدخلتها غير صحيحة.", "❌");
        return;
      }

      const userObj = {
        phone: phone.trim(),
        firstName: userData.firstName,
        fullName: userData.fullName,
        studentPhone: phone.trim(),
        fatherPhone: userData.fatherPhone || "",
        motherPhone: userData.motherPhone || "",
        nationalID: userData.nationalID || "",
      };
      localStorage.setItem("currentUser", JSON.stringify(userObj));
      // حط cookie عشان الـ middleware يشتغل
      document.cookie = `currentUser=${JSON.stringify(userObj)}; path=/; max-age=2592000; SameSite=Lax`;
      setUser(userObj);

      showToast("مرحباً بك مجدداً يا بطل ⚡", "🔓");
      setTimeout(() => router.push("/courses"), 1000);
    } catch (error) {
      console.error("Error: ", error);
      showToast("حدث خطأ أثناء جلب البيانات.", "❌");
    }
  }

  // ----- الخطوة 1: إرسال كود التحقق برسالة SMS حقيقية -----
  async function handleSendCode(e) {
    e.preventDefault();
    if (!resetPhone.trim()) return;
    setLoading(true);
    try {
      const userRef = doc(db, "students", resetPhone.trim());
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        showToast("هذا الرقم غير مسجل لدينا.", "❌");
        setLoading(false);
        return;
      }

      if (!recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current = new RecaptchaVerifier(auth, "recaptcha-container", {
          size: "invisible",
        });
      }

      const formattedPhone = toE164(resetPhone.trim());
      const confirmationResult = await signInWithPhoneNumber(
        auth,
        formattedPhone,
        recaptchaVerifierRef.current
      );
      confirmationResultRef.current = confirmationResult;

      showToast("تم إرسال كود التحقق برسالة على رقمك 📩", "📩");
      setMode("forgot-otp");
    } catch (error) {
      console.error("Error: ", error);
      showToast("تعذر إرسال الكود، حاول مرة أخرى.", "❌");
    } finally {
      setLoading(false);
    }
  }

  // ----- الخطوة 2: تأكيد الكود -----
  async function handleVerifyCode(e) {
    e.preventDefault();
    if (!otp.trim()) return;
    setLoading(true);
    try {
      await confirmationResultRef.current.confirm(otp.trim());
      showToast("تم تأكيد الكود بنجاح ✅", "✅");
      setMode("forgot-reset");
    } catch (error) {
      console.error("Error: ", error);
      showToast("الكود غير صحيح، حاول مرة أخرى.", "❌");
    } finally {
      setLoading(false);
    }
  }

  // ----- الخطوة 3: تعيين كلمة سر جديدة -----
  async function handleResetPassword(e) {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      showToast("عذرًا، كلمتا السر غير متطابقتين!", "⚠️");
      return;
    }
    setLoading(true);
    try {
      const userRef = doc(db, "students", resetPhone.trim());
      await updateDoc(userRef, { password: newPassword });

      showToast("تم تغيير كلمة السر بنجاح 🎉", "🎉");
      setMode("login");
      setResetPhone("");
      setOtp("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error) {
      console.error("Error: ", error);
      showToast("حدث خطأ أثناء تغيير كلمة السر.", "❌");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div style={{ minHeight: "100vh", background: "#050505", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "40px", height: "40px", border: "3px solid rgba(0,255,179,0.2)", borderTop: "3px solid #00FFB3", borderRadius: "50%", animation: "spin 0.8s linear infinite" }}></div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />

      <Toast show={toast.show} message={toast.message} icon={toast.icon} />

      <div className="bio-bg">
        <div className="cell-element cell-1"></div>
        <div className="cell-element cell-2"></div>
        <div className="cell-element cell-3"></div>
      </div>

      <Nav user={user} onLogout={handleLogout} />

      <div className="auth-page-wrapper">
        <div className="auth-card auth-card-small">
          {mode === "login" && (
            <>
              <div className="auth-header">
                <h2 style={{ color: "white" }}>تسجيل الدخول</h2>
                <p>مرحباً بك في عيادة الـ Biology المتطورة</p>
              </div>

              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label>
                    رقم الهاتف <span>*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="01xxxxxxxxx"
                    style={{ direction: "ltr", textAlign: "right" }}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>
                    كلمة السر <span>*</span>
                  </label>
                  <div className="password-input-container">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button type="button" className="toggle-password-btn" onClick={() => setShowPassword((s) => !s)}>
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>

                <div style={{ textAlign: "left", marginTop: "-0.6rem", marginBottom: "1.2rem" }}>
                  <span
                    style={{ color: "var(--teal)", fontSize: "0.85rem", cursor: "pointer", fontWeight: 700 }}
                    onClick={() => setMode("forgot-phone")}
                  >
                    نسيت كلمة السر؟
                  </span>
                </div>

                <button type="submit" className="btn-submit-form">
                  دخول إلى المنصة ⚡
                </button>
              </form>

              <div className="auth-switch-text">
                مشترك جديد؟{" "}
                <Link href="/register">
                  <span>أنشئ حسابك من هنا</span>
                </Link>
              </div>
            </>
          )}

          {mode === "forgot-phone" && (
            <>
              <div className="auth-header">
                <h2 style={{ color: "white" }}>نسيت كلمة السر</h2>
                <p>أدخل رقم هاتفك المسجل لإرسال كود التحقق برسالة نصية</p>
              </div>

              <form onSubmit={handleSendCode}>
                <div className="form-group">
                  <label>
                    رقم الهاتف <span>*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="01xxxxxxxxx"
                    style={{ direction: "ltr", textAlign: "right" }}
                    value={resetPhone}
                    onChange={(e) => setResetPhone(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn-submit-form" disabled={loading}>
                  {loading ? "جاري الإرسال..." : "إرسال كود التحقق 📩"}
                </button>
              </form>

              <div className="auth-switch-text">
                <span onClick={() => setMode("login")}>الرجوع لتسجيل الدخول</span>
              </div>
            </>
          )}

          {mode === "forgot-otp" && (
            <>
              <div className="auth-header">
                <h2 style={{ color: "white" }}>أدخل كود التحقق</h2>
                <p>تم إرسال رسالة نصية تحتوي على الكود إلى رقمك</p>
              </div>

              <form onSubmit={handleVerifyCode}>
                <div className="form-group">
                  <label>
                    الكود <span>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="------"
                    style={{ direction: "ltr", textAlign: "center" }}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn-submit-form" disabled={loading}>
                  {loading ? "جاري التحقق..." : "تأكيد الكود ✅"}
                </button>
              </form>

              <div className="auth-switch-text">
                <span onClick={() => setMode("forgot-phone")}>إرسال الكود مرة أخرى</span>
              </div>
            </>
          )}

          {mode === "forgot-reset" && (
            <>
              <div className="auth-header">
                <h2 style={{ color: "white" }}>تعيين كلمة سر جديدة</h2>
                <p>اختر كلمة سر جديدة لحسابك</p>
              </div>

              <form onSubmit={handleResetPassword}>
                <div className="form-group">
                  <label>
                    كلمة السر الجديدة <span>*</span>
                  </label>
                  <div className="password-input-container">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="toggle-password-btn"
                      onClick={() => setShowNewPassword((s) => !s)}
                    >
                      {showNewPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label>
                    تأكيد كلمة السر <span>*</span>
                  </label>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn-submit-form" disabled={loading}>
                  {loading ? "جاري الحفظ..." : "تغيير كلمة السر 🎉"}
                </button>
              </form>
            </>
          )}

          <div id="recaptcha-container"></div>
        </div>
      </div>

      <Footer />
    </>
  );
}
