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

/**
 * Memainkan sebutan menggunakan fail MP3 tempatan berkualiti tinggi yang dihoskan secara statik.
 * Sesuai sepenuhnya untuk persekitaran statik tanpa pelayan (seperti Vercel).
 */
export function playTTS(text: string, lang: "ar" | "ms", onEnd?: () => void) {
  let mp3Url = "";

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

  // Jika tidak ditemui fail tempatan, gunakan Google Translate online langsung sebagai sandaran
  if (!mp3Url) {
    const targetLang = lang === "ar" ? "ar" : "ms";
    mp3Url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${targetLang}&q=${encodeURIComponent(text)}`;
  }

  const audio = new Audio(mp3Url);
  let endedTriggered = false;

  const handleEnd = () => {
    if (!endedTriggered) {
      endedTriggered = true;
      if (onEnd) onEnd();
    }
  };

  audio.addEventListener("ended", handleEnd);

  audio.addEventListener("error", (e) => {
    console.warn(`Gagal memuatkan MP3 daripada ${mp3Url}, mencuba suara kecerdasan sistem tempatan:`, e);
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
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
    } else {
      handleEnd();
    }
  });

  audio.play().catch((err) => {
    console.warn("Sekatan autoplay dikesan, menguji percakapan suara sistem:", err);
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
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
    } else {
      handleEnd();
    }
  });
}
