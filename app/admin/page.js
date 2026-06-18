// app/admin/page.js
// لوحة تحكم الأدمن — رسائل الدعم / بيانات الطلاب / أكواد الكورسات
"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  setDoc,
  updateDoc,
  query,
  orderBy,
} from "firebase/firestore";

// كلمة السر بتيجي من Firebase مش من هنا

const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #050507;
    --card: #0d0f14;
    --border: #1a1e2a;
    --teal: #00FFB3;
    --blue: #00b3ff;
    --red: #ff4d6d;
    --yellow: #ffd700;
    --muted: #5a6070;
    --white: #f0f2f5;
    --glow: rgba(0,255,179,0.2);
  }
  body { background: var(--bg); color: var(--white); font-family: 'Cairo', sans-serif; direction: rtl; }
  
  /* LOGIN */
  .login-screen {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg);
  }
  .login-box {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 24px;
    padding: 3rem 2.5rem;
    width: 100%;
    max-width: 420px;
    text-align: center;
    box-shadow: 0 0 60px rgba(0,255,179,0.07);
  }
  .login-icon { font-size: 3rem; margin-bottom: 1rem; }
  .login-box h1 { font-size: 1.6rem; font-weight: 900; margin-bottom: 0.3rem; }
  .login-box p { color: var(--muted); font-size: 0.9rem; margin-bottom: 2rem; }
  .login-input {
    width: 100%;
    background: #111318;
    border: 1px solid var(--border);
    color: var(--white);
    padding: 1rem 1.2rem;
    border-radius: 14px;
    font-family: 'Cairo', sans-serif;
    font-size: 1rem;
    text-align: center;
    letter-spacing: 3px;
    outline: none;
    margin-bottom: 1rem;
    transition: border-color 0.2s;
  }
  .login-input:focus { border-color: var(--teal); }
  .login-btn {
    width: 100%;
    background: linear-gradient(135deg, var(--teal), var(--blue));
    color: #000;
    border: none;
    padding: 1rem;
    border-radius: 14px;
    font-weight: 900;
    font-size: 1.05rem;
    cursor: pointer;
    font-family: 'Cairo', sans-serif;
    box-shadow: 0 0 20px var(--glow);
    transition: transform 0.2s;
  }
  .login-btn:hover { transform: translateY(-2px); }
  .login-error { color: var(--red); font-size: 0.9rem; margin-top: 0.5rem; }

  /* LAYOUT */
  .admin-wrapper { min-height: 100vh; display: flex; flex-direction: column; }
  .admin-header {
    background: var(--card);
    border-bottom: 1px solid var(--border);
    padding: 1rem 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: sticky;
    top: 0;
    z-index: 100;
  }
  .admin-logo { font-size: 1.2rem; font-weight: 900; }
  .admin-logo span { color: var(--teal); }
  .logout-btn {
    background: none;
    border: 1px solid var(--border);
    color: var(--muted);
    padding: 0.4rem 1rem;
    border-radius: 10px;
    cursor: pointer;
    font-family: 'Cairo', sans-serif;
    font-size: 0.85rem;
    transition: all 0.2s;
  }
  .logout-btn:hover { border-color: var(--red); color: var(--red); }

  /* TABS */
  .tabs-bar {
    display: flex;
    gap: 0;
    background: var(--card);
    border-bottom: 1px solid var(--border);
    padding: 0 2rem;
  }
  .tab-btn {
    background: none;
    border: none;
    border-bottom: 3px solid transparent;
    color: var(--muted);
    padding: 1rem 1.5rem;
    cursor: pointer;
    font-family: 'Cairo', sans-serif;
    font-weight: 700;
    font-size: 0.95rem;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s;
    white-space: nowrap;
  }
  .tab-btn:hover { color: var(--white); }
  .tab-btn.active { color: var(--teal); border-bottom-color: var(--teal); }
  .tab-badge {
    background: var(--teal);
    color: #000;
    border-radius: 20px;
    padding: 1px 8px;
    font-size: 0.75rem;
    font-weight: 900;
  }

  /* MAIN CONTENT */
  .admin-main { flex: 1; padding: 2rem; max-width: 1200px; width: 100%; margin: 0 auto; }

  /* STATS ROW */
  .stats-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }
  .stat-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 1.2rem;
    text-align: center;
  }
  .stat-card .num { font-size: 2rem; font-weight: 900; color: var(--teal); }
  .stat-card .lbl { font-size: 0.8rem; color: var(--muted); margin-top: 4px; }

  /* TABLE */
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    gap: 1rem;
  }
  .section-title { font-size: 1.3rem; font-weight: 900; }
  .search-input {
    background: var(--card);
    border: 1px solid var(--border);
    color: var(--white);
    padding: 0.6rem 1rem;
    border-radius: 10px;
    font-family: 'Cairo', sans-serif;
    outline: none;
    min-width: 220px;
    transition: border-color 0.2s;
  }
  .search-input:focus { border-color: var(--teal); }

  .table-wrap {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 20px;
    overflow: hidden;
    overflow-x: auto;
  }
  table { width: 100%; border-collapse: collapse; min-width: 600px; }
  thead { background: rgba(0,255,179,0.04); }
  th {
    padding: 1rem 1.2rem;
    text-align: right;
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--muted);
    letter-spacing: 0.5px;
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
  }
  td {
    padding: 1rem 1.2rem;
    font-size: 0.9rem;
    border-bottom: 1px solid rgba(255,255,255,0.03);
    vertical-align: middle;
  }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: rgba(255,255,255,0.015); }

  .badge {
    display: inline-block;
    padding: 0.2rem 0.7rem;
    border-radius: 8px;
    font-size: 0.78rem;
    font-weight: 700;
  }
  .badge-teal { background: rgba(0,255,179,0.1); border: 1px solid var(--teal); color: var(--teal); }
  .badge-blue { background: rgba(0,179,255,0.1); border: 1px solid var(--blue); color: var(--blue); }
  .badge-red { background: rgba(255,77,109,0.1); border: 1px solid var(--red); color: var(--red); }
  .badge-yellow { background: rgba(255,215,0,0.1); border: 1px solid var(--yellow); color: var(--yellow); }

  /* ACTION BUTTONS */
  .action-btns { display: flex; gap: 6px; flex-wrap: wrap; }
  .btn-sm {
    background: none;
    border: 1px solid var(--border);
    color: var(--muted);
    padding: 0.3rem 0.7rem;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.8rem;
    font-family: 'Cairo', sans-serif;
    transition: all 0.2s;
  }
  .btn-sm:hover { border-color: var(--teal); color: var(--teal); }
  .btn-sm.danger:hover { border-color: var(--red); color: var(--red); }

  /* MESSAGE CARD */
  .msg-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 1.5rem;
    margin-bottom: 1rem;
    transition: border-color 0.2s;
  }
  .msg-card:hover { border-color: rgba(0,255,179,0.2); }
  .msg-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.8rem; flex-wrap: wrap; gap: 0.5rem; }
  .msg-sender { font-weight: 800; font-size: 1rem; }
  .msg-phone { color: var(--teal); font-size: 0.85rem; direction: ltr; }
  .msg-time { color: var(--muted); font-size: 0.8rem; }
  .msg-subject { color: var(--blue); font-size: 0.9rem; font-weight: 700; margin-bottom: 0.6rem; }
  .msg-body { color: #a0a8b5; font-size: 0.9rem; line-height: 1.7; white-space: pre-wrap; }
  .msg-footer { margin-top: 1rem; display: flex; gap: 8px; }

  /* CODES SECTION */
  .codes-controls {
    display: flex;
    gap: 1rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    align-items: center;
  }
  .add-code-form {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr auto;
    gap: 1rem;
    align-items: end;
  }
  .form-field { display: flex; flex-direction: column; gap: 0.4rem; }
  .form-field label { font-size: 0.8rem; font-weight: 700; color: var(--muted); }
  .form-field input, .form-field select {
    background: #111318;
    border: 1px solid var(--border);
    color: var(--white);
    padding: 0.7rem 1rem;
    border-radius: 10px;
    font-family: 'Cairo', sans-serif;
    outline: none;
    transition: border-color 0.2s;
  }
  .form-field input:focus, .form-field select:focus { border-color: var(--teal); }
  .form-field select option { background: #111318; }
  .btn-add {
    background: linear-gradient(135deg, var(--teal), var(--blue));
    color: #000;
    border: none;
    padding: 0.7rem 1.5rem;
    border-radius: 10px;
    font-weight: 900;
    cursor: pointer;
    font-family: 'Cairo', sans-serif;
    white-space: nowrap;
    transition: transform 0.2s;
    height: fit-content;
  }
  .btn-add:hover { transform: translateY(-2px); }

  /* EMPTY STATE */
  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
    color: var(--muted);
  }
  .empty-state .icon { font-size: 3rem; margin-bottom: 1rem; }
  .empty-state p { font-size: 0.95rem; }

  /* LOADING */
  .loading { text-align: center; padding: 3rem; color: var(--muted); }

  /* TOAST */
  .toast {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%) translateY(-60px);
    background: var(--card);
    border: 1px solid var(--teal);
    box-shadow: 0 0 30px var(--glow);
    padding: 0.9rem 2rem;
    border-radius: 14px;
    font-weight: 700;
    z-index: 9999;
    opacity: 0;
    transition: all 0.4s cubic-bezier(0.175,0.885,0.32,1.275);
    pointer-events: none;
    display: flex;
    align-items: center;
    gap: 10px;
    white-space: nowrap;
  }
  .toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

  /* MODAL */
  .modal-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.8);
    backdrop-filter: blur(8px);
    z-index: 5000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }
  .modal-box {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 24px;
    padding: 2rem;
    width: 100%;
    max-width: 500px;
    max-height: 90vh;
    overflow-y: auto;
  }
  .modal-title { font-size: 1.2rem; font-weight: 900; margin-bottom: 1.5rem; }
  .modal-row { display: flex; justify-content: space-between; padding: 0.7rem 0; border-bottom: 1px solid var(--border); font-size: 0.9rem; }
  .modal-row:last-of-type { border-bottom: none; }
  .modal-key { color: var(--muted); }
  .modal-val { font-weight: 700; text-align: left; direction: ltr; }
  .modal-close {
    width: 100%;
    margin-top: 1.5rem;
    background: none;
    border: 1px solid var(--border);
    color: var(--muted);
    padding: 0.8rem;
    border-radius: 12px;
    cursor: pointer;
    font-family: 'Cairo', sans-serif;
    transition: all 0.2s;
  }
  .modal-close:hover { border-color: var(--teal); color: var(--teal); }

  @media (max-width: 700px) {
    .admin-header { padding: 0.8rem 1rem; }
    .tabs-bar { padding: 0 0.5rem; overflow-x: auto; }
    .tab-btn { padding: 0.8rem 0.8rem; font-size: 0.85rem; }
    .admin-main { padding: 1rem; }
    .add-code-form { grid-template-columns: 1fr; }
    .stats-row { grid-template-columns: repeat(2, 1fr); }
  }
