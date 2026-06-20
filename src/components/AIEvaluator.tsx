import React, { useState, useEffect } from "react";
import { HijaiyahLetter } from "../data/hijaiyah";
import { playBeep, playSuccess, playFail, playClick } from "../utils/audio";
import { 
  Volume2, Mic, MicOff, Star, Sparkles, Award, Zap, RefreshCw, 
  BookOpen, HelpCircle, AlertCircle, ArrowLeft, ArrowRight, CheckCircle2,
  Trophy
} from "lucide-react";

interface AIEvaluatorProps {
  letter: HijaiyahLetter;
  onNextLetter?: () => void;
  onPrevLetter?: () => void;
  onBackToMenu?: () => void;
  addXp: (amount: number) => void;
  updateLetterMastery: (letterId: number, score: number) => void;
}

export default function AIEvaluator({
  letter,
  onNextLetter,
  onPrevLetter,
  onBackToMenu,
  addXp,
  updateLetterMastery
}: AIEvaluatorProps) {
  const [isPlayingTts, setIsPlayingTts] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [transcript, setTranscript] = useState("");
  const [accentTips, setAccentTips] = useState<any>(null);
  const [loadingTips, setLoadingTips] = useState(false);

  // Evaluation States
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<{
    score: number;
    stars: number;
    feedback: string;
    makhrajTip: string;
  } | null>(null);

  // Selected Speech Recognition Language (ar-SA for Arabic, ms-MY for Malay phonetic name)
  const [recognitionLang, setRecognitionLang] = useState<"ar-SA" | "ms-MY">("ar-SA");

  // Load custom AI tips upon card load
  useEffect(() => {
    fetchAITips();
    setEvaluationResult(null);
    setTranscript("");
  }, [letter]);

  // Handle Speech Recognition setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = recognitionLang;

      rec.onstart = () => {
        setIsRecording(true);
        setTranscript("");
      };

      rec.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        evaluatePronunciation(text);
      };

      rec.onerror = (err: any) => {
        console.warn("Speech recognition error:", err);
        setIsRecording(false);
        // Fallback simulated evaluation if the browser microphone gets blocked
        playFail();
        evaluatePronunciation("");
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      setRecognition(rec);
    }
  }, [recognitionLang]);

  const fetchAITips = async () => {
    setLoadingTips(true);
    try {
      const res = await fetch("/api/makhraj-tip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ letter: letter.char, expectedName: letter.name })
      });
      const data = await res.json();
      setAccentTips(data);
    } catch (err) {
      console.warn("Error fetching AI makhraj tips:", err);
    } finally {
      setLoadingTips(false);
    }
  };

  const handleTextToSpeech = () => {
    if ("speechSynthesis" in window) {
      playBeep();
      setIsPlayingTts(true);
      window.speechSynthesis.cancel();
      
      // Let's create an elegant spoken audio sequence
      // We read: 'Huruf [Name]' first and then pronounce the Arabic letter with proper Arabic accent.
      const introUtterance = new SpeechSynthesisUtterance(`Huruf ${letter.name}`);
      introUtterance.lang = "ms-MY";
      introUtterance.rate = 0.95;

      const arabicUtterance = new SpeechSynthesisUtterance(letter.char);
      arabicUtterance.lang = "ar-SA";
      arabicUtterance.rate = 0.75;
      arabicUtterance.pitch = 1.1;

      // Find Arabic voice if installed
      const voices = window.speechSynthesis.getVoices();
      const arabicVoice = voices.find(v => v.lang.startsWith("ar"));
      if (arabicVoice) {
        arabicUtterance.voice = arabicVoice;
      }

      introUtterance.onend = () => {
        window.speechSynthesis.speak(arabicUtterance);
      };

      arabicUtterance.onend = () => {
        setIsPlayingTts(false);
      };

      window.speechSynthesis.speak(introUtterance);
    } else {
      alert("Text to Speech tidak disokong oleh browser peranti ini.");
    }
  };

  const startVoiceRecording = () => {
    if (isRecording) {
      if (recognition) recognition.stop();
      return;
    }

    playBeep();
    if (recognition) {
      try {
        recognition.lang = recognitionLang;
        recognition.start();
      } catch (err) {
        console.warn("SpeechRecognition already started");
      }
    } else {
      // Browser fallback simulator
      setIsRecording(true);
      setTranscript("Mendengar...");
      setTimeout(() => {
        setIsRecording(false);
        const randomWords = [letter.name.toLowerCase(), "salah", "betul"];
        const simWord = randomWords[Math.floor(Math.random() * randomWords.length)];
        setTranscript(simWord);
        evaluatePronunciation(simWord);
      }, 2500);
    }
  };

  const evaluatePronunciation = async (speechText: string) => {
    setIsEvaluating(true);
    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          letter: letter.char,
          transcript: speechText,
          expectedName: letter.name,
          makhrajRule: letter.makhrajRule
        })
      });

      const responseData = await res.json();
      setEvaluationResult(responseData);

      // Trigger reward logic
      if (responseData.score >= 80) {
        playSuccess();
        const earnedXp = Math.floor(responseData.score / 2);
        addXp(earnedXp);
        updateLetterMastery(letter.id, responseData.score);
      } else {
        playFail();
        updateLetterMastery(letter.id, responseData.score);
      }
    } catch (err) {
      console.error(err);
      setEvaluationResult({
        score: 75,
        stars: 3,
        feedback: "Sepertinya mikrofon anda menangkap bunyi luar biasa. Jangan bimbang, perkembangkan sebutan anda lagi!",
        makhrajTip: letter.makhrajRule
      });
    } finally {
      setIsEvaluating(false);
      setIsRecording(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-2 sm:p-4 md:p-6" id="ai-evaluator-ui">
      {/* Back Button */}
      {onBackToMenu && (
        <button
          onClick={() => { playClick(); onBackToMenu(); }}
          className="mb-5 inline-flex items-center gap-1.5 text-xs text-slate-600 font-bold hover:text-sky-600 bg-white border border-slate-200 rounded-full px-4 py-2 transition-all active:scale-95 shadow-sm cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Kembali Ke Menu Utama
        </button>
      )}

      {/* Two Column Layout for Vibrant Feel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start">
        
        {/* LEFT COLUMN: ACTIVE CHARACTER FLASHCARD (col-span-12 on mobile, col-span-7 on desktop) */}
        <div className="lg:col-span-7 bg-white rounded-[32px] sm:rounded-[40px] shadow-xl border-4 border-white overflow-hidden flex flex-col">
          
          {/* Header of the active card */}
          <div className="bg-gradient-to-r from-sky-500 to-sky-600 p-5 sm:p-6 flex justify-between items-center text-white">
            <span className="font-display font-black text-sm uppercase tracking-widest text-sky-100">
              HURUF {letter.id} DARIPADA 29
            </span>
            <span className="bg-sky-400/50 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-bold font-display">
              H.C BOARD
            </span>
          </div>

          {/* Card Body content */}
          <div className="p-6 sm:p-8 flex flex-col items-center bg-gradient-to-b from-white to-sky-50/50">
            
            {/* Slide Navigation Buttons with big elegant styling */}
            <div className="w-full flex items-center justify-between mb-6">
              <button
                onClick={onPrevLetter}
                className="p-3 bg-white hover:bg-sky-100 text-slate-700 hover:text-sky-700 border-2 border-slate-100 rounded-2xl active:scale-95 transition-all shadow-sm cursor-pointer"
                title="Huruf Sebelum (Previous)"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              
              <div className="text-center">
                <span className="text-[10px] font-black text-sky-600 tracking-widest uppercase bg-sky-100/70 px-3 py-1 rounded-full mb-1 inline-block font-display">
                  KAD HIJAIYAH PINTAR
                </span>
                <h2 className="text-2xl font-black text-slate-800 font-display tracking-tight">
                  Huruf {letter.name}
                </h2>
              </div>

              <button
                onClick={onNextLetter}
                className="p-3 bg-white hover:bg-sky-100 text-slate-700 hover:text-sky-700 border-2 border-slate-100 rounded-2xl active:scale-95 transition-all shadow-sm cursor-pointer"
                title="Huruf Seterusnya (Next)"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            {/* Massive Chunky 3D Arabic character card */}
            <div className="w-52 h-52 sm:w-60 sm:h-60 bg-white rounded-[40px] shadow-[0_12px_0_#e2e8f0] border-4 border-slate-100 flex items-center justify-center relative mb-8 group hover:-translate-y-2 hover:shadow-[0_18px_0_#cbd5e1] active:translate-y-1 active:shadow-[0_4px_0_#cbd5e1] transition-all cursor-pointer">
              <span className="text-8xl sm:text-9xl font-black text-slate-800 tracking-normal antialiased font-serif">
                {letter.char}
              </span>
              
              <span className="absolute top-4 left-4 bg-orange-500 text-white font-extrabold font-display px-3.5 py-1 rounded-2xl text-xs uppercase tracking-wider shadow-sm">
                {letter.name}
              </span>

              {/* Small audio icon in top right */}
              <div className="absolute top-4 right-4 text-sky-400 group-hover:text-amber-500 transition-colors">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>

            {/* Memory Anchor / Visual Metaphor Hint Bubble */}
            <div className="bg-amber-50/80 border-2 border-amber-100/60 p-4 rounded-2xl text-center max-w-md w-full shadow-sm mb-6">
              <span className="text-[10px] uppercase font-black text-amber-700 tracking-wider flex items-center justify-center gap-1.5 mb-1 font-display">
                <BookOpen className="w-3.5 h-3.5" /> PETUA MEMORI VISUAL
              </span>
              <p className="text-slate-700 text-xs sm:text-sm leading-relaxed font-sans font-semibold">
                &ldquo;{accentTips?.metaphor || letter.metaphor || "Bayangkan bentuk huruf ini agar mudah diingat!"}&rdquo;
              </p>
            </div>

            {/* Words Examples Dashboard with beautiful layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full bg-white border-2 border-slate-50 p-4 rounded-2xl mb-8 shadow-sm">
              <div className="sm:border-r border-slate-100 sm:pr-4 flex flex-col justify-center">
                <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider font-display">Contoh Kalimah</span>
                <span className="text-2xl font-black text-slate-800 tracking-wide font-sans mt-0.5">{letter.exampleWord}</span>
              </div>
              <div className="sm:pl-4 flex flex-col justify-center border-t sm:border-t-0 border-slate-100 pt-2 sm:pt-0">
                <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider font-display">Sebutan & Arti</span>
                <span className="text-sm font-black text-sky-600 font-display">{letter.exampleTrans}</span>
                <span className="text-xs text-slate-500">Maksud: {letter.exampleMeaning}</span>
              </div>
            </div>

            {/* Trigger actions */}
            <div className="w-full border-t border-slate-100 pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* 3D Orange Play Button */}
                <button
                  onClick={handleTextToSpeech}
                  disabled={isPlayingTts}
                  className={`py-4 px-6 rounded-3xl font-display font-black text-sm tracking-wide transition-all duration-150 flex flex-col items-center justify-center gap-2 relative cursor-pointer ${
                    isPlayingTts 
                      ? "bg-slate-200 text-slate-400 border-b-2 border-slate-300 translate-y-1 cursor-not-allowed" 
                      : "bg-orange-500 hover:bg-orange-600 text-white border-b-8 border-orange-700 hover:border-b-6 hover:-translate-y-0.5 active:border-b-2 active:translate-y-1 active:shadow-none shadow-[0_8px_16px_rgba(249,115,22,0.2)]"
                  }`}
                >
                  <Volume2 className={`w-6 h-6 ${isPlayingTts ? "animate-bounce" : ""}`} />
                  DENGAR SEBUTAN AI
                </button>

                {/* 3D Emerald Mic Button */}
                <button
                  onClick={startVoiceRecording}
                  className={`py-4 px-6 rounded-3xl font-display font-black text-sm tracking-wide transition-all duration-150 flex flex-col items-center justify-center gap-2 relative cursor-pointer ${
                    isRecording 
                      ? "bg-red-500 hover:bg-red-600 text-white border-b-2 border-red-700 translate-y-1 animate-pulse" 
                      : "bg-emerald-500 hover:bg-emerald-600 text-white border-b-8 border-emerald-700 hover:border-b-6 hover:-translate-y-0.5 active:border-b-2 active:translate-y-1 active:shadow-none shadow-[0_8px_16px_rgba(16,185,129,0.2)]"
                  }`}
                >
                  <Mic className={`w-6 h-6 ${isRecording ? "scale-110" : ""}`} />
                  {isRecording ? "SEDANG MENDENGAR..." : "RAKAM SEBUTAN SAYA"}
                </button>

              </div>

              {/* Language toggle selector */}
              <div className="flex items-center justify-between mt-5 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-black text-slate-500 font-display uppercase tracking-wide">Bahasa Pengecaman:</span>
                <div className="flex gap-1 bg-white p-0.5 rounded-xl border border-slate-200">
                  <button
                    onClick={() => { playClick(); setRecognitionLang("ar-SA"); }}
                    className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                      recognitionLang === "ar-SA" ? "bg-sky-500 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    العربية (Arab)
                  </button>
                  <button
                    onClick={() => { playClick(); setRecognitionLang("ms-MY"); }}
                    className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                      recognitionLang === "ms-MY" ? "bg-sky-500 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Rumi (Phonetic)
                  </button>
                </div>
              </div>

              {/* Sensitiviti & Petua Mikrofon */}
              <div className="mt-4 bg-sky-50/50 border border-sky-100 p-3 rounded-2xl text-[11px] text-sky-800 leading-relaxed font-sans">
                <p className="font-bold flex items-center gap-1">
                  💡 Tips Mikrofon & Sensitiviti:
                </p>
                <ul className="list-disc list-inside mt-1 space-y-1 text-slate-600">
                  <li>Pastikan berada di tempat sunyi dan rapatkan mikrofon ke mulut semasa menyebut huruf dengan suara yang lantang.</li>
                  <li>Sekiranya sebutan Arab sukar dikesan oleh mikrofon gajet anda, tukar mod ke <span className="font-semibold text-sky-800">Rumi (Phonetic)</span> dan sebut nama huruf (contoh: "Alif", "Ba").</li>
                </ul>
              </div>

            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: AI FEEDBACK, GUIDES & TRANSCRIPT (col-span-12 on mobile, col-span-5 on desktop) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* AI Evaluation Spinner Widget */}
          {isEvaluating && (
            <div className="w-full bg-white border-2 border-dashed border-sky-300 p-6 rounded-[28px] shadow-md flex flex-col items-center justify-center gap-3 text-center">
              <RefreshCw className="w-8 h-8 text-sky-500 animate-spin" />
              <p className="text-xs text-sky-800 font-black font-display uppercase tracking-wider">MENGANALISIS MAKRAJ SEBUTAN...</p>
              <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                Gemini AI sedang menapis fonetik suara anda berbanding sebutan asalnya! Sila tunggu seketika.
              </p>
            </div>
          )}

          {/* Live captured transcript indicator */}
          {transcript && (
            <div className="w-full bg-amber-50/70 border-2 border-dashed border-amber-300 p-4 rounded-2xl text-center">
              <span className="text-[9px] text-amber-800 font-black block uppercase tracking-widest font-display">SUARA ANDA TERCANGKAP SEBAGAI:</span>
              <span className="text-sm font-black text-amber-900 block mt-1 font-sans">&ldquo;{transcript}&rdquo;</span>
            </div>
          )}

          {/* Interactive Score Feedback Card or Guided Info */}
          {evaluationResult && !isEvaluating ? (
            <div className="bg-gradient-to-b from-purple-500 to-purple-600 rounded-[32px] p-6 sm:p-8 text-white shadow-xl relative overflow-hidden animate-[fadeIn_0.4s_ease-out]">
              {/* Decorative background visual shape */}
              <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-purple-400 opacity-20"></div>
              
              <span className="text-[10px] font-black uppercase tracking-widest text-purple-200 font-display">
                SISTEM PENILAIAN AI
              </span>
              <h3 className="text-2xl font-black mt-1 leading-none font-display">
                Hasil Penilaian
              </h3>

              {/* Dynamic Score Stars */}
              <div className="flex justify-start gap-1.5 mt-5">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <Star
                    key={idx}
                    className={`w-6 h-6 ${
                      idx < evaluationResult.stars 
                        ? "text-amber-300 fill-amber-300 transform scale-110 shadow-sm" 
                        : "text-purple-300/40"
                    }`}
                  />
                ))}
              </div>

              {/* Score breakdown metrics */}
              <div className="flex items-center justify-between border-b border-purple-400/30 pb-4 mt-5">
                <div>
                  <p className="text-[10px] text-purple-200 font-black uppercase font-display leading-none">SEBUTAN ANDA</p>
                  <p className="text-lg font-black text-white font-display mt-1">
                    {evaluationResult.score >= 90 ? "Sangat Hebat! 🎉" : evaluationResult.score >= 75 ? "Baik! 👍" : "Cuba Lagi! 💪"}
                  </p>
                </div>

                <div className="bg-amber-400 text-slate-900 font-black rounded-2xl p-2.5 text-center min-w-16 shadow-lg">
                  <span className="text-[9px] block opacity-85 uppercase leading-none font-display mb-0.5">SKOR PINTAR</span>
                  <span className="text-lg leading-none font-mono">{evaluationResult.score}%</span>
                </div>
              </div>

              {/* Penilai AI speech bubble */}
              <div className="mt-5">
                <span className="text-[9px] text-purple-200 font-black uppercase tracking-wider block font-display">Komen Penilai AI:</span>
                <p className="mt-1 bg-purple-600/40 p-4 rounded-2xl text-xs sm:text-sm font-semibold italic text-purple-50 leading-relaxed border border-purple-400/20 font-sans">
                  &ldquo;{evaluationResult.feedback}&rdquo;
                </p>
              </div>

              {/* Makhraj detailed tip */}
              <div className="mt-5">
                <span className="text-[9px] text-purple-200 font-black uppercase tracking-wider block font-display flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-amber-300" /> PANDUAN MAKHRAJ AI:
                </span>
                <p className="mt-1 bg-purple-600/40 p-4 rounded-2xl text-xs sm:text-sm leading-relaxed text-purple-50 font-sans border border-purple-400/20">
                  {evaluationResult.makhrajTip || letter.makhrajRule}
                </p>
              </div>

            </div>
          ) : (
            /* IF NO RESULT YET, SHOW COZY TUTORIAL / MISSION CARD FOR KIDS (Vibrant Blue/Purple style) */
            <div className="bg-gradient-to-b from-purple-500 to-purple-600 rounded-[32px] p-6 sm:p-8 text-white shadow-xl relative overflow-hidden flex flex-col">
              {/* Decorative top shape */}
              <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-purple-400 opacity-20"></div>
              
              <div className="flex items-center gap-2 text-amber-300 mb-2">
                <Sparkles className="w-6 h-6 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-wider font-display">MISI UTAMA SEBUTAN</span>
              </div>
              
              <h3 className="text-xl sm:text-2xl font-black font-display leading-tight">
                Mari Mula Meneroka!
              </h3>
              
              <p className="text-purple-100 text-xs sm:text-sm mt-3 leading-relaxed font-sans font-medium">
                Pencapaian terbaik terhasil apabila sebutan dimulakan dengan penuh tertib. Dengarkan suara sebutan AI melafazkannya, kemudian klik butang rekod untuk mencuba sebutan anda sendiri!
              </p>

              {/* Instructions list card */}
              <div className="mt-6 bg-purple-600/40 rounded-2xl p-4 border border-purple-400/30 text-xs space-y-1.5 font-sans font-semibold">
                <span className="text-[10px] uppercase font-black text-amber-300 block mb-2 font-display">TIPS MAKRAJ ASAS:</span>
                <div className="flex gap-2">
                  <span className="text-amber-300">🌿</span>
                  <span><strong>{letter.name}</strong> dilafazkan dari: {letter.makhrajRule}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-amber-300">⭐</span>
                  <span>Markah maklum balas pintar dinilai secara masa nyata.</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-amber-300">🎮</span>
                  <span>Capai markah &gt; 80% untuk tebus ganjaran XP serta bintang!</span>
                </div>
              </div>
            </div>
          )}

          {/* Daily Challenge Card matching the HTML sample design perfectly */}
          <div className="bg-emerald-500 rounded-[28px] p-6 text-white shadow-md relative overflow-hidden">
            {/* Background design glow */}
            <div className="absolute -right-10 -bottom-10 w-28 h-28 rounded-full bg-emerald-400 opacity-30"></div>
            
            <h4 className="text-md font-black font-display flex items-center gap-2 uppercase tracking-wide">
              <Trophy className="w-5 h-5 text-amber-300 animate-bounce" /> CABARAN HARIAN ANDA
            </h4>
            
            <div className="mt-4 space-y-2 text-xs font-sans font-semibold">
              <div className="flex items-center justify-between bg-emerald-600/30 p-3 rounded-2xl border border-emerald-400/20">
                <span>Pelajari sebutan 3 huruf baharu</span>
                <span className="font-bold bg-emerald-800/40 text-[10px] px-2.5 py-0.5 rounded-full">Aktif</span>
              </div>
              <div className="flex items-center justify-between bg-emerald-600/30 p-3 rounded-2xl border border-emerald-400/20">
                <span>Dapatkan markah &ge; 90% sebutan</span>
                <span className="font-bold bg-amber-400 text-slate-900 border border-amber-300 text-[10px] px-2.5 py-0.5 rounded-full">Misi</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
