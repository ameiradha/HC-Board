import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { HIJAIYAH_LETTERS } from "./src/data/hijaiyah";

dotenv.config();

const app = express();
const PORT = 3000;

// Rakaman audio dihantar sebagai base64 (WAV 16kHz, ~160KB/5 saat) - had lalai 100kb tidak mencukupi
app.use(express.json({ limit: "10mb" }));

// Hidangkan folder /audio dan public secara langsung oleh Express dengan pengepala CORS
app.use("/audio", express.static(path.join(process.cwd(), "public/audio"), {
  setHeaders: (res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=86400");
  }
}));
app.use(express.static(path.join(process.cwd(), "public"), {
  setHeaders: (res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
}));

// Lazy-initialize Gemini client to prevent startup crashes if key is missing
let aiInstance: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined. Sila pastikan anda menyediakan Secrets.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// ---------------------------------------------------------------------------
// PENILAIAN SEBUTAN (berasaskan AUDIO sebenar, bukan teks speech-to-text)
//
// Kenapa audio? Speech-to-text pelayar (terutamanya Safari iPhone) cuba "meneka perkataan"
// dan hampir tidak boleh mengecam bunyi huruf tunggal seperti "Tsa" atau "Dhod".
// Di sini Gemini mendengar rakaman sebenar dan MESTI memilih huruf yang didengarinya daripada
// senarai 30 huruf. Skor akhir dikira oleh KOD kita (bukan dipilih bebas oleh AI) supaya
// sebutan yang salah tidak mungkin mendapat skor tinggi.
// ---------------------------------------------------------------------------

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

// Kumpulan huruf yang bunyinya hampir sama - diberitahu kepada AI supaya lebih teliti
const CONFUSABLE_NOTES = `
Pasangan yang sering keliru (BEZAKAN dengan teliti):
- Ta (ت) vs Tha (ط): Ta nipis, Tha tebal/berat.
- Sin (س) vs Shad (ص) vs Syin (ش) vs Tsa (ث): Sin desis nipis, Shad desis tebal, Syin "sy", Tsa hujung lidah antara gigi.
- Dal (د) vs Dhod (ض) vs Dzal (ذ) vs Dha (ظ).
- Ha (ح) vs Hha (ه) vs Kho (خ): Ha bunyi nafas dalam dari kerongkong tengah, Hha hembusan ringan, Kho bunyi geseran dari pangkal tekak.
- Alif (ا/أ) vs Ain (ع) vs Hamzah (ء).
- Kaf (ك) vs Qof (ق): Kaf nipis di hadapan lidah, Qof tebal dari pangkal lidah.
- Ghain (غ) vs Kho (خ).
- Ro (ر) vs Lam (ل) vs Zai (ز).
`.trim();

const LETTER_LIST = HIJAIYAH_LETTERS.map(l => `${l.id}. ${l.name} (${l.char})`).join("\n");

function starsFromScore(score: number): number {
  if (score >= 90) return 5;
  if (score >= 80) return 4;
  if (score >= 65) return 3;
  if (score >= 40) return 2;
  return 1;
}

function normName(n: string): string {
  return String(n || "").toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z\u0600-\u06FF ]/g, "").trim();
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