`;

// ==================== HELPERS ====================
function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ar-EG", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function genCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += "-";
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ==================== TOAST ====================
function useToast() {
  const [toast, setToast] = useState({ show: false, msg: "", icon: "✅" });
  const show = (msg, icon = "✅") => {
    setToast({ show: true, msg, icon });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3000);
  };
  return [toast, show];
}

// ==================== MESSAGES TAB ====================
function MessagesTab() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toast, showToast] = useToast();

  useEffect(() => { fetchMessages(); }, []);

  async function fetchMessages() {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "support_messages"));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setMessages(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function deleteMsg(id) {
    if (!confirm("هتحذف الرسالة دي؟")) return;
    await deleteDoc(doc(db, "support_messages", id));
    setMessages(m => m.filter(x => x.id !== id));
    showToast("تم حذف الرسالة", "🗑️");
  }

  const filtered = messages.filter(m =>
    (m.senderName || m.studentName || "").includes(search) ||
    (m.subject || "").includes(search) ||
    (m.phone || m.studentPhone || "").includes(search)
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className={`toast ${toast.show ? "show" : ""}`}>{toast.icon} {toast.msg}</div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="num">{messages.length}</div>
          <div className="lbl">إجمالي الرسائل</div>
        </div>
        <div className="stat-card">
          <div className="num" style={{ color: "var(--yellow)" }}>
            {messages.filter(m => !m.read).length}
          </div>
          <div className="lbl">رسائل غير مقروءة</div>
        </div>
      </div>

      <div className="section-header">
        <div className="section-title">📥 رسائل الدعم الفني</div>
        <input
          className="search-input"
          placeholder="ابحث باسم أو موضوع..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading && <div className="loading">⏳ جاري التحميل...</div>}

      {!loading && filtered.length === 0 && (
        <div className="empty-state">
          <div className="icon">📭</div>
          <p>مفيش رسائل دلوقتي</p>
        </div>
      )}

      {filtered.map(msg => (
        <div key={msg.id} className="msg-card">
          <div className="msg-header">
            <div>
              <div className="msg-sender">
                {msg.senderName || msg.studentName || "طالب غير محدد"}
              </div>
              <div className="msg-phone">{msg.phone || msg.studentPhone || "—"}</div>
            </div>
            <div className="msg-time">{formatDate(msg.createdAt)}</div>
          </div>
          <div className="msg-subject">📌 {msg.subject || msg.title || "بدون موضوع"}</div>
          <div className="msg-body">{msg.body || msg.message || msg.details || "لا يوجد تفاصيل"}</div>
          <div className="msg-footer">
            <button className="btn-sm danger" onClick={() => deleteMsg(msg.id)}>🗑️ حذف</button>
            {(msg.phone || msg.studentPhone) && (
              <a
                href={`https://wa.me/2${(msg.phone || msg.studentPhone).replace(/^0/, "")}`}
                target="_blank"
                rel="noreferrer"
              >
                <button className="btn-sm">💬 واتساب</button>
              </a>
            )}
          </div>
        </div>
      ))}
    </>
  );
}

