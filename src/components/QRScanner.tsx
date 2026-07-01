import React, { useState, useRef, useEffect } from "react";
import { HijaiyahLetter, HIJAIYAH_LETTERS } from "../data/hijaiyah";
import { playBeep, playClick, playTTS } from "../utils/audio";
import { Camera, AlertCircle, RefreshCw, Layers, CheckCircle, Printer, Loader2 } from "lucide-react";
import QRGenerator from "./QRGenerator";

// @ts-ignore
import jsQR from "jsqr";

// Resilient mapping function to handle both old and new QR code spellings/names seamlessly
export function getLetterFromScannedName(letterName: string): HijaiyahLetter | undefined {
  const normalized = letterName.trim().toLowerCase();
  
  const oldNamesMap: Record<string, number> = {
    // Ghain
    "ghoin": 19,
    "ghain": 19,
    "gho": 19,
    
    // Nun
    "nun": 25,
    "noon": 25,
    
    // Ha (big 'ه', ID 27)
    "hha": 27,
    "ha_besar": 27,
    "ha-besar": 27,
    "habesar": 27,
    "he": 27,
    "heh": 27,
    "ha besar": 27,
    
    // Kho
    "kha": 7,
    "kho": 7,
    "khoh": 7,
    "khah": 7,
    
    // To / Tho / Tha
    "to": 16,
    "tho": 16,
    "thoh": 16,
    "toh": 16,
    "tha": 16,
    
    // Zo / Zho / Dha
    "zo": 17,
    "zho": 17,
    "zoh": 17,
    "dha": 17,
    
    // Sod / Shad
    "sod": 14,
    "shad": 14,
    
    // Other helper letters to ensure robust matching of older cards
    "ra": 10,
    "ro": 10,
    "za": 11,
    "zai": 11,
    "haa": 6,
    "ha_kecil": 6,
    "hakecil": 6,
    "ha kecil": 6,
  };

  // 1. If there's an explicit alias in our map, use it
  if (normalized in oldNamesMap) {
    const id = oldNamesMap[normalized];
    return HIJAIYAH_LETTERS.find(l => l.id === id);
  }

  // 2. Direct case-insensitive match on current name
  let found = HIJAIYAH_LETTERS.find(l => l.name.toLowerCase() === normalized);
  if (found) return found;

  // 3. Check if current name is part of the string or vice-versa
  found = HIJAIYAH_LETTERS.find(l => 
    l.name.toLowerCase().includes(normalized) || 
    normalized.includes(l.name.toLowerCase())
  );
  if (found) return found;

  // 4. Special fallback for "ha" which defaults to ID 6 (Ha / ح)
  if (normalized === "ha") {
    return HIJAIYAH_LETTERS.find(l => l.id === 6);
  }

  return undefined;
}

interface QRScannerProps {
  onScanned: (letter: HijaiyahLetter) => void;
  titleOverride?: string;
}