// 1. API: Menilai sebutan Hijaiyah daripada rakaman audio
app.post("/api/evaluate", async (req, res) => {
  const { letter, letterId, expectedName, makhrajRule, audioBase64, mimeType } = req.body || {};

  if (!letter || !expectedName) {
    return res.status(400).json({ status: "error", error: "Sila berikan huruf dan nama huruf." });
  }
  if (!audioBase64 || typeof audioBase64 !== "string") {
    // Tiada audio = tiada penilaian. JANGAN beri skor.
    return res.status(400).json({ status: "no_audio", scored: false, error: "Tiada rakaman suara diterima." });
  }
  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({
      status: "ai_unavailable",
      scored: false,
      error: "Penilai AI belum disediakan (GEMINI_API_KEY tiada)."
    });
  }

  const target = HIJAIYAH_LETTERS.find(l => l.id === Number(letterId)) ||
    HIJAIYAH_LETTERS.find(l => normName(l.name) === normName(expectedName)) ||
    HIJAIYAH_LETTERS.find(l => l.char === letter);
  const targetName = target?.name || expectedName;

  try {
    const ai = getGemini();

    const prompt = `Anda ialah pemeriksa sebutan huruf Hijaiyah untuk kanak-kanak Melayu.
Dengar rakaman audio dan tentukan HURUF APA yang disebut oleh kanak-kanak itu.

Huruf sasaran yang sepatutnya disebut: ${targetName} (${target?.char || letter})
Makhraj: ${makhrajRule || "-"}

Senarai SEMUA huruf yang mungkin (pilih satu sahaja untuk "heardLetter"):
${LETTER_LIST}

${CONFUSABLE_NOTES}

Peraturan WAJIB:
1. Dengar audio sebenar. JANGAN meneka berdasarkan huruf sasaran. Laporkan apa yang BENAR-BENAR didengar.
2. Kanak-kanak mungkin menyebut nama huruf (contoh "ba", "tsa") atau bunyi huruf dengan baris (contoh "ba", "bi", "bu"). Kedua-duanya boleh diterima.
3. "audioQuality": "silent" jika tiada suara, "noise" jika hanya bunyi latar/hingar/bukan sebutan huruf, "speech" jika ada sebutan jelas.
4. Jika audioQuality bukan "speech", set heardLetter = "none".
5. Jika sebutan tidak jelas tetapi ada, pilih huruf paling hampir dan letakkan "confidence" rendah (di bawah 50).
6. "accuracy" (0-100) ialah seberapa tepat makhraj dan bunyi huruf SASARAN disebut (jika huruf yang didengar bukan sasaran, accuracy mesti di bawah 40).
7. "feedback": satu atau dua ayat pendek, mesra kanak-kanak, dalam Bahasa Melayu. Jika salah, nyatakan huruf yang kedengaran berbeza dan cara membetulkannya. Gunakan ejaan nama huruf seperti dalam senarai (cth. Kho, Ro, Zai, Shad, Tha, Dha, Ghain, Hha). Jangan sebut skor.
8. "makhrajTip": satu tip ringkas cara menyebut huruf ${targetName} dalam Bahasa Melayu.`;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: mimeType || "audio/wav", data: audioBase64 } },
            { text: prompt }
          ]
        }
      ],
      config: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            audioQuality: { type: Type.STRING, enum: ["silent", "noise", "speech"] },
            heardLetter: { type: Type.STRING, description: "Nama huruf yang didengar, tepat seperti dalam senarai, atau 'none'" },
            confidence: { type: Type.INTEGER, description: "Keyakinan 0-100 terhadap huruf yang didengar" },
            accuracy: { type: Type.INTEGER, description: "Ketepatan sebutan terhadap huruf sasaran 0-100" },
            feedback: { type: Type.STRING },
            makhrajTip: { type: Type.STRING }
          },
          required: ["audioQuality", "heardLetter", "confidence", "accuracy", "feedback", "makhrajTip"]
        }
      }
    });

    const raw = JSON.parse((response.text || "{}").trim());
    const quality: string = raw.audioQuality || "silent";
    const heard = normName(raw.heardLetter || "none");
    const confidence = clamp(Number(raw.confidence) || 0, 0, 100);
    const accuracy = clamp(Number(raw.accuracy) || 0, 0, 100);
    const tip = raw.makhrajTip || makhrajRule || "";

    // Tiada suara / hingar sahaja -> tidak dinilai (tiada skor, tiada XP)
    if (quality !== "speech" || heard === "none" || heard === "") {
      return res.json({
        status: "no_speech",
        scored: false,
        score: 0,
        stars: 0,
        heardLetter: null,
        feedback: `Suara adik belum kedengaran dengan jelas. Dekatkan telefon ke mulut, sebut "${targetName}" dengan lantang, dan cuba lagi ya!`,
        makhrajTip: tip
      });
    }

    const isMatch = heard === normName(targetName);
    let score: number;

    if (isMatch) {
      // Betul huruf: skor mengikut ketepatan, dihadkan oleh keyakinan
      score = clamp(accuracy, 60, 100);
      if (confidence < 50) score = Math.min(score, 69);
      else if (confidence < 70) score = Math.min(score, 84);
    } else {
      // SALAH huruf: tidak boleh melepasi 35 walau apa pun yang AI kata
      score = clamp(Math.round(accuracy * 0.5), 10, 35);
    }

    return res.json({
      status: "ok",
      scored: true,
      score,
      stars: starsFromScore(score),
      heardLetter: raw.heardLetter,
      isMatch,
      confidence,
      feedback: raw.feedback || (isMatch ? "Syabas!" : "Cuba lagi ya!"),
      makhrajTip: tip
    });
  } catch (error: any) {
    console.error("[Penilai] Ralat Gemini:", error?.message || error);
    // JANGAN pernah memulangkan skor rekaan apabila AI gagal.
    return res.status(502).json({
      status: "ai_error",
      scored: false,
      error: "Penilai AI sedang sibuk atau tidak dapat dihubungi. Sila cuba lagi sebentar."
    });
  }
});

