# Pembaikan (11 Okt 2026)

| # | Masalah | Punca | Pembaikan |
|---|---------|-------|-----------|
| 1 | Sebutan tidak dikesan tepat | Web Speech API cuba meneka *perkataan*; ia lemah untuk bunyi huruf tunggal & hampir tidak berfungsi di iPhone/PWA | Rakam audio sebenar (`src/utils/recorder.ts`, WAV 16kHz) dan Gemini *mendengar* terus. Semakan senyap/terlalu pendek dibuat di peranti |
| 2 | Imbas QR tiada bunyi | Bunyi dimainkan dari gelung kamera (bukan sentuhan pengguna) dan `AudioContext` tidak dibuka kunci; autoplay dalam `AIEvaluator` juga dibatalkan oleh cleanup effect sendiri | `unlockAudio()` pada sentuhan pertama / butang kamera, audio dimuat awal & dinyahkod (`preloadLetterAudio`), main balik melalui Web Audio + sandaran `<audio>` kongsi |
| 3 | Kerap bermasalah di iPhone | Polisi autoplay iOS, konteks audio "interrupted", `decodeAudioData` berasaskan Promise, `video.muted` sebagai atribut sahaja, `webkitSpeechRecognition` tiada dalam PWA/pelayar lain | Semua dibetulkan; rakaman guna `audio/mp4` (format iOS); imbasan QR dihadkan ~8fps pada 640px |
| 4 | Skor tidak tepat | Skor rawak (93-100 / 15-35), padanan substring longgar ("ba" lulus untuk "bapa"), skor tetap 75 bila ralat, simulator rawak bila tiada STT, dan skor bebas oleh LLM | Skor dikira oleh KOD: salah huruf maksimum 35; keyakinan rendah mengehadkan skor; senyap/ralat = **tiada skor, tiada XP** |

## Tetapan
- `GEMINI_API_KEY` wajib. Tanpa kunci, penilaian dipaparkan sebagai "tidak tersedia" (bukan skor palsu).
- Mikrofon & kamera memerlukan **HTTPS** (atau localhost).
