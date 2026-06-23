import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

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

// Fungsi pembantu untuk membina maklum balas sebutan pintar tempatan apabila Gemini API mengalami ralat kuota (429) atau ralat sambungan
function getLocalCoachEvaluation(
  letter: string, 
  transcript: string, 
  expectedName: string, 
  makhrajRule: string, 
  errorReason: string
) {
  const rawSpeech = (transcript || "").toLowerCase().trim();
  
  // Clean speech: buang perkataan hiasan, arahan atau kata hubung khas Melayu
  const speech = rawSpeech
    .replace(/\b(sebut|huruf|bunyi|baca|saya|ini|ialah|adalah|itu|nak|dan|atau|lah)\b/gi, "")
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
    .trim();

  const target = expectedName.toLowerCase().trim();
  const targetChar = letter.trim();

  // Jika senyap atau kosong
  if (!transcript || rawSpeech.length === 0 || rawSpeech === "mendengar..." || rawSpeech === "mendengar") {
    return {
      score: 30,
      stars: 1,
      feedback: `Penilai AI tidak mendengar sebarang suara jelas. Mari cuba klik butang mikrofon dan sebut "${expectedName}" sekali lagi!`,
      makhrajTip: makhrajRule || `Bunyi huruf ${letter} (${expectedName}) dilafazkan dari makhrajnya yang tersendiri.`,
      isLocalFallback: true,
      fallbackReason: errorReason
    };
  }

  // Semakan padanan terus (Rumi atau Huruf Tunggal)
  const isDirectMatch = 
    speech === target || 
    speech === targetChar || 
    speech.split(/\s+/).includes(target) || 
    speech.split(/\s+/).includes(targetChar);

  // Kamus Transliterasi Fonetik Hijaiyah Ringkas & Sangat Tepat (mengelakkan false-positive satu huruf, menyokong penulisan rumi dan jawi/arab)
  const phoneticMatches: Record<string, string[]> = {
    "alif": ["alif", "aleef", "lif", "alip", "alif alif", "ألف", "الف", "أ", "ا", "ألفا"],
    "ba": ["ba", "bah", "baa", "be", "abah", "باء", "با", "ب"],
    "ta": ["ta", "tah", "taa", "te", "tata", "تاء", "تا", "ت"],
    "tsa": ["tsa", "tsah", "sa", "sah", "tha", "thah", "ثاء", "ثا", "ث"],
    "jim": ["jim", "jeem", "je", "gim", "جym", "جيم", "جي", "ج"],
    "ha": ["ha", "hah", "haa", "حاء", "حا", "ح"],
    "kha": ["kha", "khah", "kho", "khoh", "ko", "koh", "خاء", "خا", "خ"],
    "dal": ["dal", "dah", "deel", "da", "دal", "دال", "da", "د"],
    "dzal": ["dzal", "zal", "zhal", "zaa", "za", "ذال", "ذا", "ذ"],
    "ro": ["ro", "ra", "rah", "re", "aro", "راء", "را", "ر"],
    "za": ["za", "zai", "zay", "zei", "ze", "زاء", "زاي", "زا", "ز"],
    "sin": ["sin", "seen", "se", "ssin", "سين", "سي", "س"],
    "syin": ["syin", "sheen", "shin", "shyn", "sye", "شين", "شي", "ش"],
    "sod": ["sod", "shod", "sad", "shor", "صاد", "صا", "ص"],
    "dhod": ["dhod", "dad", "dod", "dhad", "daa", "ضاد", "ضا", "ض"],
    "tho": ["tho", "thoh", "to", "toh", "طاء", "طا", "ط"],
    "zho": ["zho", "zoh", "zo", "ظاء", "ظا", "ظ"],
    "ain": ["ain", "ayn", "in", "aen", "عين", "عي", "ع"],
    "ghoin": ["ghoin", "ghayn", "goin", "gho", "gha", "غين", "غي", "غ"],
    "fa": ["fa", "fah", "fe", "pa", "pah", "فاء", "فا", "ف"],
    "qof": ["qof", "qaf", "ko", "kof", "qo", "قاف", "قا", "ق"],
    "kaf": ["kaf", "ka", "kah", "ke", "كaf", "كاف", "كا", "ك"],
    "lam": ["lam", "la", "lh", "le", "لام", "لا", "ل"],
    "mim": ["mim", "meem", "me", "ma", "mah", "ميم", "مي", "م"],
    "nun": ["nun", "noon", "na", "nah", "ne", "نون", "نو", "ن"],
    "waw": ["waw", "wau", "wo", "wah", "wa", "واو", "وا", "و"],
    "ha (besar)": ["hah", "ha", "he", "hea", "ha besar", "besar", "هاء", "ها", "ه"],
    "hamzah": ["hamzah", "hamza", "amza", "همزة", "همزه", "ء"],
    "ya": ["ya", "yah", "ye", "yaa", "ياء", "يا", "ي"]
  };

  const matchesOfTarget = phoneticMatches[target] || [target];
  
  // Semak jika sepadan secara fonetik
  const isPhoneticMatch = matchesOfTarget.some(m => {
    const cleanM = m.toLowerCase().trim();
    if (speech === cleanM) return true;
    
    const speechWords = speech.split(/\s+/);
    if (speechWords.includes(cleanM)) return true;
    
    // Sokong tulisan Arab/Jawi secara substring sekiranya ada penambahan perkataan lain dikesan oleh mikrofon
    const isArabicScript = /[\u0600-\u06FF]/.test(cleanM);
    if (isArabicScript) {
      if (speech.includes(cleanM) || cleanM.includes(speech)) return true;
    }
    
    // Untuk ejaan rumi, hadkan padanan substring hanya untuk frasa fonetik panjang (>=3 huruf) untuk mengelakkan salah faham "a" dalam "tata"
    if (cleanM.length >= 3) {
      if (speech.includes(cleanM)) return true;
    } else if (cleanM.length === 2) {
      if (speechWords.some(w => w === cleanM || w.startsWith(cleanM) || w.endsWith(cleanM))) return true;
    }
    return false;
  });

  let score = 0;
  let stars = 1;
  let feedback = "";

  if (isDirectMatch || isPhoneticMatch) {
    score = Math.floor(Math.random() * 8) + 93; // 93 to 100
    stars = 5;
    feedback = `Masha-Allah! Anak pintar menyebut "${rawSpeech}" dengan sangat baik, merdu, dan tepat untuk huruf "${expectedName}". Hebat sekali!`;
  } else {
    // Jika tidak sepadan langsung (Contoh: sebut "tata" semasa target "Alif")
    score = Math.floor(Math.random() * 21) + 15; // 15% hingga 35%
    stars = 1;
    feedback = `Oops! Sebutan "${rawSpeech}" anda kurang bertepatan dengan huruf "${expectedName}". Mari cuba sebut sekali lagi ya, anda pasti boleh!`;
  }

  return {
    score,
    stars,
    feedback,
    makhrajTip: makhrajRule || `Bunyi huruf ${letter} (${expectedName}) dilafazkan mengikut organ makhraj tempatan yang betul.`,
    isLocalFallback: true,
    fallbackReason: errorReason
  };
}