// 2. API: Mendapatkan petua makhraj interaktif (menggunakan kamus offline pintar untuk kelajuan ekstrem)
const OFFLINE_MAPPING: Record<string, { metaphor: string; funTip: string }> = {
  alif: {
    metaphor: "Seperti sebatang pensel tegak atau sebilah tongkat berdiri tegap!",
    funTip: "Buka mulut dengan selesa untuk menyebut 'A' seperti menyanyi riang!"
  },
  ba: {
    metaphor: "Seperti sebuah bot kecil yang sedang berlayar dengan sebiji batu kecil di bawahnya!",
    funTip: "Rapatkan kedua-dua bibir dengan lembut lalu lepaskan suara anda: Ba!"
  },
  ta: {
    metaphor: "Seperti sebuah pinggan snek yang di dalamnya ada dua biji buah ceri manis!",
    funTip: "Sentuh hujung lidah ke lelangit atas berhampiran gigi untuk menghasilkan bunyi Ta yang tajam!"
  },
  tsa: {
    metaphor: "Seperti pinggan snek juga, tetapi kali ini ada tiga biji ceri berkilau!",
    funTip: "Keluarkan sedikit sahaja hujung lidah anda di antara gigi untuk menyebut Tsa secara manja!"
  },
  jim: {
    metaphor: "Seperti perut buncit yang mempunyai satu biji gula-gula di dalamnya!",
    funTip: "Bunyi Jim mestilah kemas dan padat, seakan menyebut perkataan 'Jom'!"
  },
  ha: {
    metaphor: "Like a cold breath on a mirror, clean and sweet!",
    funTip: "Seolah menghembus nafas segar selepas minum air hangat yang bersih."
  },
  kho: {
    metaphor: "Seperti bumbung perut buncit yang diletakkan satu mahkota bintik di atas kepalanya!",
    funTip: "Ucapkan Kho dengan bunyi sedikit kasar seolah-olah sedang membersihkan tekak!"
  },
  dal: {
    metaphor: "Seperti pintu gua kecil yang condong atau tangan yang sedang melengkung mesra!",
    funTip: "Bunyi Dal mestilah tegap dan berdetik ceria di hujungnya!"
  },
  dzal: {
    metaphor: "Seperti huruf dal, tetapi ada satu lampu kecil hiasan menyala di atas kepalanya!",
    funTip: "Hampir seperti D, tetapi letakkan hujung lidah pada gigi atas seperti berbisik: Dza."
  },
  ro: {
    metaphor: "Bentuk bulan sabit yang tajam atau papan gelongsor taman permainan yang laju!",
    funTip: "Getarkan lidah anda dengan bertenaga untuk menyebut Ro dengan megah!"
  },
  zai: {
    metaphor: "Seperti papan gelongsor ra juga, tetapi ada sebiji bola mainan di atasnya!",
    funTip: "Sebutkan Zai dengan bunyi mendesing seperti seekor lebah comel yang terbang!"
  },
  sin: {
    metaphor: "Seperti gigi sisir kecil yang bergigi tiga dengan mangkuk besar di tepi!",
    funTip: "Bunyi Sin seakan embusan angin lembut bertiup sepoi-sepoi bahasa!"
  },
  syin: {
    metaphor: "Seperti sisir sin yang mempunyai tiga bintang berkilauan di atasnya!",
    funTip: "Embuskan nafas yang lebar seperti menyuruh seseorang diam: Syyyh!"
  },
  shad: {
    metaphor: "Baling-baling yang bulat tumpul bersambung dengan mangkuk panjang!",
    funTip: "Sebutkan Shad dengan memenuhkan mulut anda agar bunyinya tebal perkasa!"
  },
  dhod: {
    metaphor: "Sama seperti shad, tetapi diketemukan setitik intan mutiara di atas badannya!",
    funTip: "Tekan tepi lidah ke gigi geraham untuk bunyi Dhod yang mantap!"
  },
  tha: {
    metaphor: "Seperti helikopter kecil dengan sebilah tiub udara menegak tinggi ke langit!",
    funTip: "Ketuk hujung lidah ke lelangit atas dengan kuat untuk bunyi Tha tebal!"
  },
  dha: {
    metaphor: "Helikopter tha tetapi kini ada bintik radar yang menyala di sebelahnya!",
    funTip: "Sebutkan Dha dengan nada tebal berserta sentuhan lembut hujung lidah!"
  },
  ain: {
    metaphor: "Seperti telinga dongeng bunian yang melengkung kemas ke bawah!",
    funTip: "Tekan sedikit bahagian tengah kerongkong anda untuk melafazkan Ain yang lunak!"
  },
  ghain: {
    metaphor: "Bentuk telinga bunian dengan setitik hiasan butang subang di atas puncak telinga!",
    funTip: "Sebutkan Ghain dengan melafazkan bunyi seakan berkumur-kumur!"
  },
  fa: {
    metaphor: "Gelung bulat kecil seperti ekor anjing laut dengan satu bola terapung di atas muncungnya!",
    funTip: "Sentuhkan gigi atas ke bibir bawah dan tiup lembut untuk membunyikan Fa!"
  },
  qof: {
    metaphor: "Mangkuk bulat dalam dengan dua titik mata yang memandang anda!",
    funTip: "Sebutkan Qof dari bahagian paling dalam mulut anda seakan bunyi ketukan!"
  },
  kaf: {
    metaphor: "Seperti kerusi malas dengan seekor ulat bulu kecil duduk di bahagian tengah!",
    funTip: "Sebutkan Kaf dengan hembusan angin kecil yang keluar tipis dari mulut!"
  },
  lam: {
    metaphor: "Menyerupai mata kail memancing ikan atau pemegang payung melengkung bawah!",
    funTip: "Sentuh hujung lidah ke gusi atas lalu bunyikan Lam dengan santai!"
  },
  mim: {
    metaphor: "Satu cincin berpusing kecil yang condong ke bawah seperti gagang tongkat malam!",
    funTip: "Kemutkan kedua-dua bibir lalu keluarkan suara Mim yang merdu!"
  },
  nun: {
    metaphor: "Mangkuk sup yang lebar bulat dengan satu bintik lazat berdiri di atas kuah!",
    funTip: "Alirkan suara melalui hidung untuk menghasilkan bunyi Nun yang berdengung!"
  },
  wau: {
    metaphor: "Seperti siput cengkerang kecil yang meluncur membawa kail atau ekor panjang!",
    funTip: "Muncungkan mulut anda sepenuhnya hingga membentuk bulatan kecil: Wau!"
  },
  hha: {
    metaphor: "Seperti ribbon hiasan hadiah besar yang melengkung gembira!",
    funTip: "Sebutkan Hha dalam-dalam dari dada seperti ketawa gembira yang ikhlas!"
  },
  "lam alif": {
    metaphor: "Gabungan dua pemegang payung atau dua batang kayu yang saling bersilang mesra!",
    funTip: "Sebutkan Lam Alif dengan lembut dan pastikan anda panjangkan bunyinya sebanyak 2 harakat: Laaa!"
  },
  hamzah: {
    metaphor: "Burung layang-layang kecil yang meluncur bebas di langit biru!",
    funTip: "Bunyi Hamzah sangat cepat dan terputus seperti bunyi 'Akk'!"
  },
  ya: {
    metaphor: "Seperti seekor itik berenang anggun dengan dua titisan air di bawah badannya!",
    funTip: "Senyum lebar-lebar ketika melafazkan Ya seolah-olah gembira!"
  }
};