// ==================== STUDENTS TAB ====================
function StudentsTab() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [toast, showToast] = useToast();

  useEffect(() => { fetchStudents(); }, []);

  async function fetchStudents() {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "students"));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setStudents(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function deleteStudent(id) {
    if (!confirm(`هتحذف الطالب ${id}؟`)) return;
    await deleteDoc(doc(db, "students", id));
    setStudents(s => s.filter(x => x.id !== id));
    showToast("تم حذف الطالب", "🗑️");
  }

  const filtered = students.filter(s =>
    (s.fullName || "").includes(search) ||
    (s.studentPhone || "").includes(search) ||
    (s.nationalID || "").includes(search)
  );

  const totalWallet = students.reduce((sum, s) => sum + (s.walletBalance || 0), 0);

  return (
    <>
      <div className={`toast ${toast.show ? "show" : ""}`}>{toast.icon} {toast.msg}</div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="num">{students.length}</div>
          <div className="lbl">إجمالي الطلاب</div>
        </div>
        <div className="stat-card">
          <div className="num" style={{ color: "var(--blue)" }}>
            {students.filter(s => s.subscribedCourses?.length > 0).length}
          </div>
          <div className="lbl">طلاب مشتركين</div>
        </div>
        <div className="stat-card">
          <div className="num" style={{ color: "var(--yellow)" }}>{totalWallet} ج</div>
          <div className="lbl">إجمالي المحافظ</div>
        </div>
      </div>

      <div className="section-header">
        <div className="section-title">🎓 بيانات الطلاب</div>
        <input
          className="search-input"
          placeholder="ابحث بالاسم أو الهاتف..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>الاسم الكامل</th>
              <th>هاتف الطالب</th>
              <th>هاتف الأب</th>
              <th>هاتف الأم</th>
              <th>الرقم القومي</th>
              <th>المحفظة</th>
              <th>الكورسات</th>
              <th>تاريخ التسجيل</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={9} style={{ textAlign: "center", padding: "3rem", color: "var(--muted)" }}>⏳ جاري التحميل...</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={9} style={{ textAlign: "center", padding: "3rem", color: "var(--muted)" }}>لا يوجد طلاب</td></tr>
            )}
            {filtered.map(s => (
              <tr key={s.id}>
                <td style={{ fontWeight: 800 }}>{s.fullName || "—"}</td>
                <td style={{ direction: "ltr", color: "var(--teal)" }}>{s.studentPhone || s.id}</td>
                <td style={{ direction: "ltr" }}>{s.fatherPhone || "—"}</td>
                <td style={{ direction: "ltr" }}>{s.motherPhone || "—"}</td>
                <td style={{ direction: "ltr", fontSize: "0.8rem" }}>{s.nationalID || "—"}</td>
                <td>
                  <span className="badge badge-yellow">{s.walletBalance || 0} ج</span>
                </td>
                <td>
                  <span className="badge badge-blue">
                    {s.subscribedCourses?.length || 0} كورس
                  </span>
                </td>
                <td style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{formatDate(s.createdAt)}</td>
                <td>
                  <div className="action-btns">
                    <button className="btn-sm" onClick={() => setSelected(s)}>👁️ تفاصيل</button>
                    <button className="btn-sm danger" onClick={() => deleteStudent(s.id)}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal تفاصيل الطالب */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-title">👤 تفاصيل الطالب</div>
            {[
              ["الاسم الكامل", selected.fullName],
              ["هاتف الطالب", selected.studentPhone || selected.id],
              ["هاتف الأب", selected.fatherPhone || "—"],
              ["هاتف الأم", selected.motherPhone || "—"],
              ["الرقم القومي", selected.nationalID || "—"],
              ["العمر", selected.age || "—"],
              ["المحفظة", `${selected.walletBalance || 0} جنيه`],
              ["الكورسات المشترك فيها", selected.subscribedCourses?.join(", ") || "لا يوجد"],
              ["الفيديوهات المشاهدة", selected.watchedVideos?.length || 0],
              ["كلمة السر", selected.password || "—"],
              ["تاريخ التسجيل", formatDate(selected.createdAt)],
            ].map(([key, val]) => (
              <div className="modal-row" key={key}>
                <span className="modal-key">{key}</span>
                <span className="modal-val">{val}</span>
              </div>
            ))}
            <button className="modal-close" onClick={() => setSelected(null)}>إغلاق</button>
          </div>
        </div>
      )}
    </>
  );
}

