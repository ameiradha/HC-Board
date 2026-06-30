// Cute and cheerful arcade-style sounds using native Web Audio API.
// This completely bypasses the need for external MP3 loading and works 100% offline!
import { HIJAIYAH_LETTERS } from "../data/hijaiyah";

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

// Play a single synthesized note
function playNote(freq: number, duration: number, type: OscillatorType = "sine", delay = 0) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;

    gainNode.gain.setValueAtTime(0, ctx.currentTime + delay);
    gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + delay + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration);
  } catch (error) {
    console.warn("Audio Context blocked or not supported:", error);
  }
}

// 1. Play scan/success beep
export function playBeep() {
  playNote(880, 0.15, "triangle");
}

// 2. Play success chord (Perfect / 5 Bintang!)
export function playSuccess() {
  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
  notes.forEach((freq, idx) => {
    playNote(freq, 0.45, "sine", idx * 0.08);
  });
}

// 3. Play failure slide
export function playFail() {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(330, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.4);

    gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (err) {
    console.warn(err);
  }
}

// 4. Play Level Up sweeping sound
export function playLevelUp() {
  const notes = [440, 554, 659, 880, 1109, 1318]; // sweep major chord
  notes.forEach((freq, idx) => {
    playNote(freq, 0.5, "triangle", idx * 0.06);
  });
}

// 5. Play short card-swap click
export function playClick() {
  playNote(400, 0.08, "sine");
}

let currentPlayingAudio: HTMLAudioElement | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;
let activeBufferSource: AudioBufferSourceNode | null = null;
const audioBufferCache: Record<string, AudioBuffer> = {};

/**
 * Memainkan fail audio MP3 menggunakan Web Audio API. 
 * Kaedah ini jauh lebih selamat daripada tag <audio> di dalam iFrame web.
 */