app.post("/api/makhraj-tip", async (req, res) => {
  const { letter, expectedName } = req.body;
  try {
    if (!letter || !expectedName) {
      return res.status(400).json({ error: "Sila berikan huruf dan nama huruf." });
    }

    const key = String(expectedName).toLowerCase().trim();
    const cached = OFFLINE_MAPPING[key] || OFFLINE_MAPPING[key.replace(/\s+/g, "")];

    if (cached) {
      return res.json(cached);
    }

    // fallback am
    return res.json({
      metaphor: `Bayangkan rupa huruf "${letter}" (${expectedName}) berbentuk melengkung estetik yang tersendiri!`,
      funTip: `Lafazkan sebutan huruf ${expectedName} dengan senyuman ceria di bibir anda.`
    });
  } catch (error: any) {
    return res.json({
      metaphor: `Bayangkan rupa huruf "${letter}" (${expectedName}) melengkung estetik yang mengasyikkan!`,
      funTip: `Biarkan suara dilafazkan dengan gembira dan tenang bersama bimbingan pintar.`
    });
  }
});

// GET /api/tts - Menyahkod teks ke strim fail audio MP3 rujukan (melalui Google Translate TTS)
app.get("/api/tts", async (req, res) => {
  const { text, lang } = req.query;
  if (!text) {
    return res.status(400).send("Parameter 'text' diperlukan");
  }

  const targetLang = lang || "ar";
  const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(String(targetLang))}&q=${encodeURIComponent(String(text))}`;

  try {
    const response = await fetch(ttsUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36",
        "Referer": "https://translate.google.com/"
      }
    });

    if (!response.ok) {
      throw new Error(`Ralat menjana fail MP3: ${response.statusText}`);
    }

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=86400"); // Cache file for 24 hours

    const buffer = Buffer.from(await response.arrayBuffer());
    return res.end(buffer);
  } catch (error: any) {
    console.error("Gagal mendapatkan MP3 sebutan:", error.message);
    return res.status(500).send("Gagal memulakan audio sebutan MP3");
  }
});

// 3. API: Kesihatan pelayan
app.get("/api/health", (req, res) => {
  res.json({ status: "Jom Belajar Huruf Hijaiyah AI Server is running!" });
});

// 4. Pengendalian Vite Middleware (Development vs Production)
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
       res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server sedang berjalan pada http://0.0.0.0:${PORT}`);
  });
}

startServer();