export default function QRScanner({ onScanned, titleOverride }: QRScannerProps) {
  const [activeSubTab, setActiveSubTab] = useState<"imbas" | "cetak">("imbas");
  const [useSimulated, setUseSimulated] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("hijaiyah_pref_use_real_camera");
      return saved === "true" ? false : true;
    } catch (e) {
      return true;
    }
  });
  const [cameraPermission, setCameraPermission] = useState<"pending" | "granted" | "denied">("pending");
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const [scanning, setScanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  const cycleCamera = () => {
    if (devices.length === 0) return;
    const currentIndex = devices.findIndex(d => d.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % devices.length;
    startCamera(devices[nextIndex].deviceId);
  };

  // Stop camera stream upon unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Keep scanned callback in a stable ref to prevent stale closures and effect restarts
  const onScannedRef = useRef(onScanned);
  useEffect(() => {
    onScannedRef.current = onScanned;
  }, [onScanned]);

  const stopCamera = () => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setActiveStream(null);
    setScanning(false);
  };

  const startCamera = async (deviceId?: string) => {
    try {
      localStorage.setItem("hijaiyah_pref_use_real_camera", "true");
    } catch (e) {}
    setUseSimulated(false);
    setCameraPermission("pending");
    setScanning(true);

    // Hentikan sebarang penstriman aktif secara manual sebelum memulakan stream baharu
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setActiveStream(null);

    try {
      let stream: MediaStream;
      
      try {
        // Cubaan 1: Menggunakan ideal & exact constraints
        const constraints: MediaStreamConstraints = {
          video: deviceId 
            ? { deviceId: { exact: deviceId } }
            : { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (firstErr) {
        console.warn("Cubaan pertama gagal, mencuba cubaan 2 (konstrain lebih ringkas):", firstErr);
        try {
          // Cubaan 2: Menggunakan facingMode standard tanpa parameter resolusi ketat atau exact ID
          const constraints: MediaStreamConstraints = {
            video: deviceId 
              ? { deviceId: deviceId }
              : { facingMode: "environment" }
          };
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (secondErr) {
          console.warn("Cubaan kedua gagal, mencuba cubaan 3 (kamera am):", secondErr);
          // Cubaan 3: Fallback ke sebarang kamera video yang boleh diakses (paling selamat)
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
      }

      streamRef.current = stream;
      setActiveStream(stream);
      setCameraPermission("granted");

      // Dapatkan senarai semua peranti kamera bagi penyegerakan ID peranti aktif
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = allDevices.filter(d => d.kind === "videoinput");
        setDevices(videoInputs);

        const activeTrack = stream.getVideoTracks()[0];
        if (activeTrack) {
          const settings = activeTrack.getSettings();
          if (settings.deviceId) {
            setSelectedDeviceId(settings.deviceId);
          } else if (deviceId) {
            setSelectedDeviceId(deviceId);
          } else if (videoInputs.length > 0) {
            setSelectedDeviceId(videoInputs[0].deviceId);
          }
        }
      } catch (e) {
        console.warn("Gagal dapatkan senarai kamera atau menyegerakan id peranti:", e);
      }

    } catch (err) {
      console.error("Ralat Kamera:", err);
      setCameraPermission("denied");
      setUseSimulated(true);
      setScanning(false);
    }
  };

  // Auto-start camera on initial mount if real camera was preferred
  useEffect(() => {
    try {
      const savedPref = localStorage.getItem("hijaiyah_pref_use_real_camera");
      if (savedPref === "true" && activeSubTab === "imbas") {
        startCamera();
      }
    } catch (e) {}
  }, []);

  // Automatically release camera when switching to print/download tab, and restart when returning to scanner tab
  useEffect(() => {
    if (activeSubTab === "cetak") {
      stopCamera();
    } else if (activeSubTab === "imbas") {
      try {
        const savedPref = localStorage.getItem("hijaiyah_pref_use_real_camera");
        if (savedPref === "true") {
          startCamera(selectedDeviceId || undefined);
        }
      } catch (e) {}
    }
  }, [activeSubTab]);

  // Keep camera authorized and restore stream automatically when browser tab becomes active again
  useEffect(() => {
    const handleVisibilityAndFocus = () => {
      if (document.visibilityState === "visible") {
        console.log("Tab is active/focused. Ensuring camera permission & stream are kept active...");
        try {
          const savedPref = localStorage.getItem("hijaiyah_pref_use_real_camera");
          if (savedPref === "true" && activeSubTab === "imbas") {
            setUseSimulated(false);
            const video = videoRef.current;
            if (video && streamRef.current && streamRef.current.active) {
              // stream is still active, just ensure the video plays
              video.play().catch(err => {
                console.warn("Auto-play failed, restarting camera stream:", err);
                startCamera(selectedDeviceId || undefined);
              });
            } else {
              // stream was closed or suspended by backgrounding tab, restart it automatically
              console.log("Stream suspended or inactive, reviving camera stream automatically...");
              startCamera(selectedDeviceId || undefined);
            }
          }
        } catch (e) {}
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityAndFocus);
    window.addEventListener("focus", handleVisibilityAndFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityAndFocus);
      window.removeEventListener("focus", handleVisibilityAndFocus);
    };
  }, [activeSubTab, selectedDeviceId]);

  // Securely bind the active stream as soon as the HTML <video> element enters the DOM
  useEffect(() => {
    if (videoRef.current && activeStream) {
      const video = videoRef.current;
      if (video.srcObject !== activeStream) {
        video.srcObject = activeStream;
        video.setAttribute("playsinline", "true");
        video.setAttribute("autoplay", "true");
        video.setAttribute("muted", "true");
        
        const playVideo = () => {
          video.play().catch(e => {
            console.warn("Ralat memulakan mainan video automatik:", e);
          });
        };

        video.onloadedmetadata = playVideo;
        playVideo();
      }
    }
  }, [activeStream, useSimulated]);

  // Robust, continuous requestAnimationFrame frame-scanning interval
  useEffect(() => {
    let active = true;
    let localFrameId: number | null = null;

    const tick = () => {
      if (!active) return;
      
      const video = videoRef.current;
      if (scanning && !useSimulated && video && video.readyState >= 2 /* HAVE_CURRENT_DATA */) {
        const canvas = canvasRef.current || document.createElement("canvas");
        canvasRef.current = canvas;
        const ctx = canvas.getContext("2d");
        
        if (ctx && video.videoWidth > 0 && video.videoHeight > 0) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          try {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            // Terjemah QR dengan selamat menggunakan jsQR default/namespace fallback
            const decodeQR = typeof jsQR === "function" ? jsQR : (jsQR as any).default;
            const code = decodeQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "dontInvert"
            });

            if (code && code.data) {
              console.log("Kod QR berjaya diimbas:", code.data);
              if (code.data.startsWith("hijaiyah:")) {
                const letterName = code.data.replace("hijaiyah:", "").trim().toLowerCase();
                const found = getLetterFromScannedName(letterName);
                if (found) {
                  playBeep();
                  if (navigator.vibrate) {
                    try { navigator.vibrate(200); } catch (e) {}
                  }
                  
                  // Mainkan sebutan huruf secara lisan automatik sejurus dikesan
                  playTTS(found.char, "ar", undefined, found.id);

                  onScannedRef.current(found);
                  stopCamera();
                  setUseSimulated(true);
                  active = false;
                  return;
                }
              }
            }
          } catch (err) {
            console.warn("Ralat mendedahkan data kod QR:", err);
          }
        }
      }

      if (active && scanning && !useSimulated) {
        localFrameId = requestAnimationFrame(tick);
      }
    };

    if (scanning && cameraPermission === "granted" && !useSimulated && activeStream) {
      localFrameId = requestAnimationFrame(tick);
    }

    return () => {
      active = false;
      if (localFrameId) {
        cancelAnimationFrame(localFrameId);
      }
    };
  }, [scanning, cameraPermission, useSimulated, activeStream]);

  const triggerMockScan = (letter: HijaiyahLetter) => {
    playBeep();
    // Mainkan sebutan huruf secara lisan automatik sejurus dikesan
    playTTS(letter.char, "ar", undefined, letter.id);
    onScanned(letter);
  };

  const filteredLetters = HIJAIYAH_LETTERS.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.phonemic.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto" id="qr-parent-container">
      {/* Sub-tab selection bar */}
      <div className="flex bg-white rounded-full p-1.5 shadow-sm border border-emerald-100 max-w-md mx-auto no-print">
        <button
          onClick={() => { playClick(); setActiveSubTab("imbas"); }}
          className={`flex-1 py-2.5 px-4 rounded-full text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === "imbas"
              ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/15"
              : "text-slate-500 hover:text-emerald-600 hover:bg-emerald-50/50"
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>Imbas Kad QR</span>
        </button>
        <button
          onClick={() => { playClick(); setActiveSubTab("cetak"); }}
          className={`flex-1 py-2.5 px-4 rounded-full text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === "cetak"
              ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/15"
              : "text-slate-500 hover:text-emerald-600 hover:bg-emerald-50/50"
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>Muat Turun & Cetak PDF</span>
        </button>
      </div>

      {activeSubTab === "imbas" ? (
        <div className="bg-white rounded-3xl border border-emerald-100 shadow-xl overflow-hidden max-w-2xl mx-auto animate-fade-in" id="qr-scanner-ui">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6 text-white text-center">
            <h3 className="text-xl font-bold font-sans tracking-wide">
              {titleOverride || "Imbas QR Code Kad Hijaiyah"}
            </h3>
            <p className="text-emerald-50 text-xs mt-1">
              Arahkan QR Code kad Hijaiyah ke kotak imbasan untuk mula belajar sebutan Pintar.
            </p>
          </div>

          {/* Primary Scanner Viewport */}
          <div className="p-6">
            <div className="relative aspect-video bg-slate-900 rounded-2xl overflow-hidden border-2 border-dashed border-emerald-300 flex flex-col items-center justify-center text-white">
              
              {useSimulated ? (
                /* Mock Interactive Scanning Canvas */
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-radial from-slate-800 to-slate-900">
                  <div className="relative w-36 h-36 border-4 border-emerald-400 rounded-2xl flex items-center justify-center animate-pulse shadow-[0_0_15px_rgba(52,211,153,0.4)]">
                    <div className="absolute inset-x-0 h-0.5 bg-red-400 animate-[bounce_2s_infinite] shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>
                    <Camera className="w-16 h-16 text-emerald-400 opacity-60" />
                  </div>
                  <p className="text-sm text-emerald-300 text-center font-medium mt-4">
                    Sedia Mengimbas Simulasian Kad QR Hijaiyah
                  </p>
                  <p className="text-slate-400 text-[10px] text-center max-w-sm mt-1">
                    Pilih mana-mana kad di bahagian bawah untuk meletakkannya dengan cepat di depan kafe imbasan!
                  </p>
                  <button
                    onClick={startCamera}
                    className="mt-4 px-4 py-2 bg-emerald-500 text-white font-medium text-xs rounded-full hover:bg-emerald-600 active:scale-95 transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Guna Kamera Sebenar
                  </button>
                </div>
              ) : (
                /* Actual Device Camera Stream Viewport */
                <div className="relative w-full h-full flex items-center justify-center bg-black">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Scan Overlay Laser Mask */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="relative w-48 h-48 border-4 border-emerald-400 rounded-2xl">
                      {/* Scan Laser Sweeper */}
                      <div className="absolute inset-x-0 h-0.5 bg-red-500 animate-[bounce_2s_infinite] shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>
                    </div>
                  </div>

                  {cameraPermission === "granted" && (
                    <div className="absolute bottom-4 left-4 right-4 bg-black/70 px-3 py-1.5 rounded-full text-xs text-center text-emerald-300 pointer-events-none">
                      Imbasan QR sedang berjalan...
                    </div>
                  )}

                  {cameraPermission === "pending" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 p-4 text-center">
                      <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mb-3" />
                      <p className="font-bold text-sm text-white font-sans">Memulakan Kamera...</p>
                      <p className="text-slate-300 text-xs max-w-sm mt-1 leading-relaxed">
                        Sila klik "Benarkan" sekiranya pelayar anda meminta izin akses kepada kamera peranti.
                      </p>
                    </div>
                  )}

                  {cameraPermission === "denied" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 p-4 text-center">
                      <AlertCircle className="w-10 h-10 text-amber-400 mb-2" />
                      <p className="font-bold text-sm text-white font-sans">Akses Kamera Disekat / Tidak Aktif</p>
                      <p className="text-slate-300 text-xs max-w-sm mt-1 leading-relaxed">
                        Akses kamera dinafikan atau peranti tiada perkakasan kamera. Sila gunakan tetapan pelayar anda untuk membenarkan akses, atau buka aplikasi ini dalam **Tab Baru** di luar tetingkap iframe AI Studio.
                      </p>
                      <button
                        onClick={() => {
                          stopCamera();
                          try {
                            localStorage.setItem("hijaiyah_pref_use_real_camera", "false");
                          } catch (e) {}
                          setUseSimulated(true);
                        }}
                        className="mt-4 px-4 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-full hover:bg-amber-600 cursor-pointer"
                      >
                        Batal & Guna Simulator Imbas
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      stopCamera();
                      try {
                        localStorage.setItem("hijaiyah_pref_use_real_camera", "false");
                      } catch (e) {}
                      setUseSimulated(true);
                    }}
                    className="absolute top-4 right-4 p-2 bg-slate-800/80 rounded-full hover:bg-slate-700 text-white cursor-pointer"
                    title="Tukar ke simulator"
                  >
                    <Layers className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {cameraPermission !== "granted" && (
              <div className="mt-4">
                <button
                  onClick={() => startCamera()}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  Benarkan Akses Kamera
                </button>
              </div>
            )}

            {/* Pengecam Kamera Sebenar / Tukar Kamera */}
            {!useSimulated && devices.length > 0 && (
              <div className="mt-3 bg-slate-50 border border-slate-200/60 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in no-print">
                <div className="flex items-start gap-2">
                  <Camera className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-xs text-slate-800 font-bold block leading-none font-sans">
                      Berbilang Kamera Dikesan!
                    </span>
                    <span className="text-[10px] text-slate-500 leading-normal">
                      Sila tukar saluran sekiranya skrin gelap atau kamera salah dipilih.
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => startCamera()}
                    className="bg-slate-600 hover:bg-slate-700 text-white text-xs px-3 py-1.5 rounded-lg active:scale-95 transition-all shadow-sm"
                  >
                    Utama
                  </button>
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => startCamera(e.target.value)}
                    className="bg-white border border-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-700 w-full shadow-sm cursor-pointer"
                  >
                    {devices.map((device, idx) => (
                      <option key={device.deviceId || idx} value={device.deviceId}>
                        {device.label || `Kamera ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={cycleCamera}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg active:scale-95 transition-all shadow-sm"
                  >
                    Tukar
                  </button>
                </div>
              </div>
            )}

            {/* Simulator Selector Panel - ALWAYS present to guarantee playability */}
            <div className="mt-6 border-t border-slate-100 pt-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 font-sans">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    Daftar Kad Hijaiyah Pelajar (Simulator Imbas)
                  </h4>
                  <p className="text-slate-500 text-[11px]">
                    Tekan mana-mana kad di bawah untuk mensimulasikan imbasan fizikal dengan QR Code yang bersesuaian.
                  </p>
                </div>
                
                {/* Small Quick Search Input */}
                <input
                  type="text"
                  placeholder="Cari huruf..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-emerald-50/30 w-full md:w-44 text-slate-700 font-bold"
                />
              </div>

              {/* Letter Cards Carousel Container */}
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 gap-2 max-h-56 overflow-y-auto p-2 border border-slate-100 bg-slate-50/50 rounded-2xl scrollbar-thin">
                {filteredLetters.map((letter) => (
                  <button
                    key={letter.id}
                    onClick={() => {
                      playClick();
                      triggerMockScan(letter);
                    }}
                    className="group relative flex flex-col items-center justify-center p-2.5 bg-white border border-slate-200 rounded-xl hover:border-emerald-400 hover:bg-emerald-50 focus:outline-none hover:shadow-md active:scale-95 transition-all text-center cursor-pointer"
                  >
                    <span className="text-2xl font-bold text-slate-800 leading-none mb-1 text-center font-sans">
                      {letter.char}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 tracking-tight leading-none text-center">
                      {letter.name}
                    </span>
                    {/* Simulated scan trigger button hover label */}
                    <div className="absolute inset-0 bg-emerald-600/90 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <span className="text-[9px] text-white font-extrabold tracking-wider uppercase px-1">
                        Imbas
                      </span>
                    </div>
                  </button>
                ))}
                
                {filteredLetters.length === 0 && (
                  <div className="col-span-full py-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-slate-300 mb-1" />
                    Tiada huruf ditemui.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-fade-in">
          <QRGenerator />
        </div>
      )}
    </div>
  );
}
