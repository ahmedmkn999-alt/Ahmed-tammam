// app/lectures/[courseId]/page.js
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #050507;
    --card: #0d0f14;
    --border: #1a1e2a;
    --teal: #00FFB3;
    --teal-glow: rgba(0,255,179,0.3);
    --blue: #00b3ff;
    --muted: #5a6070;
    --white: #f0f2f5;
    --red: #ff4d6d;
  }
  body { background: var(--bg); color: var(--white); font-family: 'Cairo', sans-serif; direction: rtl; min-height: 100vh; }

  /* ===== HEADER ===== */
  .lec-header {
    background: var(--card);
    border-bottom: 1px solid var(--border);
    padding: 1rem 1.5rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    position: sticky;
    top: 0;
    z-index: 100;
  }
  .back-btn {
    background: rgba(255,255,255,0.05);
    border: 1px solid var(--border);
    color: var(--white);
    width: 38px; height: 38px;
    border-radius: 10px;
    cursor: pointer;
    font-size: 1.1rem;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.2s;
    flex-shrink: 0;
  }
  .back-btn:hover { border-color: var(--teal); color: var(--teal); }
  .header-title { font-size: 1.1rem; font-weight: 800; }
  .header-title span { color: var(--teal); }

  /* ===== VIDEO PLAYER ===== */
  .player-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.95);
    z-index: 1000;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }
  .player-top {
    width: 100%;
    max-width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.8rem;
  }
  .player-title { font-size: 1rem; font-weight: 700; color: var(--white); }
  .player-close {
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.2);
    color: var(--white);
    width: 38px; height: 38px;
    border-radius: 10px;
    cursor: pointer;
    font-size: 1.2rem;
    display: flex; align-items: center; justify-content: center;
  }
  .player-close:hover { background: var(--red); border-color: var(--red); }
  .video-wrapper {
    width: 100%;
    max-width: 100%;
    aspect-ratio: 16/9;
    background: #000;
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid var(--border);
    position: relative;
  }
  .video-wrapper video, .video-wrapper iframe {
    width: 100%; height: 100%;
    object-fit: contain;
  }
  .player-controls {
    width: 100%;
    max-width: 100%;
    margin-top: 1rem;
    display: flex;
    align-items: center;
    gap: 0.8rem;
  }
  .ctrl-btn {
    background: rgba(255,255,255,0.05);
    border: 1px solid var(--border);
    color: var(--white);
    padding: 0.5rem 1rem;
    border-radius: 10px;
    cursor: pointer;
    font-family: 'Cairo', sans-serif;
    font-size: 0.85rem;
    font-weight: 700;
    transition: all 0.2s;
    display: flex; align-items: center; gap: 6px;
  }
  .ctrl-btn:hover { border-color: var(--teal); color: var(--teal); }
  .ctrl-btn.active { background: rgba(0,255,179,0.1); border-color: var(--teal); color: var(--teal); }
  .progress-bar {
    flex: 1;
    height: 6px;
    background: var(--border);
    border-radius: 3px;
    cursor: pointer;
    position: relative;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--teal), var(--blue));
    border-radius: 3px;
    transition: width 0.1s;
  }

  /* ===== MAIN LAYOUT ===== */
  .main-wrap {
    max-width: 100%;
    margin: 0 auto;
    padding: 1.5rem 1rem 4rem;
  }

  /* ===== LECTURE CARD ===== */
  .lecture-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 20px;
    margin-bottom: 1.5rem;
    overflow: hidden;
    transition: border-color 0.3s;
  }
  .lecture-card:hover { border-color: rgba(0,255,179,0.3); }

  .lecture-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.2rem;
    cursor: pointer;
    user-select: none;
  }
  .lecture-thumb {
    width: 80px;
    height: 80px;
    border-radius: 12px;
    object-fit: cover;
    flex-shrink: 0;
    border: 2px solid var(--border);
  }
  .lecture-info { flex: 1; }
  .lecture-num {
    font-size: 0.75rem;
    color: var(--teal);
    font-weight: 700;
    margin-bottom: 4px;
    letter-spacing: 1px;
  }
  .lecture-name {
    font-size: 1rem;
    font-weight: 800;
    color: var(--white);
    margin-bottom: 6px;
  }
  .lecture-meta {
    display: flex;
    gap: 0.8rem;
    flex-wrap: wrap;
  }
  .meta-badge {
    font-size: 0.72rem;
    color: var(--muted);
    background: rgba(255,255,255,0.03);
    border: 1px solid var(--border);
    padding: 2px 8px;
    border-radius: 6px;
    display: flex; align-items: center; gap: 4px;
  }
  .chevron {
    color: var(--muted);
    font-size: 1rem;
    transition: transform 0.3s;
    flex-shrink: 0;
  }
  .chevron.open { transform: rotate(180deg); }

  /* ===== VIDEOS LIST ===== */
  .videos-list {
    border-top: 1px solid var(--border);
    display: none;
  }
  .videos-list.open { display: block; }

  .video-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.9rem 1.2rem;
    border-bottom: 1px solid rgba(255,255,255,0.03);
    cursor: pointer;
    transition: background 0.2s;
  }
  .video-item:last-child { border-bottom: none; }
  .video-item:hover { background: rgba(0,255,179,0.03); }

  .video-type-icon {
    width: 38px; height: 38px;
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-size: 1rem;
    flex-shrink: 0;
  }
  .type-sharh { background: rgba(0,255,179,0.1); border: 1px solid rgba(0,255,179,0.2); }
  .type-hal { background: rgba(0,179,255,0.1); border: 1px solid rgba(0,179,255,0.2); }
  .type-wageb { background: rgba(255,159,67,0.1); border: 1px solid rgba(255,159,67,0.2); }
  .type-extra { background: rgba(157,0,255,0.1); border: 1px solid rgba(157,0,255,0.2); }

  .video-info { flex: 1 }
  .video-name { font-size: 0.9rem; font-weight: 700; color: var(--white); }
  .video-duration { font-size: 0.75rem; color: var(--muted); margin-top: 2px; }

  .play-btn {
    background: linear-gradient(135deg, var(--teal), var(--blue));
    border: none;
    color: #000;
    width: 34px; height: 34px;
    border-radius: 10px;
    cursor: pointer;
    font-size: 0.9rem;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 0 12px var(--teal-glow);
    flex-shrink: 0;
    transition: transform 0.2s;
  }
  .play-btn:hover { transform: scale(1.1); }

  /* ===== SECTION TITLE ===== */
  .section-title {
    font-size: 1.2rem;
    font-weight: 900;
    color: var(--white);
    margin-bottom: 1.2rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .section-title::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border);
    margin-right: 0.5rem;
  }

  @media (max-width: 480px) {
    .lec-header { padding: 0.8rem 1rem; }
    .header-title { font-size: 0.9rem; }
    .main-wrap { padding: 1rem 0.8rem 3rem; }
    .lecture-thumb { width: 55px; height: 55px; }
    .lecture-name { font-size: 0.88rem; }
    .video-name { font-size: 0.82rem; }
    .ctrl-btn { padding: 0.4rem 0.7rem; font-size: 0.78rem; }
    .player-title { font-size: 0.85rem; }
  }
  @media (max-width: 600px) {
    .lecture-thumb { width: 65px; height: 65px; }
    .player-controls { flex-wrap: wrap; gap: 0.5rem; }
    .progress-bar { width: 100%; order: 10; }
  }
  @media (min-width: 768px) {
    .lec-header { padding: 1rem 2rem; }
    .main-wrap { padding: 1.5rem 2rem 4rem; max-width: 860px; margin: 0 auto; }
    .lecture-header { padding: 1.2rem 1.5rem; }
    .lecture-thumb { width: 95px; height: 95px; }
    .lecture-name { font-size: 1.05rem; }
  }
  @media (min-width: 1100px) {
    .main-wrap { max-width: 1000px; }
    .video-wrapper { max-width: 1000px; }
    .player-top, .player-controls { max-width: 1000px; }
  }
