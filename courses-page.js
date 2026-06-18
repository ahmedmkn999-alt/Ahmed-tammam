// app/courses/page.js
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";

export default function CoursesPage() {
  const [theme, setTheme] = useState("dark");
  const [sidebarActive, setSidebarActive] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [toast, setToast] = useState({ show: false, message: "", icon: "✨" });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalCourseTitle, setModalCourseTitle] = useState("الاشتراك في الكورس");
  const [modalCourseId, setModalCourseId] = useState("month1");
  const [activationCode, setActivationCode] = useState("");
  const [studentName, setStudentName] = useState("");
  const [inputName, setInputName] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [sessionKicked, setSessionKicked] = useState(false);

  const triggerToast = (message, icon = "✨") => {
    setToast({ show: true, message, icon });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3500);
  };

  const toggleTheme = () => {
    setTheme(t => {
      const next = t === "light" ? "dark" : "light";
      triggerToast(next === "dark" ? "تم الانتقال إلى الوضع الليلي" : "تم الانتقال إلى الوضع المضيء");
      return next;
    });
  };

  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem("currentUser");
      if (!saved) { router.replace("/login"); return; }
      const parsed = JSON.parse(saved);
      if (!parsed?.studentPhone && !parsed?.phone) { router.replace("/login"); return; }
      setCurrentUser(parsed);

      // ✅ BroadcastChannel: للطرد من tabs تانية في نفس المتصفح
      let bc = null;
      try {
        bc = new BroadcastChannel("session_channel");
        bc.onmessage = (e) => {
          // ✅ FIX: بنطرد بس لو الـ sessionId اتغير (جهاز تاني دخل)
          // لو نفس الـ sessionId — مش بنعمل حاجة
          if (e.data?.type === "SESSION_KICKED" && e.data?.sessionId !== parsed.sessionId) {
            localStorage.removeItem("currentUser");
            document.cookie = "currentUser=; path=/; max-age=0";
            setSessionKicked(true);
          }
        };
      } catch {}

      // ✅ Firestore polling: فحص كل 30 ثانية لو جهاز تاني دخل
      const phone = parsed.studentPhone || parsed.phone;
      const sessionId = parsed.sessionId;
      let interval = null;

      if (phone && sessionId) {
        let invalidCount = 0;

        async function checkSession() {
          try {
            const res = await fetch(
              `/api/session?phone=${encodeURIComponent(phone)}&sessionId=${encodeURIComponent(sessionId)}`
            );
            if (!res.ok) { invalidCount = 0; return; }
            const data = await res.json();
            if (data.valid === false) {
              invalidCount++;
              // ✅ لازم يجيب valid=false مرتين متتاليتين عشان نطرد
              if (invalidCount >= 2) {
                localStorage.removeItem("currentUser");
                document.cookie = "currentUser=; path=/; max-age=0";
                if (bc) bc.close();
                clearInterval(interval);
                setSessionKicked(true);
              }
            } else {
              invalidCount = 0;
            }
          } catch {
            invalidCount = 0;
          }
        }

        // ✅ أول فحص بعد 45 ثانية مش 10 — عشان نتجنب false positive أثناء التحميل
        const firstCheck = setTimeout(() => {
          checkSession();
          interval = setInterval(checkSession, 30000);
        }, 45000);

        return () => {
          clearTimeout(firstCheck);
          clearInterval(interval);
          if (bc) bc.close();
        };
      }

    } catch {
      localStorage.removeItem("currentUser");
      router.replace("/login");
    }
  }, []);

  const toggleSidebar = () => setSidebarActive(s => !s);
  const switchSection = (id) => { setActiveSection(id); setSidebarActive(false); };

  const handleLogout = async () => {
    try {
      const phone = currentUser?.studentPhone || currentUser?.phone;
      if (phone) {
        await fetch("/api/session", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone }),
        });
      }
    } catch {}
    localStorage.removeItem("currentUser");
    document.cookie = "currentUser=; path=/; max-age=0";
    router.replace("/");
  };

  const openPaymentModal = (courseName, courseId) => {
    setModalCourseTitle(`الاشتراك في: ${courseName}`);
    setModalCourseId(courseId);
    setIsModalOpen(true);
  };
  const closePaymentModal = () => { setIsModalOpen(false); setActivationCode(""); };

  const verifyActivationCode = async () => {
    const code = activationCode.trim().toUpperCase();
    if (!code) { triggerToast("من فضلك أدخل كود التفعيل!", "⚠️"); return; }
    try {
      const codeRef = doc(db, "activation_codes", code);
      const codeSnap = await getDoc(codeRef);
      if (!codeSnap.exists()) { triggerToast("الكود غير موجود، تأكد منه!", "❌"); return; }
      const codeData = codeSnap.data();
      if (codeData.used) { triggerToast("الكود ده اتستخدم قبل كدا!", "❌"); return; }
      if (codeData.courseId !== modalCourseId) { triggerToast("الكود ده مش لهذا الكورس!", "⚠️"); return; }
      const phone = currentUser?.studentPhone || currentUser?.id || "unknown";
      await updateDoc(codeRef, { used: true, usedBy: phone, usedAt: new Date().toISOString() });
      if (currentUser?.studentPhone || currentUser?.id) {
        const studentRef = doc(db, "students", phone);
        await updateDoc(studentRef, { subscribedCourses: arrayUnion(modalCourseId) }).catch(() => {});
      }
      closePaymentModal();
      triggerToast("تم الاشتراك في الكورس بنجاح! مبروك عليك 🎉", "🎉");
    } catch (e) {
      console.error(e);
      triggerToast("حدث خطأ، حاول تاني.", "❌");
    }
  };

  const handleSupportSubmit = async (e) => {
    e.preventDefault();
    const subject = e.target[0].value;
    const body = e.target[1].value;
    const phone = currentUser?.studentPhone || currentUser?.id || "زائر";
    const name = currentUser?.fullName || currentUser?.firstName || "طالب";
    try {
      await addDoc(collection(db, "support_messages"), { senderName: name, studentPhone: phone, subject, body, read: false, createdAt: new Date().toISOString() });
      triggerToast("تم إرسال رسالتك بنجاح للإدارة 📥", "📥");
      e.target.reset();
    } catch (err) {
      console.error(err);
      triggerToast("حدث خطأ في الإرسال، حاول تاني.", "❌");
    }
  };

  const handleSettingsSubmit = (e) => {
    e.preventDefault();
    if (inputName.trim()) setStudentName(inputName.trim());
    triggerToast("تم تحديث بياناتك بنجاح 💾", "💾");
  };

  const teacherImage = "https://i.postimg.cc/52kL3M3L/IMG-20260618-010055.png";
  const displayName = currentUser?.fullName || currentUser?.firstName || studentName || "الطالب";

  if (!mounted || !currentUser) {
    return (
      <div style={{ minHeight: "100vh", background: "#050507", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#00FFB3", fontFamily: "Cairo, sans-serif", fontSize: "1.1rem" }}>⏳ جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="app-wrapper" data-theme={theme} dir="rtl">
      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg-main: #050505; --card-bg: #0b0c0e; --neon-teal: #00ffd0; --neon-blue: #00b3ff;
          --text-white: #ffffff; --text-muted: #6c727f; --input-border: #1a1d24;
          --input-bg: #111318; --neon-glow: rgba(0, 255, 208, 0.35); --card-shadow: 0 20px 40px rgba(0,0,0,0.8);
        }
        [data-theme="light"] {
          --bg-main: #f4f6f9; --card-bg: #ffffff; --neon-teal: #00a887; --neon-blue: #0076b3;
          --text-white: #111318; --text-muted: #5c6370; --input-border: #d2d6dc;
          --input-bg: #f9fafb; --neon-glow: rgba(0, 168, 135, 0.15); --card-shadow: 0 10px 30px rgba(0,0,0,0.06);
        }
        .app-wrapper { background-color: var(--bg-main); color: var(--text-white); font-family: 'Cairo', sans-serif; min-height: 100vh; display: flex; flex-direction: column; align-items: center; transition: background-color 0.3s ease, color 0.3s ease; overflow-x: hidden; width: 100%; }
        .custom-toast { position: fixed; top: 20px; left: 50%; transform: translateX(-50%) translateY(-50px); background: var(--card-bg); border: 1px solid var(--neon-teal); box-shadow: 0 0 25px var(--neon-glow); padding: 1rem 2.5rem; border-radius: 14px; color: var(--text-white); font-weight: 700; z-index: 3000; opacity: 0; pointer-events: none; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); display: flex; align-items: center; gap: 12px; white-space: nowrap; }
        .custom-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

        /* ===== RESPONSIVE HEADER ===== */
        .courses-header { width: 100%; max-width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 1rem 2rem; background: var(--bg-main); border-bottom: 1px solid rgba(255, 255, 255, 0.05); position: sticky; top: 0; z-index: 1000; }
        .header-right { display: flex; align-items: center; gap: 12px; }
        .teacher-avatar { width: 45px; height: 45px; border-radius: 50%; border: 2px solid var(--neon-teal); object-fit: cover; box-shadow: 0 0 10px var(--neon-glow); }
        .teacher-info .teacher-name { font-size: 0.95rem; font-weight: 800; }
        .teacher-info .teacher-title { font-size: 0.75rem; color: var(--neon-teal); font-weight: 700; }
        .header-left { display: flex; align-items: center; gap: 10px; }
        .theme-toggle-btn { background: var(--card-bg); border: 1px solid var(--input-border); color: var(--text-white); width: 40px; height: 40px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; transition: all 0.2s; }
        .theme-toggle-btn:hover { border-color: var(--neon-teal); box-shadow: 0 0 10px var(--neon-glow); }
        .menu-toggle-btn { background: linear-gradient(135deg, var(--neon-teal), var(--neon-blue)); border: none; color: #000; width: 40px; height: 40px; border-radius: 12px; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; box-shadow: 0 0 15px var(--neon-glow); }
        .menu-toggle-btn span { display: block; width: 20px; height: 2.5px; background-color: #000; border-radius: 2px; }

        /* ===== SIDEBAR ===== */
        .sidebar-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 1999; opacity: 0; pointer-events: none; transition: opacity 0.3s ease; }
        .sidebar-overlay.active { opacity: 1; pointer-events: auto; }
        .sidebar { position: fixed; top: 0; right: -320px; width: 300px; height: 100%; background: var(--card-bg); border-left: 1px solid var(--input-border); box-shadow: -10px 0 40px rgba(0,0,0,0.5); z-index: 2000; transition: right 0.3s cubic-bezier(0.77, 0, 0.175, 1); padding: 2rem 1.5rem; display: flex; flex-direction: column; overflow-y: auto; }
        .sidebar.active { right: 0; }
        .sidebar-menu { list-style: none; display: flex; flex-direction: column; gap: 0.8rem; }
        .sidebar-menu li a { display: flex; align-items: center; padding: 1rem 1.2rem; color: var(--text-white); text-decoration: none; font-weight: 700; border-radius: 12px; background: rgba(255,255,255,0.02); border: 1px solid transparent; transition: all 0.2s; }
        .sidebar-menu li a:hover, .sidebar-menu li.active a { background: rgba(0, 255, 208, 0.05); border-color: rgba(0, 255, 208, 0.2); color: var(--neon-teal); }

        /* ===== MAIN RESPONSIVE LAYOUT ===== */
        .main-container { width: 100%; max-width: 900px; padding: 2rem 1.5rem; flex: 1; }
        .page-section { display: none; }
        .page-section.active { display: block; }
        .section-title { font-size: 1.8rem; font-weight: 900; margin-bottom: 1.5rem; position: relative; display: inline-block; }
        .section-title::after { content: ''; position: absolute; bottom: -4px; right: 0; width: 40px; height: 4px; background: var(--neon-teal); border-radius: 2px; }

        /* ===== COURSES GRID — يتكيف مع كل الشاشات ===== */
        .courses-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 2rem; }
        .course-card { background: var(--card-bg); border: 1px solid var(--input-border); border-radius: 24px; overflow: hidden; box-shadow: var(--card-shadow); transition: transform 0.3s; }
        .course-card:hover { transform: translateY(-5px); }
        .course-image { width: 100%; height: auto; object-fit: cover; display: block; }
        .course-content { padding: 1.5rem; }
        .course-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.2rem; }
        .course-title { font-size: 1.2rem; font-weight: 800; }
        .course-price { background: rgba(0, 255, 208, 0.1); border: 1px solid var(--neon-teal); color: var(--neon-teal); padding: 0.3rem 1rem; border-radius: 10px; font-weight: 800; font-size: 1rem; white-space: nowrap; }
        .btn-course-action { width: 100%; padding: 1rem; border-radius: 14px; font-family: 'Cairo', sans-serif; font-weight: 800; font-size: 1rem; cursor: pointer; border: none; transition: all 0.3s; }
        .btn-subscribe { background: linear-gradient(135deg, var(--neon-teal), var(--neon-blue)); color: #000; box-shadow: 0 0 15px var(--neon-glow); }
        .btn-enter { background: #111318; border: 1px solid var(--neon-teal); color: var(--neon-teal); }

        /* ===== MODAL ===== */
        .payment-modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); z-index: 2500; display: flex; align-items: center; justify-content: center; padding: 1rem; opacity: 0; pointer-events: none; transition: opacity 0.3s ease; }
        .payment-modal.active { opacity: 1; pointer-events: auto; }
        .modal-content { background: var(--card-bg); border: 1px solid var(--input-border); border-radius: 24px; width: 100%; max-width: 420px; padding: 2rem 1.5rem; box-shadow: var(--card-shadow); text-align: center; }
        .modal-instruction { font-size: 1.05rem; margin-bottom: 1.5rem; line-height: 1.6; }
        .modal-instruction strong { color: var(--neon-teal); font-size: 1.2rem; display: block; margin: 0.5rem 0; }
        .whatsapp-btn-link { display: inline-flex; align-items: center; gap: 10px; background: #25D366; color: #fff; text-decoration: none; padding: 0.8rem 1.8rem; border-radius: 12px; font-weight: 700; margin-bottom: 2rem; box-shadow: 0 5px 15px rgba(37, 211, 102, 0.3); }
        .activation-box { border-top: 1px solid var(--input-border); padding-top: 1.5rem; }
        .activation-box input { width: 100%; background: var(--input-bg); border: 1px solid var(--input-border); color: var(--text-white); padding: 1rem; border-radius: 12px; text-align: center; font-size: 1.1rem; font-weight: 700; letter-spacing: 2px; margin-bottom: 1rem; outline: none; }
        .activation-box input:focus { border-color: var(--neon-teal); }
        .btn-close-modal { background: none; border: none; color: var(--text-muted); margin-top: 1rem; cursor: pointer; font-weight: 600; font-family: 'Cairo', sans-serif; }

        /* ===== FORMS ===== */
        .form-group { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1.2rem; }
        .form-group label { font-size: 0.9rem; font-weight: 700; }
        .form-group input, .form-group textarea { width: 100%; background: var(--input-bg); border: 1px solid var(--input-border); color: var(--text-white); padding: 1rem; border-radius: 12px; outline: none; font-family: 'Cairo', sans-serif; }
        .form-group input:focus, .form-group textarea:focus { border-color: var(--neon-teal); }
        .btn-submit-form { width: 100%; background: linear-gradient(135deg, var(--neon-teal), var(--neon-blue)); border: none; padding: 1rem; border-radius: 12px; font-weight: 800; cursor: pointer; font-family: 'Cairo', sans-serif; box-shadow: 0 0 15px var(--neon-glow); }

        /* ===== STATS ===== */
        .stats-card { background: var(--card-bg); border: 1px solid var(--input-border); border-radius: 16px; padding: 1.2rem; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center; }
        .stats-card .info h4 { font-size: 1rem; font-weight: 800; }
        .stats-card .info p { font-size: 0.8rem; color: var(--text-muted); margin-top: 2px; }
        .stats-badge { background: rgba(0, 179, 255, 0.1); border: 1px solid var(--neon-blue); color: var(--neon-blue); padding: 0.3rem 0.8rem; border-radius: 8px; font-size: 0.85rem; font-weight: 700; white-space: nowrap; }

        /* ===== FOOTER ===== */
        .footer-main { width: 100%; text-align: center; margin-top: 4rem; padding: 1rem; display: flex; flex-direction: column; align-items: center; gap: 2rem; }
        .footer-society { display: flex; align-items: center; gap: 8px; font-size: 1.5rem; font-weight: 800; letter-spacing: 1px; }
        .footer-society span { font-weight: 400; font-size: 0.85rem; color: #798396; letter-spacing: 2px; margin-top: 6px; }
        .developer-badge { background: #111318; border: 1px solid var(--input-border); padding: 0.6rem 1.5rem; border-radius: 12px; font-size: 0.85rem; color: var(--text-muted); }
        .developer-badge strong { color: #fff; margin-left: 4px; }
        .copyright { font-size: 0.8rem; color: #494f5c; }
        .powered-by { font-size: 0.75rem; color: #5d6475; letter-spacing: 3px; font-weight: 700; }
        .powered-by div { font-size: 0.95rem; color: var(--text-white); letter-spacing: 4px; font-weight: 900; margin-top: 4px; }

        /* ===== RESPONSIVE BREAKPOINTS ===== */
        @media (max-width: 600px) {
          .courses-header { padding: 0.9rem 1rem; }
          .main-container { padding: 1.2rem 0.8rem; }
          .courses-grid { grid-template-columns: 1fr; gap: 1.5rem; }
          .section-title { font-size: 1.4rem; }
          .stats-card { flex-direction: column; align-items: flex-start; gap: 0.8rem; }
        }
        @media (min-width: 601px) and (max-width: 1024px) {
          .courses-grid { grid-template-columns: repeat(2, 1fr); }
          .main-container { max-width: 100%; padding: 1.5rem; }
        }
        @media (min-width: 1025px) {
          .courses-grid { grid-template-columns: repeat(3, 1fr); }
          .main-container { max-width: 1100px; padding: 2rem 3rem; }
        }
      `}</style>

      <div className={`custom-toast ${toast.show ? "show" : ""}`}>
        <span>{toast.icon}</span><span>{toast.message}</span>
      </div>

      <header className="courses-header">
        <div className="header-left">
          <button className="theme-toggle-btn" onClick={toggleTheme}>🌗</button>
          <button className="menu-toggle-btn" onClick={toggleSidebar}>
            <span/><span/><span/>
          </button>
        </div>
        <div className="header-right">
          <div className="teacher-info" style={{ textAlign: "left" }}>
            <div className="teacher-name">د. أحمد تمام</div>
            <div className="teacher-title">كبير مستشاري الأحياء</div>
          </div>
          <img src={teacherImage} alt="Dr Ahmed Tammam" className="teacher-avatar" />
        </div>
      </header>

      <div className={`sidebar-overlay ${sidebarActive ? "active" : ""}`} onClick={toggleSidebar}/>
      <aside className={`sidebar ${sidebarActive ? "active" : ""}`}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: "1.5rem", borderBottom: "1px solid var(--input-border)", marginBottom: "2rem" }}>
          <div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>أهلاً بك في منصتنا</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--text-white)", marginTop: "4px" }}>{displayName}</div>
          </div>
          <button onClick={toggleSidebar} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", width: "36px", height: "36px", borderRadius: "10px", cursor: "pointer", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✕</button>
        </div>
        <ul className="sidebar-menu">
          {[["dashboard","لوحة التحكم"],["support","الدعم الفني"],["stats","إحصائيات الطالب"],["settings","إعدادات الطالب"]].map(([id, label]) => (
            <li key={id} className={activeSection === id ? "active" : ""}>
              <a href="#" onClick={e => { e.preventDefault(); switchSection(id); }}>{label}</a>
            </li>
          ))}
        </ul>
        <button onClick={handleLogout} style={{ marginTop: "auto", width: "100%", background: "rgba(255,77,109,0.1)", border: "1px solid rgba(255,77,109,0.3)", color: "#ff4d6d", padding: "0.9rem", borderRadius: "12px", fontFamily: "Cairo, sans-serif", fontWeight: 700, fontSize: "1rem", cursor: "pointer" }}>
          تسجيل الخروج 👋
        </button>
      </aside>

      <main className="main-container">
        <section className={`page-section ${activeSection === "dashboard" ? "active" : ""}`}>
          <h2 className="section-title">الكورسات المتاحة</h2>
          <div className="courses-grid">
            <div className="course-card">
              <img src="https://i.postimg.cc/tRDnXjxX/IMG-20260618-061351.png" alt="كورس الشهر الأول" className="course-image" />
              <div className="course-content">
                <div className="course-meta">
                  <h3 className="course-title">كورس الشهر الأول</h3>
                  <span className="course-price">200 ج</span>
                </div>
                <button className="btn-course-action btn-subscribe" onClick={() => openPaymentModal("كورس الشهر الأول", "month1")}>اشتراك في الكورس</button>
              </div>
            </div>
            <div className="course-card">
              <img src="https://i.postimg.cc/d3Whn2YD/IMG-20260618-061428.png" alt="كورس الشهر الثاني" className="course-image" />
              <div className="course-content">
                <div className="course-meta">
                  <h3 className="course-title">كورس الشهر الثاني</h3>
                  <span className="course-price">200 ج</span>
                </div>
                <button className="btn-course-action btn-enter" onClick={() => router.push("/lectures/month1")}>ادخل للكورس</button>
              </div>
            </div>
          </div>
        </section>

        <section className={`page-section ${activeSection === "support" ? "active" : ""}`}>
          <h2 className="section-title">الدعم الفني</h2>
          <div style={{ background: "var(--card-bg)", padding: "1.5rem", borderRadius: "20px", border: "1px solid var(--input-border)" }}>
            <form onSubmit={handleSupportSubmit}>
              <div className="form-group">
                <label>عنوان المشكلة</label>
                <input type="text" name="subject" placeholder="مثال: مشكلة في تفعيل الكود" required />
              </div>
              <div className="form-group">
                <label>تفاصيل الرسالة</label>
                <textarea name="body" rows="5" placeholder="اكتب تفاصيل رسالتك هنا..." required/>
              </div>
              <button type="submit" className="btn-submit-form">إرسال الرسالة إلى الإدارة العامة</button>
            </form>
          </div>
        </section>

        <section className={`page-section ${activeSection === "stats" ? "active" : ""}`}>
          <h2 className="section-title">إحصائيات الطالب</h2>
          <div className="stats-card">
            <div className="info"><h4>المحاضرة التأسيسية الأولى</h4><p>تمت مشاهدتها بالكامل</p></div>
            <span className="stats-badge">100% مشاهدة</span>
          </div>
          <div className="stats-card">
            <div className="info"><h4>اختبار المحاضرة التأسيسية</h4><p>تاريخ الاجتياز: اليوم</p></div>
            <span className="stats-badge" style={{ borderColor: "var(--neon-teal)", color: "var(--neon-teal)" }}>الدرجة: 19/20</span>
          </div>
          <div className="stats-card">
            <div className="info"><h4>حل الواجب الشامل (1)</h4><p>تحت التصحيح</p></div>
            <span className="stats-badge" style={{ borderColor: "#ff9f43", color: "#ff9f43" }}>جاري المراجعة</span>
          </div>
        </section>

        <section className={`page-section ${activeSection === "settings" ? "active" : ""}`}>
          <h2 className="section-title">إعدادات الطالب</h2>
          <div style={{ background: "var(--card-bg)", padding: "1.5rem", borderRadius: "20px", border: "1px solid var(--input-border)" }}>
            <form onSubmit={handleSettingsSubmit}>
              <div className="form-group"><label>اسم الطالب الكامل</label><input type="text" value={inputName} onChange={e => setInputName(e.target.value)} /></div>
              <div className="form-group"><label>رقم هاتف الطالب</label><input type="tel" value={currentUser?.studentPhone || "—"} readOnly style={{ opacity: 0.7 }} /></div>
              <div className="form-group"><label>رقم ولي الأمر (الأب)</label><input type="tel" defaultValue={currentUser?.fatherPhone || ""} /></div>
              <div className="form-group"><label>رقم ولي الأمر (الأم)</label><input type="tel" defaultValue={currentUser?.motherPhone || ""} /></div>
              <div className="form-group"><label>الرقم القومي</label><input type="text" value={currentUser?.nationalID || "—"} readOnly style={{ opacity: 0.7 }} /></div>
              <button type="submit" className="btn-submit-form" style={{ background: "linear-gradient(135deg, var(--neon-blue), #0055ff)", color: "#fff" }}>حفظ التغييرات</button>
            </form>
          </div>
        </section>
      </main>

      <div className={`payment-modal ${isModalOpen ? "active" : ""}`}>
        <div className="modal-content">
          <h3 style={{ marginBottom: "1rem" }}>{modalCourseTitle}</h3>
          <div className="modal-instruction">
            قم بتحويل قيمة الكورس (200ج) إلى الرقم التالي:
            <strong>01114672635</strong>
            ثم تواصل مع الدعم الفني عبر الواتساب لتأكيد الإيصال:
          </div>
          <a href="https://wa.me/201128381838" target="_blank" rel="noopener noreferrer" className="whatsapp-btn-link">تواصل عبر الواتساب 💬</a>
          <div className="activation-box">
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 700, fontSize: "0.9rem" }}>ادخل كود التفعيل بعد الاستلام:</label>
            <input type="text" placeholder="XXXX-XXXX" value={activationCode} onChange={e => setActivationCode(e.target.value.toUpperCase())} style={{ direction: "ltr" }} />
            <button className="btn-course-action btn-subscribe" onClick={verifyActivationCode}>تفعيل الكورس الآن 🚀</button>
          </div>
          <button className="btn-close-modal" onClick={closePaymentModal}>إغلاق النافذة</button>
        </div>
      </div>

      <footer className="footer-main">
        <div className="footer-society">Tammam <span>SOCIETY</span></div>
        <div className="developer-badge">&lt;/&gt; Developed By <strong>Ahmed & Elgizawy 👑</strong></div>
        <div className="copyright">All Rights Reserved @2026</div>
        <div className="powered-by">POWERED BY<div>GIZA-TECH</div></div>
      </footer>

      {/* ✅ Session Kicked Modal */}
      {sessionKicked && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: "var(--card-bg)", borderRadius: "20px", padding: "36px 28px", maxWidth: "360px", width: "100%", textAlign: "center", border: "1px solid rgba(0,255,208,0.2)", boxShadow: "0 20px 60px rgba(0,0,0,0.8)" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
            <h3 style={{ color: "var(--text-white)", fontSize: "18px", fontWeight: "700", marginBottom: "12px", lineHeight: 1.5 }}>تم تسجيل الدخول من جهاز آخر</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "24px", lineHeight: 1.7 }}>سيتم تسجيل خروجك الآن لأن حسابك فُتح على جهاز مختلف.</p>
            <button
              onClick={() => { setSessionKicked(false); router.replace("/login"); }}
              style={{ background: "linear-gradient(135deg, var(--neon-teal), var(--neon-blue))", color: "#000", border: "none", borderRadius: "12px", padding: "12px 32px", fontSize: "15px", fontWeight: "700", cursor: "pointer", width: "100%" }}
            >حسناً</button>
          </div>
        </div>
      )}
    </div>
  );
}