// 1. API: Menilai sebutan Hijaiyah menggunakan Gemini AI (dengan perlindungan ralat serba boleh)
app.post("/api/evaluate", async (req, res) => {
  const { letter, transcript, expectedName, makhrajRule } = req.body;

  try {
    if (!letter || !expectedName) {
      return res.status(400).json({ error: "Sila berikan huruf dan nama huruf." });
    }

    const hasApiKey = !!process.env.GEMINI_API_KEY;

    if (!hasApiKey) {
      // Pembubaran fallback secara pintar apabila kunci API tiada
      const fallbackResult = getLocalCoachEvaluation(
        letter || "أ",
        transcript || "",
        expectedName || "Alif",
        makhrajRule || "",
        "Mod Luar Talian (Tiada Kunci API)"
      );
      return res.json(fallbackResult);
    }

    const ai = getGemini();
    const prompt = `
      Sila nilaikan sebutan murid prasekolah/sekolah rendah yang menyebut huruf Hijaiyah berikut:
      Huruf Sasaran: "${letter}" (Nama: ${expectedName})
      Penerangan Makhraj Standard: ${makhrajRule || "Sila huraikan mengikut asas tajwid"}
      Teks Sebutan Murid Rekod (Speech-to-Text): "${transcript || ""}"

      TUGAS:
      Bandingkan teks sebutan murid ("${transcript}") dengan nama huruf "${expectedName}" atau huruf "${letter}" dalam bahasa Arab.
      Jika transkrip kosong atau tiada (e.g. murid senyap), sila berikan motivasi lembut untuk mencuba lagi dengan skor penglibatan kecil (cth. 60%).
      Jika transkrip sepadan secara fonetik dengan bunyi huruf, berikan skor yang tinggi.
      Sediakan maklum balas interaktif yang ringkas, ceria, penuh kasih sayang, dalam Bahasa Melayu, mesra kanak-kanak (gunakan gelaran mesra seperti 'Wah, hebatnya anak pintar!' atau 'Syabas murid bijak!').
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "Anda adalah guru pakar AI yang mahir dalam tajwid terutamanya makhraj huruf Hijaiyah untuk kanak-kanak di Malaysia. Anda memberikan penilaian yang positif, bermotivasi tinggi, dan ramah.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { 
              type: Type.INTEGER, 
              description: "Skor peratusan sebutan dari 60 hingga 100 berdasarkan ketepatan transkrip dengan huruf sasaran." 
            },
            stars: { 
              type: Type.INTEGER, 
              description: "Bintang dari 1 hingga 5 ditentukan dari skor (90-100 = 5, 80-89 = 4, 70-79 = 3, 60-69 = 2, had bawah = 1)." 
            },
            feedback: { 
              type: Type.STRING, 
              description: "Ulasan yang sangat mesra kanak-kanak, kelakar, atau memberikan pujian semangat dalam Bahasa Melayu." 
            },
            makhrajTip: { 
              type: Type.STRING, 
              description: "Tips ringkas & ringkas dalam Bahasa Melayu menerangkan cara sebutan makhraj huruf dari mulut/lidah." 
            }
          },
          required: ["score", "stars", "feedback", "makhrajTip"]
        }
      }
    });

    const resultText = response.text?.trim() || "{}";
    const resultJson = JSON.parse(resultText);
    return res.json(resultJson);

  } catch (error: any) {
    console.log("[Sistem Penilai] Mengaktifkan penilaian alternatif pintar.");
    // Jalankan smart local evaluation untuk menjamin aplikasi tidak tergendala / terhenti demi pelajar
    const fallbackResult = getLocalCoachEvaluation(
      letter || "أ",
      transcript || "",
      expectedName || "Alif",
      makhrajRule || "",
      "Sistem sibuk, beralih ke mod pintar tempatan."
    );
    return res.json(fallbackResult);
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
  kha: {
    metaphor: "Seperti bumbung perut buncit yang diletakkan satu mahkota bintik di atas kepalanya!",
    funTip: "Ucapkan Kha dengan bunyi sedikit kasar seolah-olah sedang membersihkan tekak!"
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
  za: {
    metaphor: "Seperti papan gelongsor ra juga, tetapi ada sebiji bola mainan di atasnya!",
    funTip: "Sebutkan Za dengan bunyi mendesing seperti seekor lebah comel yang terbang!"
  },
  sin: {
    metaphor: "Seperti gigi sisir kecil yang bergigi tiga dengan mangkuk besar di tepi!",
    funTip: "Bunyi Sin seakan embusan angin lembut bertiup sepoi-sepoi bahasa!"
  },
  syin: {
    metaphor: "Seperti sisir sin yang mempunyai tiga bintang berkilauan di atasnya!",
    funTip: "Embuskan nafas yang lebar seperti menyuruh seseorang diam: Syyyh!"
  },
  sod: {
    metaphor: "Baling-baling yang bulat tumpul bersambung dengan mangkuk panjang!",
    funTip: "Sebutkan Sod dengan memenuhkan mulut anda agar bunyinya tebal perkasa!"
  },
  dhod: {
    metaphor: "Sama seperti sod, tetapi diketemukan setitik intan mutiara di atas badannya!",
    funTip: "Tekan tepi lidah ke gigi geraham untuk bunyi Dhod yang mantap!"
  },
  tho: {
    metaphor: "Seperti helikopter kecil dengan sebilah tiub udara menegak tinggi ke langit!",
    funTip: "Ketuk hujung lidah ke lelangit atas dengan kuat untuk bunyi Tho tebal!"
  },
  zho: {
    metaphor: "Helikopter tho tetapi kini ada bintik radar yang menyala di sebelahnya!",
    funTip: "Sebutkan Zho dengan nada tebal berserta sentuhan lembut hujung lidah!"
  },
  ain: {
    metaphor: "Seperti telinga dongeng bunian yang melengkung kemas ke bawah!",
    funTip: "Tekan sedikit bahagian tengah kerongkong anda untuk melafazkan Ain yang lunak!"
  },
  ghoin: {
    metaphor: "Bentuk telinga bunian dengan setitik hiasan butang subang di atas puncak telinga!",
    funTip: "Sebutkan Ghoin dengan melafazkan bunyi seakan berkumur-kumur!"
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
  "ha (besar)": {
    metaphor: "Seperti ribbon hiasan hadiah besar yang melengkung gembira!",
    funTip: "Sebutkan Ha dalam-dalam dari dada seperti ketawa gembira yang ikhlas!"
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