// ==================== CODES TAB ====================
function CodesTab() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [newCode, setNewCode] = useState({ code: "", courseId: "month1", studentName: "" });
  const [toast, showToast] = useToast();

  useEffect(() => { fetchCodes(); }, []);

  async function fetchCodes() {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "activation_codes"));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setCodes(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function addCode() {
    const code = newCode.code.trim() || genCode();
    if (!code) return;
    const codeDoc = {
      code,
      courseId: newCode.courseId,
      courseName: newCode.courseId === "month1" ? "كورس الشهر الأول" : "كورس الشهر الثاني",
      studentName: newCode.studentName.trim() || "—",
      used: false,
      usedBy: null,
      usedAt: null,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, "activation_codes", code), codeDoc);
    setCodes(c => [{ id: code, ...codeDoc }, ...c]);
    setNewCode({ code: "", courseId: "month1", studentName: "" });
    setShowForm(false);
    showToast(`تم إنشاء الكود: ${code}`, "🎟️");
  }

  async function deleteCode(id) {
    if (!confirm("هتحذف الكود ده؟")) return;
    await deleteDoc(doc(db, "activation_codes", id));
    setCodes(c => c.filter(x => x.id !== id));
    showToast("تم حذف الكود", "🗑️");
  }

  async function toggleUsed(codeObj) {
    const newVal = !codeObj.used;
    await updateDoc(doc(db, "activation_codes", codeObj.id), { used: newVal });
    setCodes(c => c.map(x => x.id === codeObj.id ? { ...x, used: newVal } : x));
    showToast(newVal ? "تم تعليم الكود كمستخدم" : "تم إعادة تفعيل الكود", "🔄");
  }

  const filtered = codes.filter(c =>
    (c.code || c.id).includes(search.toUpperCase()) ||
    (c.studentName || "").includes(search) ||
    (c.courseName || "").includes(search) ||
    (c.usedBy || "").includes(search)
  );

  const usedCount = codes.filter(c => c.used).length;
  const availCount = codes.filter(c => !c.used).length;

  return (
    <>
      <div className={`toast ${toast.show ? "show" : ""}`}>{toast.icon} {toast.msg}</div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="num">{codes.length}</div>
          <div className="lbl">إجمالي الأكواد</div>
        </div>
        <div className="stat-card">
          <div className="num" style={{ color: "var(--teal)" }}>{availCount}</div>
          <div className="lbl">متاحة</div>
        </div>
        <div className="stat-card">
          <div className="num" style={{ color: "var(--muted)" }}>{usedCount}</div>
          <div className="lbl">مستخدمة</div>
        </div>
      </div>

      <div className="section-header">
        <div className="section-title">🎟️ أكواد التفعيل</div>
        <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap", alignItems: "center" }}>
          <input
            className="search-input"
            placeholder="ابحث بالكود أو الاسم..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button className="btn-add" onClick={() => setShowForm(s => !s)}>
            {showForm ? "✕ إلغاء" : "＋ كود جديد"}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="add-code-form">
          <div className="form-field">
            <label>الكود (اتركه فاضي للتوليد التلقائي)</label>
            <input
              placeholder="مثال: ABCD-1234"
              value={newCode.code}
              onChange={e => setNewCode(n => ({ ...n, code: e.target.value.toUpperCase() }))}
              style={{ direction: "ltr", letterSpacing: "2px" }}
            />
          </div>
          <div className="form-field">
            <label>الكورس</label>
            <select
              value={newCode.courseId}
              onChange={e => setNewCode(n => ({ ...n, courseId: e.target.value }))}
            >
              <option value="month1">كورس الشهر الأول</option>
              <option value="month2">كورس الشهر الثاني</option>
            </select>
          </div>
          <div className="form-field">
            <label>اسم الطالب (اختياري)</label>
            <input
              placeholder="مثال: أحمد محمد"
              value={newCode.studentName}
              onChange={e => setNewCode(n => ({ ...n, studentName: e.target.value }))}
            />
          </div>
          <button className="btn-add" onClick={addCode}>إضافة</button>
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>الكود</th>
              <th>الكورس</th>
              <th>مخصص لـ</th>
              <th>الحالة</th>
              <th>استخدم بواسطة</th>
              <th>تاريخ الاستخدام</th>
              <th>تاريخ الإنشاء</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} style={{ textAlign: "center", padding: "3rem", color: "var(--muted)" }}>⏳ جاري التحميل...</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: "center", padding: "3rem", color: "var(--muted)" }}>لا يوجد أكواد</td></tr>
            )}
            {filtered.map(c => (
              <tr key={c.id}>
                <td style={{ direction: "ltr", fontFamily: "monospace", fontWeight: 800, fontSize: "1rem", color: "var(--teal)", letterSpacing: "2px" }}>
                  {c.code || c.id}
                </td>
                <td><span className="badge badge-blue">{c.courseName || c.courseId}</span></td>
                <td>{c.studentName || "—"}</td>
                <td>
                  {c.used
                    ? <span className="badge badge-red">مستخدم ✓</span>
                    : <span className="badge badge-teal">متاح ✓</span>
                  }
                </td>
                <td style={{ color: c.usedBy ? "var(--white)" : "var(--muted)" }}>
                  {c.usedBy || "—"}
                </td>
                <td style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{formatDate(c.usedAt)}</td>
                <td style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{formatDate(c.createdAt)}</td>
                <td>
                  <div className="action-btns">
                    <button className="btn-sm" onClick={() => toggleUsed(c)}>🔄</button>
                    <button className="btn-sm danger" onClick={() => deleteCode(c.id)}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ==================== MAIN ADMIN PAGE ====================
export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [passInput, setPassInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [activeTab, setActiveTab] = useState("messages");
  const [counts, setCounts] = useState({ messages: 0, students: 0, codes: 0 });

  useEffect(() => {
    const saved = sessionStorage.getItem("admin_authed");
    if (saved === "1") setAuthed(true);
  }, []);

  useEffect(() => {
    if (!authed) return;
    async function loadCounts() {
      try {
        const [m, s, c] = await Promise.all([
          getDocs(collection(db, "support_messages")),
          getDocs(collection(db, "students")),
          getDocs(collection(db, "activation_codes")),
        ]);
        setCounts({ messages: m.size, students: s.size, codes: c.size });
      } catch (e) {}
    }
    loadCounts();
  }, [authed]);

  function handleLogin() {
    const correctPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;
    if (passInput === correctPassword) {
      sessionStorage.setItem("admin_authed", "1");
      setAuthed(true);
    } else {
      setLoginError("كلمة السر غلط، حاول تاني");
    }
  }

  function handleLogout() {
    sessionStorage.removeItem("admin_authed");
    setAuthed(false);
    setPassInput("");
  }

  if (!authed) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <div className="login-screen">
          <div className="login-box">
            <div className="login-icon">🔐</div>
            <h1>لوحة تحكم الأدمن</h1>
            <p>منصة د. أحمد تمام — دخول مخصص للإدارة فقط</p>
            <input
              type="password"
              className="login-input"
              placeholder="كلمة السر"
              value={passInput}
              onChange={e => setPassInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
            />
            <button className="login-btn" onClick={handleLogin}>دخول ⚡</button>
            {loginError && <div className="login-error">⚠️ {loginError}</div>}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div className="admin-wrapper">
        <header className="admin-header">
          <div className="admin-logo">Dr. Ahmed <span>Tammam</span> — Admin</div>
          <button className="logout-btn" onClick={handleLogout}>تسجيل الخروج</button>
        </header>

        <div className="tabs-bar">
          <button
            className={`tab-btn ${activeTab === "messages" ? "active" : ""}`}
            onClick={() => setActiveTab("messages")}
          >
            📥 رسائل الدعم
            {counts.messages > 0 && <span className="tab-badge">{counts.messages}</span>}
          </button>
          <button
            className={`tab-btn ${activeTab === "students" ? "active" : ""}`}
            onClick={() => setActiveTab("students")}
          >
            🎓 الطلاب
            {counts.students > 0 && <span className="tab-badge">{counts.students}</span>}
          </button>
          <button
            className={`tab-btn ${activeTab === "codes" ? "active" : ""}`}
            onClick={() => setActiveTab("codes")}
          >
            🎟️ الأكواد
            {counts.codes > 0 && <span className="tab-badge">{counts.codes}</span>}
          </button>
        </div>

        <main className="admin-main">
          {activeTab === "messages" && <MessagesTab />}
          {activeTab === "students" && <StudentsTab />}
          {activeTab === "codes" && <CodesTab />}
        </main>
      </div>
    </>
  );
}
