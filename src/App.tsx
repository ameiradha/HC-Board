import React, { useState, useEffect } from "react";
import { HIJAIYAH_LETTERS, HijaiyahLetter } from "./data/hijaiyah";
import { tryInitializeFirebase, loginWithGoogle, logoutUser, isConfigured } from "./db/firebase";
import { playClick, playBeep, playLevelUp } from "./utils/audio";
import AIEvaluator from "./components/AIEvaluator";
import QRScanner from "./components/QRScanner";
import QuizView from "./components/QuizView";
import ProgressCharts from "./components/ProgressCharts";
import { 
  BookOpen, QrCode, Mic, Trophy, TrendingUp, Download, Settings, 
  Menu, Sparkles, Star, Zap, Volume2, VolumeX, RefreshCw, Trash2, User, HelpCircle
} from "lucide-react";

export default function App() {
  const [activePanel, setActivePanel] = useState<string>("scan");
  const [currentLetterIndex, setCurrentLetterIndex] = useState(0);
  const [autoPlayTts, setAutoPlayTts] = useState<boolean>(false);

  // Gamification Currencies (synchronized in localStorage)
  const [totalXp, setTotalXp] = useState<number>(() => {
    const saved = localStorage.getItem("hijaiyah_xp");
    return saved ? parseInt(saved) : 0;
  });
  
  const [highScore, setHighScore] = useState<number>(() => {
    const saved = localStorage.getItem("hijaiyah_quiz_high");
    return saved ? parseInt(saved) : 0;
  });

  const [masteryRecord, setMasteryRecord] = useState<Record<number, number>>(() => {
    const saved = localStorage.getItem("hijaiyah_mastery");
    return saved ? JSON.parse(saved) : {};
  });

  // Settings
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem("hijaiyah_username") || "Murid Bijak";
  });
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [confirmReset, setConfirmReset] = useState<boolean>(false);
  const [resetSuccess, setResetSuccess] = useState<boolean>(false);
  
  // Auth
  const [user, setUser] = useState<any>(null);
  const [firebaseReady, setFirebaseReady] = useState(false);

  // Init Firebase check
  useEffect(() => {
    tryInitializeFirebase().then((ok) => {
      setFirebaseReady(ok);
    });
  }, []);

  // Sync state changes with local storage
  useEffect(() => {
    localStorage.setItem("hijaiyah_xp", totalXp.toString());
  }, [totalXp]);

  useEffect(() => {
    localStorage.setItem("hijaiyah_quiz_high", highScore.toString());
  }, [highScore]);

  useEffect(() => {
    localStorage.setItem("hijaiyah_mastery", JSON.stringify(masteryRecord));
  }, [masteryRecord]);

  const addXp = (amount: number) => {
    setTotalXp((prev) => {
      const next = prev + amount;
      // Trigger level up sound occasionally
      if (Math.floor(next / 150) > Math.floor(prev / 150)) {
        playLevelUp();
      }
      return next;
    });
  };

  const updateLetterMastery = (letterId: number, score: number) => {
    setMasteryRecord((prev) => {
      const prevScore = prev[letterId] || 0;
      if (score > prevScore) {
        return { ...prev, [letterId]: score };
      }
      return prev;
    });
  };

  const handleUpdateHighScore = (score: number) => {
    setHighScore(score);
  };

  const handleClearProgress = () => {
    playBeep();
    setTotalXp(0);
    setHighScore(0);
    setMasteryRecord({});
    localStorage.removeItem("hijaiyah_xp");
    localStorage.removeItem("hijaiyah_quiz_high");
    localStorage.removeItem("hijaiyah_mastery");
    setResetSuccess(true);
    setConfirmReset(false);
    setTimeout(() => {
      setResetSuccess(false);
    }, 4000);
  };

  const handleGoogleSignIn = async () => {
    playBeep();
    try {
      const result = await loginWithGoogle();
      if (result) {
        setUser(result);
        setUserName(result.displayName || "Pelajar Pintar");
        localStorage.setItem("hijaiyah_username", result.displayName || "Pelajar Pintar");
      }
    } catch (e: any) {
      alert("Gagal daftar masuk: " + e.message);
    }
  };

  const handleSignOut = async () => {
    playClick();
    await logoutUser();
    setUser(null);
    setUserName("Murid Bijak");
    localStorage.setItem("hijaiyah_username", "Murid Bijak");
  };

  // 7-Core UI Panels Dispatcher
  const renderActiveComponent = () => {
    switch (activePanel) {
      case "belajar":
        return (
          <AIEvaluator
            letter={HIJAIYAH_LETTERS[currentLetterIndex]}
            onNextLetter={() => {
              playClick();
              setCurrentLetterIndex((prev) => (prev + 1) % HIJAIYAH_LETTERS.length);
            }}
            onPrevLetter={() => {
              playClick();
              setCurrentLetterIndex((prev) => (prev - 1 + HIJAIYAH_LETTERS.length) % HIJAIYAH_LETTERS.length);
            }}
            addXp={addXp}
            updateLetterMastery={updateLetterMastery}
            autoPlayOnMount={autoPlayTts}
            onClearAutoPlay={() => setAutoPlayTts(false)}
          />
        );
      case "scan":
        return (
          <QRScanner
            onScanned={(letter) => {
              playClick();
              // When scanned, load letter index and slide to learn panel
              const idx = HIJAIYAH_LETTERS.findIndex((x) => x.id === letter.id);
              if (idx !== -1) {
                setCurrentLetterIndex(idx);
                setAutoPlayTts(true);
                setActivePanel("belajar");
              }
            }}
          />
        );
      case "latih":
        return (
          <div className="space-y-8 max-w-4xl mx-auto">
            <div className="text-center bg-gradient-to-r from-sky-400 to-sky-500 p-6 rounded-[32px] text-white shadow-md">
              <h2 className="text-2xl sm:text-3xl font-display font-black tracking-tight">Latih Sebutan Makhraj 🗣️</h2>
              <p className="text-sky-100 text-xs sm:text-sm mt-2 font-medium">Pilih huruf Hijaiyah di bawah untuk dinilai sebutan oleh Penilai AI secara masa nyata!</p>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-4">
              {HIJAIYAH_LETTERS.map((letter) => {
                const isMastered = (masteryRecord[letter.id] || 0) >= 80;
                return (
                  <button
                    key={letter.id}
                    onClick={() => {
                      playClick();
                      const idx = HIJAIYAH_LETTERS.findIndex((x) => x.id === letter.id);
                      if (idx !== -1) {
                        setCurrentLetterIndex(idx);
                        setActivePanel("belajar");
                      }
                    }}
                    className={`py-5 px-3 bg-white rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all duration-150 relative ${
                      isMastered 
                        ? "border-4 border-emerald-400 bg-emerald-50/30 shadow-[0_8px_0_#10b981] hover:-translate-y-1 active:translate-y-0.5 active:shadow-[0_2px_0_#10b981]" 
                        : "border-4 border-slate-100 shadow-[0_8px_0_#e2e8f0] hover:-translate-y-1 hover:shadow-[0_12px_0_#e2e8f0] hover:border-sky-200 active:translate-y-0.5 active:shadow-[0_2px_0_#e2e8f0] active:border-slate-100"
                    }`}
                  >
                    <span className="text-4xl font-black text-slate-800 font-serif leading-none">{letter.char}</span>
                    <span className="text-[11px] font-black text-slate-500 mt-2 font-display uppercase tracking-wider">{letter.name}</span>
                    {isMastered && (
                      <span className="absolute -top-2.5 -right-2 bg-gradient-to-r from-emerald-400 to-emerald-500 text-white text-[9px] font-black px-2.5 py-0.5 rounded-full shadow-sm font-display uppercase border border-emerald-300">
                        Lulus ⭐
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      case "kuiz":
        return (
          <QuizView
            addXp={addXp}
            updateLetterMastery={updateLetterMastery}
            highScore={highScore}
            onUpdateHighScore={handleUpdateHighScore}
          />
        );
      case "kemajuan":
        return (
          <ProgressCharts
            masteryRecord={masteryRecord}
            totalXp={totalXp}
          />
        );
      case "tetapan":
        return (
          <div className="max-w-xl mx-auto space-y-6" id="settings-stage">
            <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-md space-y-6">
              <div>
                <h3 className="text-lg font-black text-slate-800 font-sans tracking-tight">Urus Profil Murid &amp; Suara</h3>
                <p className="text-slate-500 text-xs mt-0.5">Selaraskan tetapan mikrofon, bunyi suapan balik, atau log masuk Firebase.</p>
              </div>

              {/* Character Profile Name edit */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 block">Nama Murid Bijak:</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => {
                    setUserName(e.target.value);
                    localStorage.setItem("hijaiyah_username", e.target.value);
                  }}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 text-slate-700 font-bold"
                />
              </div>

              {/* Sound On Off */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <h5 className="text-xs font-bold text-slate-800">Kesan Bunyi Latihan</h5>
                  <p className="text-[10px] text-slate-400">Mainkan nada piano dan sorakan kejayaan dalam permainan.</p>
                </div>
                <button
                  onClick={() => {
                    playClick();
                    setSoundEnabled(!soundEnabled);
                  }}
                  className={`p-3 rounded-xl transition-all ${soundEnabled ? "bg-emerald-500 text-white" : "bg-slate-300 text-slate-600"}`}
                >
                  {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </button>
              </div>

              {/* Sign in with Google firebase */}
              <div className="border-t border-slate-100 pt-5 space-y-3">
                <h5 className="text-xs font-bold text-slate-800">Sistem Log Masuk Awan (Firebase)</h5>
                
                {user ? (
                  <div className="flex items-center justify-between bg-emerald-50 p-3 rounded-2xl border border-emerald-100">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-emerald-500 text-white uppercase text-center flex items-center justify-center font-black">
                        {userName[0]}
                      </div>
                      <div>
                        <span className="text-[11px] font-black text-slate-800 block">{userName}</span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">{user.email}</span>
                      </div>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="px-3.5 py-1.5 bg-red-150 hover:bg-red-200 text-red-700 font-bold text-[10px] rounded-lg transition-all"
                    >
                      Daftar Keluar
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 text-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[11px] text-slate-500">Log masuk memudahkan guru dan ibu bapa memantau kemajuan murid dari sebarang tablet/laptop lain.</p>
                    <button
                      onClick={handleGoogleSignIn}
                      disabled={!firebaseReady}
                      className={`px-5 py-2.5 text-xs font-extrabold rounded-full transition-all flex items-center gap-1.5 justify-center mx-auto shadow-md ${
                        firebaseReady 
                          ? "bg-slate-800 hover:bg-slate-900 text-white shadow-slate-900/10 cursor-pointer" 
                          : "bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed"
                      }`}
                    >
                      <User className="w-4 h-4" /> Daftar Masuk dengan Google
                    </button>
                    {!firebaseReady && (
                      <span className="text-[9px] text-amber-600 block mt-1 font-bold">
                        * Firebase belum dipasang penuh, auto jatuh balik ke Guest Mode yang lengkap.
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Reset Data */}
              <div className="border-t border-slate-100 pt-5 text-center">
                {resetSuccess ? (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-3xl p-4 max-w-sm mx-auto text-xs font-black animate-pulse shadow-sm">
                    🎉 Rekod XP dan kemajuan latihan anda telah berjaya ditetapkan semula! Jom belajar dari awal.
                  </div>
                ) : confirmReset ? (
                  <div className="bg-red-50 border border-red-200 rounded-3xl p-4 max-w-sm mx-auto space-y-3 shadow-md">
                    <p className="text-red-800 text-xs font-black leading-relaxed">
                      ⚠️ Adakah anda betul-betul pasti? Rekod XP, skor kuiz terbaik, dan semua bintang latihan anda akan terpadam selama-lamanya!
                    </p>
                    <div className="flex justify-center gap-3">
                      <button
                        onClick={handleClearProgress}
                        className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-full shadow-md active:scale-95 cursor-pointer transition-all"
                      >
                        Ya, Set Semula!
                      </button>
                      <button
                        onClick={() => { playClick(); setConfirmReset(false); }}
                        className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-black rounded-full active:scale-95 cursor-pointer transition-all"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { playClick(); setConfirmReset(true); }}
                    className="px-4 py-2 bg-red-50 hover:bg-red-100/80 border border-red-200 text-red-600 text-xs font-extrabold rounded-full flex items-center gap-1 mx-auto active:scale-95 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Set Semula Semua Kemajuan Latihan
                  </button>
                )}
              </div>

            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // Nav Links List
  const navItems = [
    { id: "scan", label: "Scan QR Kad", icon: QrCode },
    { id: "latih", label: "Latih Sebutan", icon: Mic },
    { id: "kuiz", label: "Main Kuiz", icon: Trophy },
    { id: "kemajuan", label: "Kemajuan Saya", icon: TrendingUp },
    { id: "tetapan", label: "Tetapan", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-sky-50 text-slate-750 flex flex-col font-sans antialiased pb-16 sm:pb-0" id="hijaiyah-app-container">
      
      {/* 1. TOP HEADER (Vibrant Custom Design styled) */}
      <header className="bg-white border-b-4 border-sky-100 py-3 px-4 sticky top-0 z-50 shadow-sm no-print">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Logo Name & Icon Box with 3D feel */}
          <div className="flex items-center gap-3">
            <img 
              src="https://drive.google.com/thumbnail?id=1gDAeJay10ZiuyjUXc-w-wK0sCVZCyRU7&sz=w1000" 
              alt="Logo Jom Belajar Hijaiyah AI" 
              className="w-9 h-9 object-contain rounded-xl shadow-sm shrink-0"
              referrerPolicy="no-referrer"
            />
            <div>
              <h1 className="text-sm font-display font-black text-slate-800 uppercase tracking-tight leading-none sm:text-base">
                Jom Belajar Hijaiyah AI
              </h1>
              <span className="text-[10px] text-sky-600 font-extrabold tracking-wider font-display uppercase block mt-0.5">
                H.C Board
              </span>
            </div>
          </div>

          {/* User gamification summary */}
          <div className="flex items-center gap-2.5">
            
            {/* Stars score */}
            <div className="flex items-center gap-1 bg-amber-100 border-2 border-amber-200 px-2.5 py-1 rounded-full text-amber-800 text-xs font-black shadow-sm shrink-0 font-display">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>{(Object.values(masteryRecord) as number[]).filter(s => s >= 80).length} ⭐</span>
            </div>

            {/* XP score */}
            <div className="flex items-center gap-1 bg-sky-100 border-2 border-sky-200 px-2.5 py-1 rounded-full text-sky-800 text-xs font-black shadow-sm shrink-0 font-display">
              <Zap className="w-3.5 h-3.5 text-sky-600" />
              <span>{totalXp} XP</span>
            </div>

            {/* Avatar block with bouncy hover feedback */}
            <div 
              onClick={() => { playClick(); setActivePanel("tetapan"); }}
              className="w-8.5 h-8.5 rounded-full bg-gradient-to-tr from-orange-400 to-orange-500 text-white hover:opacity-90 font-display font-black uppercase text-sm flex items-center justify-center border-2 border-orange-300 shadow-[0_3px_0_#c2410c] hover:-translate-y-0.5 active:translate-y-0.5 transition-all cursor-pointer shrink-0 ml-1"
              title="Pergi ke Tetapan Profil"
            >
              {userName[0]}
            </div>

          </div>

        </div>
      </header>

      {/* 2. ADAPTIVE RESPONSIVE NAVIGATION WRAPPER (MD3 COMPLIANT) */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto relative">
        
        {/* Navigation Sidebar Drawer for DESKTOP (1024px ke atas) */}
        <aside className="hidden lg:flex flex-col w-72 bg-white border-r-4 border-sky-100 p-6 space-y-6 shrink-0 no-print">
          <div className="flex-1">
            <h5 className="text-[10px] uppercase font-black text-sky-650 tracking-widest pl-2 mb-3.5 font-display">
              Menu Pembelajaran
            </h5>
            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activePanel === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { playClick(); setActivePanel(item.id); }}
                    className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl font-display font-black text-xs transition-all cursor-pointer text-left ${
                      isActive 
                        ? "bg-sky-500 text-white border-b-4 border-sky-700 hover:bg-sky-600 hover:border-sky-800 scale-[1.01] shadow-md shadow-sky-500/10" 
                        : "text-slate-500 hover:bg-sky-50 hover:text-sky-600 hover:translate-x-1"
                    }`}
                  >
                    <Icon className="w-4.5 h-4.5 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Achievement level widget inside the sidebar menu */}
            <div className="p-4 bg-purple-500 rounded-3xl text-white shadow-md relative overflow-hidden mt-8 border-b-4 border-purple-700">
              <div className="absolute -right-6 -bottom-6 w-16 h-16 rounded-full bg-purple-400 opacity-30"></div>
              <p className="text-[9px] font-black uppercase text-purple-200 tracking-wider font-display">PENCAPAIAN ANDA</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs font-black font-display text-purple-50">Sebab Sebutan</span>
                <span className="bg-amber-400 text-slate-900 text-[10px] px-2 py-0.5 rounded-lg font-black font-display">Tahap {Math.floor(totalXp / 150) + 1}</span>
              </div>
              <div className="w-full h-2.5 bg-purple-700 rounded-full mt-3.5 overflow-hidden border border-purple-600 relative">
                <div 
                  className="h-full bg-amber-400 transition-all duration-300"
                  style={{ width: `${Math.min(100, ((totalXp % 150) / 150) * 100)}%` }}
                />
              </div>
              <span className="text-[9px] text-purple-100 font-bold block mt-1.5 text-right font-mono">{(totalXp % 150)} / 150 XP</span>
            </div>

          </div>
          
          <div className="pt-6 border-t-2 border-slate-100 text-center text-[10px] text-slate-400 font-display">
            <p className="font-extrabold text-sky-600">Jom Belajar Hijaiyah AI</p>
            <p className="mt-0.5 opacity-80">Edisi Pintar 2026</p>
          </div>
        </aside>

        {/* Navigation Rail for TABLETS (768px - 1023px) */}
        <aside className="hidden sm:block lg:hidden w-22 bg-white border-r-4 border-sky-100 py-6 px-1.5 no-print shrink-0">
          <nav className="flex flex-col items-center gap-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePanel === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { playClick(); setActivePanel(item.id); }}
                  className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer text-center w-full ${
                    isActive 
                      ? "bg-sky-500 text-white border-b-4 border-sky-700 shadow-md shadow-sky-500/10 scale-105" 
                      : "text-slate-500 hover:bg-sky-50 hover:text-sky-600"
                  }`}
                  title={item.label}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className="text-[8px] font-black block truncate max-w-16 leading-none mt-1.5 font-display uppercase tracking-wide">
                    {item.label.split(" ")[0]}
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* 3. MAIN CONTENTS PANELS DISPLAY */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 flex flex-col justify-between overflow-x-hidden min-h-[calc(100vh-140px)]">
          <div className="flex-1">
            {renderActiveComponent()}
          </div>

          {/* Informative footer */}
          <footer className="mt-12 text-center text-slate-450 text-[10px] font-display font-extrabold no-print py-5 border-t-2 border-sky-100/60 pl-4 sm:pl-0">
            Hak Cipta Terpelihara &copy; 2026 - Jom Belajar Huruf Hijaiyah AI (H.C Board)
          </footer>
        </main>

      </div>

      {/* 4. BOTTOM NAVIGATION TABS FOR MOBILE ONLY (320px - 767px) */}
      <div className="sm:hidden block fixed bottom-0 inset-x-0 bg-white border-t-4 border-sky-100 z-50 pb-safe-bottom no-print shadow-2xl">
        <nav className="grid grid-cols-5 gap-0.5 p-1 relative">
          {[
            { id: "scan", label: "Scan QR", icon: QrCode },
            { id: "latih", label: "Sebutan", icon: Mic },
            { id: "kuiz", label: "Kuiz", icon: Trophy },
            { id: "kemajuan", label: "Stats", icon: TrendingUp },
            { id: "tetapan", label: "Tetapan", icon: Settings },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activePanel === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { playClick(); setActivePanel(item.id); }}
                className={`py-2 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                  isActive 
                    ? "text-sky-600 font-black scale-105" 
                    : "text-slate-550 hover:text-slate-800"
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? "stroke-[2.5] text-sky-500 animate-pulse" : ""}`} />
                <span className="text-[8px] mt-1 font-display font-black uppercase tracking-wider">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

    </div>
  );
}