async function playMp3ViaWebAudio(url: string, onEnd?: () => void): Promise<boolean> {
  try {
    const ctx = getAudioContext();
    
    // Berhentikan audio yang sedang dimainkan
    if (activeBufferSource) {
      try {
        activeBufferSource.stop();
        activeBufferSource.disconnect();
      } catch (e) {}
      activeBufferSource = null;
    }

    let buffer = audioBufferCache[url];
    if (!buffer) {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      // Menjana audio buffer
      buffer = await ctx.decodeAudioData(arrayBuffer);
      audioBufferCache[url] = buffer;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    activeBufferSource = source;

    source.onended = () => {
      if (activeBufferSource === source) {
        activeBufferSource = null;
      }
      if (onEnd) onEnd();
    };

    source.start(0);
    return true;
  } catch (err) {
    console.warn("Kemerosotan main balik Web Audio API, kembali ke kaedah standard:", err);
    return false;
  }
}

/**
 * Memainkan sebutan menggunakan fail MP3 tempatan berkualiti tinggi yang dihoskan secara statik.
 * Sesuai sepenuhnya untuk persekitaran statik tanpa pelayan (seperti Vercel).
 */
export function playTTS(text: string, lang: "ar" | "ms", onEnd?: () => void, letterId?: number) {
  // Hentikan sebarang audio yang sedang dimainkan untuk mengelakkan tumpang-tindih (overlap)
  if (activeBufferSource) {
    try {
      activeBufferSource.stop();
      activeBufferSource.disconnect();
    } catch (e) {}
    activeBufferSource = null;
  }

  if (currentPlayingAudio) {
    try {
      currentPlayingAudio.pause();
      currentPlayingAudio.src = "";
    } catch (e) {}
    currentPlayingAudio = null;
  }

  if (currentUtterance && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
    currentUtterance = null;
  }

  let mp3Url = "";

  // Lebih diutamakan penggunaan direct ID untuk menjamin 100% fail audio yang tepat dipanggil
  if (letterId) {
    if (lang === "ms") {
      mp3Url = `/audio/intro_${letterId}.mp3`;
    } else if (lang === "ar") {
      mp3Url = `/audio/letter_${letterId}.mp3`;
    }
  } else {
    if (lang === "ms") {
      // Cari huruf mengikut nama (contoh: "Huruf Alif")
      const cleanName = text.replace("Huruf ", "").replace(/\(.*?\)/, "").trim().toLowerCase();
      const found = HIJAIYAH_LETTERS.find(l => {
        const normalizedLName = l.name.replace(/\(.*?\)/, "").trim().toLowerCase();
        return normalizedLName === cleanName || l.name.toLowerCase().includes(cleanName) || cleanName.includes(normalizedLName);
      });
      if (found) {
        mp3Url = `/audio/intro_${found.id}.mp3`;
      }
    } else if (lang === "ar") {
      // Cari huruf mengikut tulisan arab asli (contoh: "أ")
      const found = HIJAIYAH_LETTERS.find(l => l.char === text || text.includes(l.char));
      if (found) {
        mp3Url = `/audio/letter_${found.id}.mp3`;
      }
    }
  }

  // Tambah parameter cache-buster untuk memaksa pelayar web memuat turun fail audio yang dikemaskini tanpa menggunakan fail cached lama
  if (mp3Url && mp3Url.startsWith("/audio/")) {
    mp3Url += `?v=15`;
  }

  // Jika tidak ditemui fail tempatan, gunakan baki API laluan tts pelayan tempatan kita (/api/tts)
  if (!mp3Url) {
    const targetLang = lang === "ar" ? "ar" : "ms";
    mp3Url = `/api/tts?lang=${targetLang}&text=${encodeURIComponent(text)}`;
  }

  // Bina URl penuh (absolute URL) dengan asal-usul tetingkap (window.location.origin)
  // bagi mengelakkan ralat penghuraian laluan di dalam persekitaran iFrame pralihat
  const absoluteUrl = mp3Url.startsWith("http")
    ? mp3Url
    : window.location.origin + (mp3Url.startsWith("/") ? "" : "/") + mp3Url;

  let endedTriggered = false;

  // Set timeout keselamatan selama 4.5 saat agar butang UI tidak tersekat (freeze/disabled) jika audio gagal bertindak balas
  const safetyTimeout = setTimeout(() => {
    console.warn("Had masa audio dicapai (safety timeout), membebaskan slot sebutan.");
    handleEnd();
  }, 4500);

  const handleEnd = () => {
    if (safetyTimeout) {
      clearTimeout(safetyTimeout);
    }
    if (!endedTriggered) {
      endedTriggered = true;
      if (currentPlayingAudio) {
        currentPlayingAudio = null;
      }
      if (onEnd) onEnd();
    }
  };

  // Cuba memulakan audio standard SECARA SYNCHRONOUS dengan serta-merta
  // Ini adalah kaedah TERBAIK dan PALING DIPERCAYAI untuk mematuhi sekatan gerakan pengguna (user gesture restrictions)
  const audio = new Audio(absoluteUrl);
  currentPlayingAudio = audio;

  audio.addEventListener("ended", handleEnd);

  audio.addEventListener("error", (e) => {
    console.warn(`Standard HTML5 Audio gagal memuatkan MP3 daripada ${absoluteUrl}. Cuba Web Audio API:`, e);
    playMp3ViaWebAudio(absoluteUrl, handleEnd).then((success) => {
      if (!success) {
        console.warn("Web Audio API juga gagal. Melakukan sandaran terakhir kepada SpeechSynthesis.");
        fallbackToSpeechSynthesis(text, lang, handleEnd);
      }
    });
  });

  audio.play()
    .then(() => {
      console.log(`Standard HTML5 Audio berjaya dimulakan secara langsung dan serentak untuk: ${absoluteUrl}`);
    })
    .catch((err) => {
      console.warn("Standard HTML5 .play() disekat oleh pelayar (autoplay policy). Cuba Web Audio API:", err);
      playMp3ViaWebAudio(absoluteUrl, handleEnd).then((success) => {
        if (!success) {
          fallbackToSpeechSynthesis(text, lang, handleEnd);
        }
      });
    });
}

function fallbackToSpeechSynthesis(text: string, lang: "ar" | "ms", handleEnd: () => void) {
  if ("speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      currentUtterance = utterance;
      if (lang === "ar") {
        utterance.lang = "ar-SA";
        utterance.rate = 0.75;
      } else {
        utterance.lang = "ms-MY";
        utterance.rate = 0.95;
      }
      utterance.onend = handleEnd;
      utterance.onerror = handleEnd;
      window.speechSynthesis.speak(utterance);
    } catch (errSpeech) {
      console.warn("SpeechSynthesis error:", errSpeech);
      handleEnd();
    }
  } else {
    handleEnd();
  }
}