`;

// ===== بيانات الكورسات والمحاضرات =====
const COURSES_DATA = {
  month1: {
    name: "كورس الشهر الأول",
    lectures: [
      {
        id: "lec1",
        name: "المحاضرة الأولى — مقدمة في علم الأحياء",
        thumb: "https://i.postimg.cc/tRDnXjxX/IMG-20260618-061351.png",
        videos: [
          { id: "v1", name: "شرح المحاضرة الأولى", type: "sharh", icon: "🎓", duration: "45 دقيقة", url: "https://www.w3schools.com/html/mov_bbb.mp4" },
          { id: "v2", name: "حل أسئلة المحاضرة", type: "hal", icon: "✏️", duration: "30 دقيقة", url: "https://www.w3schools.com/html/mov_bbb.mp4" },
          { id: "v3", name: "الواجب والتطبيق", type: "wageb", icon: "📝", duration: "20 دقيقة", url: "https://www.w3schools.com/html/mov_bbb.mp4" },
        ]
      },
      {
        id: "lec2",
        name: "المحاضرة الثانية — الخلية ومكوناتها",
        thumb: "https://i.postimg.cc/tRDnXjxX/IMG-20260618-061351.png",
        videos: [
          { id: "v4", name: "شرح المحاضرة الثانية", type: "sharh", icon: "🎓", duration: "50 دقيقة", url: "https://www.w3schools.com/html/mov_bbb.mp4" },
          { id: "v5", name: "حل أسئلة الخلية", type: "hal", icon: "✏️", duration: "35 دقيقة", url: "https://www.w3schools.com/html/mov_bbb.mp4" },
          { id: "v6", name: "زجب وملخص الخلية", type: "extra", icon: "⚡", duration: "15 دقيقة", url: "https://www.w3schools.com/html/mov_bbb.mp4" },
          { id: "v7", name: "الواجب الثاني", type: "wageb", icon: "📝", duration: "25 دقيقة", url: "https://www.w3schools.com/html/mov_bbb.mp4" },
        ]
      },
      {
        id: "lec3",
        name: "المحاضرة الثالثة — الأنسجة النباتية",
        thumb: "https://i.postimg.cc/tRDnXjxX/IMG-20260618-061351.png",
        videos: [
          { id: "v8", name: "شرح الأنسجة النباتية", type: "sharh", icon: "🎓", duration: "55 دقيقة", url: "https://www.w3schools.com/html/mov_bbb.mp4" },
          { id: "v9", name: "حل أسئلة الأنسجة", type: "hal", icon: "✏️", duration: "40 دقيقة", url: "https://www.w3schools.com/html/mov_bbb.mp4" },
          { id: "v10", name: "زجب المحاضرة الثالثة", type: "extra", icon: "⚡", duration: "18 دقيقة", url: "https://www.w3schools.com/html/mov_bbb.mp4" },
        ]
      },
      {
        id: "lec4",
        name: "المحاضرة الرابعة — الأنسجة الحيوانية",
        thumb: "https://i.postimg.cc/tRDnXjxX/IMG-20260618-061351.png",
        videos: [
          { id: "v11", name: "شرح الأنسجة الحيوانية", type: "sharh", icon: "🎓", duration: "48 دقيقة", url: "https://www.w3schools.com/html/mov_bbb.mp4" },
          { id: "v12", name: "حل أسئلة شامل", type: "hal", icon: "✏️", duration: "38 دقيقة", url: "https://www.w3schools.com/html/mov_bbb.mp4" },
          { id: "v13", name: "الواجب الرابع", type: "wageb", icon: "📝", duration: "22 دقيقة", url: "https://www.w3schools.com/html/mov_bbb.mp4" },
          { id: "v14", name: "زجب وملخص الشهر الأول", type: "extra", icon: "⚡", duration: "30 دقيقة", url: "https://www.w3schools.com/html/mov_bbb.mp4" },
        ]
      },
    ]
  },
  month2: {
    name: "كورس الشهر الثاني",
    lectures: [
      {
        id: "lec5",
        name: "المحاضرة الأولى — الجهاز الهضمي",
        thumb: "https://i.postimg.cc/d3Whn2YD/IMG-20260618-061428.png",
        videos: [
          { id: "v15", name: "شرح الجهاز الهضمي", type: "sharh", icon: "🎓", duration: "52 دقيقة", url: "https://www.w3schools.com/html/mov_bbb.mp4" },
          { id: "v16", name: "حل أسئلة الجهاز الهضمي", type: "hal", icon: "✏️", duration: "35 دقيقة", url: "https://www.w3schools.com/html/mov_bbb.mp4" },
          { id: "v17", name: "واجب الجهاز الهضمي", type: "wageb", icon: "📝", duration: "20 دقيقة", url: "https://www.w3schools.com/html/mov_bbb.mp4" },
        ]
      },
      {
        id: "lec6",
        name: "المحاضرة الثانية — الجهاز الدوري",
        thumb: "https://i.postimg.cc/d3Whn2YD/IMG-20260618-061428.png",
        videos: [
          { id: "v18", name: "شرح الجهاز الدوري", type: "sharh", icon: "🎓", duration: "58 دقيقة", url: "https://www.w3schools.com/html/mov_bbb.mp4" },
          { id: "v19", name: "حل أسئلة الجهاز الدوري", type: "hal", icon: "✏️", duration: "42 دقيقة", url: "https://www.w3schools.com/html/mov_bbb.mp4" },
          { id: "v20", name: "زجب الجهاز الدوري", type: "extra", icon: "⚡", duration: "16 دقيقة", url: "https://www.w3schools.com/html/mov_bbb.mp4" },
        ]
      },
      {
        id: "lec7",
        name: "المحاضرة الثالثة — الجهاز التنفسي",
        thumb: "https://i.postimg.cc/d3Whn2YD/IMG-20260618-061428.png",
        videos: [
          { id: "v21", name: "شرح الجهاز التنفسي", type: "sharh", icon: "🎓", duration: "47 دقيقة", url: "https://www.w3schools.com/html/mov_bbb.mp4" },
          { id: "v22", name: "حل أسئلة التنفس", type: "hal", icon: "✏️", duration: "33 دقيقة", url: "https://www.w3schools.com/html/mov_bbb.mp4" },
          { id: "v23", name: "واجب الجهاز التنفسي", type: "wageb", icon: "📝", duration: "18 دقيقة", url: "https://www.w3schools.com/html/mov_bbb.mp4" },
        ]
      },
      {
        id: "lec8",
        name: "المحاضرة الرابعة — الجهاز العصبي",
        thumb: "https://i.postimg.cc/d3Whn2YD/IMG-20260618-061428.png",
        videos: [
          { id: "v24", name: "شرح الجهاز العصبي", type: "sharh", icon: "🎓", duration: "60 دقيقة", url: "https://www.w3schools.com/html/mov_bbb.mp4" },
          { id: "v25", name: "حل أسئلة الجهاز العصبي", type: "hal", icon: "✏️", duration: "45 دقيقة", url: "https://www.w3schools.com/html/mov_bbb.mp4" },
          { id: "v26", name: "زجب وملخص الشهر الثاني", type: "extra", icon: "⚡", duration: "28 دقيقة", url: "https://www.w3schools.com/html/mov_bbb.mp4" },
          { id: "v27", name: "الواجب الختامي", type: "wageb", icon: "📝", duration: "35 دقيقة", url: "https://www.w3schools.com/html/mov_bbb.mp4" },
        ]
      },
    ]
  }
};

const VIDEO_TYPES = {
  sharh: { label: "شرح", color: "#00FFB3" },
  hal:   { label: "حل", color: "#00b3ff" },
  wageb: { label: "واجب", color: "#ff9f43" },
  extra: { label: "زجب", color: "#9d00ff" },
};

export default function LecturesPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params?.courseId || "month1";
  const course = COURSES_DATA[courseId] || COURSES_DATA.month1;

  const [openLec, setOpenLec] = useState(null);
  const [activeVideo, setActiveVideo] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);
  const videoRef = useRef(null);

  // تحقق من تسجيل الدخول
  useEffect(() => {
    const saved = localStorage.getItem("currentUser");
    if (!saved) router.replace("/login");
  }, []);

  function openVideo(video) {
    setActiveVideo(video);
    setIsPlaying(false);
    setProgress(0);
  }

  function closeVideo() {
    if (videoRef.current) videoRef.current.pause();
    setActiveVideo(null);
    setIsPlaying(false);
  }

  function togglePlay() {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }

  function handleTimeUpdate() {
    if (!videoRef.current) return;
    const pct = (videoRef.current.currentTime / videoRef.current.duration) * 100;
    setProgress(isNaN(pct) ? 0 : pct);
  }

  function handleProgressClick(e) {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pct * videoRef.current.duration;
  }

  function changeSpeed() {
    const speeds = [0.75, 1, 1.25, 1.5, 2];
    const idx = speeds.indexOf(speed);
    const next = speeds[(idx + 1) % speeds.length];
    setSpeed(next);
    if (videoRef.current) videoRef.current.playbackRate = next;
  }

  function skipTime(sec) {
    if (!videoRef.current) return;
    videoRef.current.currentTime += sec;
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet" />

      {/* ===== مشغل الفيديو العالمي ===== */}
      {activeVideo && (
        <div className="player-overlay">
          <div className="player-top">
            <div className="player-title">▶ {activeVideo.name}</div>
            <button className="player-close" onClick={closeVideo}>✕</button>
          </div>

          <div className="video-wrapper">
            <video
              ref={videoRef}
              src={activeVideo.url}
              onTimeUpdate={handleTimeUpdate}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              style={{ background: "#000" }}
            />
          </div>

          <div className="player-controls">
            {/* زرار رجوع */}
            <button className="ctrl-btn" onClick={() => skipTime(-10)}>⏪ 10</button>

            {/* تشغيل / إيقاف */}
            <button className="ctrl-btn" onClick={togglePlay} style={{ minWidth: "80px", justifyContent: "center" }}>
              {isPlaying ? "⏸ إيقاف" : "▶ تشغيل"}
            </button>

            {/* تقديم */}
            <button className="ctrl-btn" onClick={() => skipTime(10)}>10 ⏩</button>

            {/* شريط التقدم */}
            <div className="progress-bar" onClick={handleProgressClick}>
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>

            {/* السرعة */}
            <button className="ctrl-btn" onClick={changeSpeed}>
              🚀 {speed}x
            </button>
          </div>
        </div>
      )}

      {/* ===== الهيدر ===== */}
      <header className="lec-header">
        <button className="back-btn" onClick={() => router.back()}>→</button>
        <div className="header-title">
          محاضرات <span>{course.name}</span>
        </div>
      </header>

      {/* ===== المحتوى ===== */}
      <div className="main-wrap">
        <div className="section-title">📚 المحاضرات</div>

        {course.lectures.map((lec, idx) => (
          <div key={lec.id} className="lecture-card">
            {/* رأس المحاضرة */}
            <div className="lecture-header" onClick={() => setOpenLec(openLec === lec.id ? null : lec.id)}>
              <img src={lec.thumb} alt={lec.name} className="lecture-thumb" />
              <div className="lecture-info">
                <div className="lecture-num">المحاضرة {idx + 1}</div>
                <div className="lecture-name">{lec.name}</div>
                <div className="lecture-meta">
                  <span className="meta-badge">🎬 {lec.videos.length} فيديوهات</span>
                  {lec.videos.map(v => (
                    <span key={v.id} className="meta-badge" style={{ color: VIDEO_TYPES[v.type]?.color }}>
                      {VIDEO_TYPES[v.type]?.label}
                    </span>
                  ))}
                </div>
              </div>
              <span className={`chevron ${openLec === lec.id ? "open" : ""}`}>▼</span>
            </div>

            {/* قائمة الفيديوهات */}
            <div className={`videos-list ${openLec === lec.id ? "open" : ""}`}>
              {lec.videos.map((video) => (
                <div key={video.id} className="video-item" onClick={() => openVideo(video)}>
                  <div className={`video-type-icon type-${video.type}`}>{video.icon}</div>
                  <div className="video-info">
                    <div className="video-name">{video.name}</div>
                    <div className="video-duration">⏱ {video.duration}</div>
                  </div>
                  <span style={{ fontSize: "0.75rem", color: VIDEO_TYPES[video.type]?.color, fontWeight: 700, marginLeft: "0.5rem" }}>
                    {VIDEO_TYPES[video.type]?.label}
                  </span>
                  <button className="play-btn">▶</button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
