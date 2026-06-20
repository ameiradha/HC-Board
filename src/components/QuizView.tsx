import React, { useState, useEffect, useRef } from "react";
import { HijaiyahLetter, HIJAIYAH_LETTERS } from "../data/hijaiyah";
import { playBeep, playSuccess, playFail, playClick } from "../utils/audio";
import QRScanner from "./QRScanner";
import { 
  Trophy, Star, Play, Timer, ArrowRight, CheckCircle2, 
  XCircle, RotateCcw, Volume2, Sparkles, Award, Zap, HelpCircle 
} from "lucide-react";

interface QuizViewProps {
  addXp: (amount: number) => void;
  updateLetterMastery: (letterId: number, score: number) => void;
  highScore: number;
  onUpdateHighScore: (score: number) => void;
}

type QuizType = "listen-choose" | "scan-speak" | "time-challenge" | "letter-match";

export default function QuizView({
  addXp,
  updateLetterMastery,
  highScore,
  onUpdateHighScore
}: QuizViewProps) {
  const [activeQuiz, setActiveQuiz] = useState<QuizType | null>(null);

  // General States
  const [score, setScore] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);

  // Dynamic Questions data
  const [choices, setChoices] = useState<string[]>([]);
  const [currentLetter, setCurrentLetter] = useState<HijaiyahLetter | null>(null);

  // Time Challenge States
  const [timeLeft, setTimeLeft] = useState(60);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Speak Scan states
  const [speakScanScannedLetter, setSpeakScanScannedLetter] = useState<HijaiyahLetter | null>(null);
  const [isRecordingResult, setIsRecordingResult] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [grading, setGrading] = useState(false);

  // Padanan states
  const [matchedPairs, setMatchedPairs] = useState<number[]>([]); // letter ids matched
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [selectedArabic, setSelectedArabic] = useState<string | null>(null);
  const [matchLetters, setMatchLetters] = useState<HijaiyahLetter[]>([]);
  const [matchNames, setMatchNames] = useState<string[]>([]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      stopTimeChallenge();
    };
  }, []);

  const selectQuiz = (type: QuizType) => {
    playClick();
    setActiveQuiz(type);
    resetQuizStates();

    if (type === "listen-choose" || type === "time-challenge") {
      generateQuestion(type);
    } else if (type === "letter-match") {
      generateMatchBoard();
    }
  };

  const resetQuizStates = () => {
    setScore(0);
    setQuestionIndex(0);
    setQuizFinished(false);
    setSelectedAnswer(null);
    setIsAnswerCorrect(null);
    setSpeakScanScannedLetter(null);
    setIsRecordingResult(null);
    setMatchedPairs([]);
    setSelectedWord(null);
    setSelectedArabic(null);
    setTimeLeft(60);
    stopTimeChallenge();
  };

  // Helper: Shuffle array
  const shuffleArray = <T,>(arr: T[]): T[] => {
    return [...arr].sort(() => Math.random() - 0.5);
  };

  // 1. GENERATE QUESTION FOR MULTIPLE CHOICES
  const generateQuestion = (mode: QuizType) => {
    setSelectedAnswer(null);
    setIsAnswerCorrect(null);

    const randomLetter = HIJAIYAH_LETTERS[Math.floor(Math.random() * HIJAIYAH_LETTERS.length)];
    setCurrentLetter(randomLetter);

    // Make 3 wrong choices
    const otherLetters = HIJAIYAH_LETTERS.filter(item => item.id !== randomLetter.id);
    const randomizedWrong = shuffleArray(otherLetters).slice(0, 3);
    
    // Merge & Shuffle
    const allChoices = shuffleArray([
      randomLetter.name,
      ...randomizedWrong.map(item => item.name)
    ]);
    setChoices(allChoices);

    // If "listen-choose", speak automatically!
    if (mode === "listen-choose") {
      setTimeout(() => {
        speakWord(randomLetter.char);
      }, 400);
    }
  };

  // Speaks Arabic
  const speakWord = (char: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(char);
      utt.lang = "ar-SA";
      utt.rate = 0.8;
      const voices = window.speechSynthesis.getVoices();
      const arabicVoice = voices.find(v => v.lang.startsWith("ar"));
      if (arabicVoice) {
        utt.voice = arabicVoice;
      }
      window.speechSynthesis.speak(utt);
    }
  };

  const handleSubmitAnswer = (ans: string, mode: QuizType) => {
    if (selectedAnswer !== null) return; // already selected
    setSelectedAnswer(ans);

    const isCorrect = (ans === currentLetter?.name);
    setIsAnswerCorrect(isCorrect);

    if (isCorrect) {
      playSuccess();
      setScore(prev => prev + 1);
      addXp(10);
    } else {
      playFail();
    }

    // Delay move to next
    setTimeout(() => {
      if (mode === "time-challenge") {
        generateQuestion("time-challenge");
      } else {
        if (questionIndex >= 4) {
          setQuizFinished(true);
        } else {
          setQuestionIndex(prev => prev + 1);
          generateQuestion("listen-choose");
        }
      }
    }, 1800);
  };

  // 2. TIME CHALLENGE CLOCK
  const startTimeChallenge = () => {
    setTimeLeft(60);
    generateQuestion("time-challenge");
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          stopTimeChallenge();
          setQuizFinished(true);
          // Update High Score if needed
          if (score > highScore) {
            onUpdateHighScore(score);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopTimeChallenge = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // 3. SCAN & SPEAK GRADER
  const handleSpeakScanScanned = (scanned: HijaiyahLetter) => {
    playBeep();
    setSpeakScanScannedLetter(scanned);
    setIsRecordingResult(null);
    setLiveTranscript("");
  };

  const startSpeakScanRecording = () => {
    if (!speakScanScannedLetter) return;
    setLiveTranscript("");
    setIsRecordingResult(null);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.lang = "ar-SA";
      rec.onstart = () => setIsRecording(true);
      rec.onresult = async (e: any) => {
        const text = e.results[0][0].transcript;
        setLiveTranscript(text);
        gradeSpeakScan(text);
      };
      rec.onerror = () => {
        setIsRecording(false);
        gradeSpeakScan("");
      };
      rec.onend = () => setIsRecording(false);
      rec.start();
    } else {
      // Simulator fallback
      setIsRecording(true);
      setTimeout(() => {
        setIsRecording(false);
        const randYesNo = Math.random() > 0.3;
        setLiveTranscript(randYesNo ? speakScanScannedLetter.name : "Salah");
        gradeSpeakScan(randYesNo ? speakScanScannedLetter.name : "Salah");
      }, 2000);
    }
  };

  const gradeSpeakScan = async (transcript: string) => {
    if (!speakScanScannedLetter) return;
    setGrading(true);

    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          letter: speakScanScannedLetter.char,
          transcript: transcript,
          expectedName: speakScanScannedLetter.name,
          makhrajRule: speakScanScannedLetter.makhrajRule
        })
      });

      const data = await res.json();
      setIsRecordingResult(data);
      if (data.score >= 85) {
        setScore(prev => prev + 1);
        addXp(15);
        playSuccess();
        updateLetterMastery(speakScanScannedLetter.id, data.score);
      } else {
        playFail();
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setGrading(false);
    }
  };

  // 4. LETTER MATCH (PADANAN HURUF)
  const generateMatchBoard = () => {
    // Select 4 random letters
    const select = shuffleArray(HIJAIYAH_LETTERS).slice(0, 4);
    setMatchLetters(shuffleArray(select));
    setMatchNames(shuffleArray(select.map(item => item.name)));
    setMatchedPairs([]);
    setSelectedWord(null);
    setSelectedArabic(null);
  };

  const handleMatchSelectArabic = (arabicChar: string) => {
    playClick();
    setSelectedArabic(arabicChar);
    checkMatch(arabicChar, selectedWord);
  };

  const handleMatchSelectWord = (wordPhonemic: string) => {
    playClick();
    setSelectedWord(wordPhonemic);
    checkMatch(selectedArabic, wordPhonemic);
  };

  const checkMatch = (arabic: string | null, label: string | null) => {
    if (!arabic || !label) return;

    // Search letter
    const originalLetter = HIJAIYAH_LETTERS.find(item => item.char === arabic);
    if (originalLetter && originalLetter.name === label) {
      // SUCCESS MATCH
      playSuccess();
      setMatchedPairs(prev => [...prev, originalLetter.id]);
      setScore(prev => prev + 1);
      addXp(10);
    } else {
      // FAIL
      playFail();
    }
    
    // Clear selection
    setSelectedWord(null);
    setSelectedArabic(null);

    // If fully paired, finish
    if (matchedPairs.length + 1 >= 4) {
      setTimeout(() => {
        setQuizFinished(true);
      }, 1500);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6" id="quiz-panel-ui">
      {/* Home / Menu Picker */}
      {!activeQuiz && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-black text-slate-800 font-sans tracking-tight">
              Permainan Kuiz Hijaiyah AI 🎯
            </h2>
            <p className="text-slate-500 text-xs mt-1">
              Main kuiz interaktif, latih sebutan makhraj, dan raih XP untuk naik pangkat!
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Quiz 1 Card */}
            <button
              onClick={() => selectQuiz("listen-choose")}
              className="p-5 text-left border border-indigo-100 hover:border-indigo-400 bg-white hover:bg-indigo-50/40 rounded-3xl active:scale-98 transition-all shadow-md group flex flex-col justify-between h-44"
            >
              <div>
                <span className="p-2 bg-indigo-100 text-indigo-700 rounded-2xl text-xs font-bold font-sans">Kuiz 1</span>
                <h4 className="font-extrabold text-sm text-slate-800 mt-3 font-sans group-hover:text-indigo-900 transition-colors">
                  Dengar &amp; Pilih 🎧
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  AI berbunyi dalam Bahasa Arab dan anda pilih bentuk huruf yang betul daripada 4 pilihan.
                </p>
              </div>
              <div className="text-indigo-600 hover:text-indigo-800 font-black text-xs flex items-center gap-1 group-hover:translate-x-1.5 transition-transform">
                Mula Main <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </button>

            {/* Quiz 2 Card */}
            <button
              onClick={() => selectQuiz("scan-speak")}
              className="p-5 text-left border border-emerald-100 hover:border-emerald-400 bg-white hover:bg-emerald-50/40 rounded-3xl active:scale-98 transition-all shadow-md group flex flex-col justify-between h-44"
            >
              <div>
                <span className="p-2 bg-emerald-100 text-emerald-700 rounded-2xl text-xs font-bold font-sans">Kuiz 2</span>
                <h4 className="font-extrabold text-sm text-slate-800 mt-3 font-sans group-hover:text-emerald-900 transition-colors">
                  Scan &amp; Sebut 📷
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Imbas QR Code mana-mana kad, sebut huruf di depan mikrofon, dan biarkan Penilai AI memberi rating!
                </p>
              </div>
              <div className="text-emerald-600 hover:text-emerald-800 font-black text-xs flex items-center gap-1 group-hover:translate-x-1.5 transition-transform">
                Mula Main <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </button>

            {/* Quiz 3 Card */}
            <button
              onClick={() => { selectQuiz("time-challenge"); setTimeout(() => startTimeChallenge(), 100); }}
              className="p-5 text-left border border-rose-100 hover:border-rose-400 bg-white hover:bg-rose-50/40 rounded-3xl active:scale-98 transition-all shadow-md group flex flex-col justify-between h-44"
            >
              <div>
                <span className="p-2 bg-rose-100 text-rose-700 rounded-2xl text-xs font-bold font-sans">Kuiz 3</span>
                <h4 className="font-extrabold text-sm text-slate-800 mt-3 font-sans group-hover:text-rose-900 transition-colors">
                  Cabaran Masa ⏱️
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Tempoh 60 saat yang mencabar! Jawab seberapa banyak huruf dengan tepat untuk memecahkan rekod.
                </p>
              </div>
              <div className="text-rose-600 hover:text-rose-800 font-black text-xs flex items-center gap-1 group-hover:translate-x-1.5 transition-transform">
                Mula Cabaran <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </button>

            {/* Quiz 4 Card */}
            <button
              onClick={() => selectQuiz("letter-match")}
              className="p-5 text-left border border-amber-100 hover:border-amber-400 bg-white hover:bg-amber-50/40 rounded-3xl active:scale-98 transition-all shadow-md group flex flex-col justify-between h-44"
            >
              <div>
                <span className="p-2 bg-amber-100 text-amber-700 rounded-2xl text-xs font-bold font-sans">Kuiz 4</span>
                <h4 className="font-extrabold text-sm text-slate-800 mt-3 font-sans group-hover:text-amber-900 transition-colors">
                  Padanan Huruf 🧩
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Padankan bunyi tulisan fonetik dengan huruf Hijaiyah yang sesuai dalam permainan sambung kad.
                </p>
              </div>
              <div className="text-amber-600 hover:text-amber-800 font-black text-xs flex items-center gap-1 group-hover:translate-x-1.5 transition-transform">
                Sesuaikan Kad <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* RENDER ACTIVE GAME SCREEN */}
      {activeQuiz && (
        <div className="bg-slate-50 border border-slate-100 rounded-[32px] p-6 shadow-xl relative overflow-hidden">
          
          {/* Active Header Navigation Back Row */}
          <div className="flex items-center justify-between mb-6 border-b border-slate-200/55 pb-3">
            <button
              onClick={() => { playClick(); setActiveQuiz(null); }}
              className="text-xs font-bold text-slate-500 bg-slate-200/70 hover:bg-slate-200 hover:text-slate-800 px-3 py-1.5 rounded-full"
            >
              &larr; Keluar
            </button>
            <div className="text-center">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-widest block leading-none mb-1">
                {activeQuiz === "listen-choose" ? "🎧 Dengar & Pilih" : activeQuiz === "scan-speak" ? "📷 Scan & Sebut" : activeQuiz === "time-challenge" ? "⏱️ Cabaran Masa" : "🧩 Padanan Huruf"}
              </span>
              <p className="text-slate-500 text-[10px] leading-none">Skor Semasa: {score} Markah</p>
            </div>
            {activeQuiz === "time-challenge" ? (
              <div className="flex items-center gap-1 bg-red-100 text-red-700 font-extrabold text-sm px-3 py-1 rounded-xl animate-pulse">
                <Timer className="w-4 h-4" /> {timeLeft}s
              </div>
            ) : (
              <div className="w-12"></div>
            )}
          </div>

          {/* GAME CONCLUDING OVERLAY */}
          {quizFinished ? (
            <div className="text-center py-8 space-y-4">
              <div className="inline-flex p-5 bg-amber-100 rounded-[32px] text-amber-600 shadow-sm animate-bounce">
                <Trophy className="w-16 h-16" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 leading-tight">Tahniah Anak Pintar! 🎉</h3>
                <p className="text-slate-500 text-xs mt-1">Anda telah menyiapkan tugasan permainan ini dengan jayanya.</p>
              </div>

              {/* Dynamic stats overview */}
              <div className="bg-white border border-slate-200 p-5 rounded-2xl max-w-sm mx-auto space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Bintang Diperoleh:</span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < Math.min(score, 5) ? "text-amber-400 fill-amber-400" : "text-slate-200"}`} />
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Jumlah Skor Anda:</span>
                  <span className="font-bold text-slate-800">{score} Latihan</span>
                </div>
                {activeQuiz === "time-challenge" && (
                  <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-100">
                    <span className="text-rose-600 font-bold">Rekod Terbaik Anda:</span>
                    <span className="font-extrabold text-slate-800">{score > highScore ? score : highScore}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center gap-3 pt-4">
                <button
                  onClick={() => selectQuiz(activeQuiz)}
                  className="px-5 py-2.5 bg-emerald-500 text-white hover:bg-emerald-600 text-xs font-bold rounded-full flex items-center gap-1 active:scale-95 transition-all shadow-md"
                >
                  <RotateCcw className="w-4 h-4" /> Main Semula
                </button>
                <button
                  onClick={() => { playClick(); setActiveQuiz(null); }}
                  className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-full active:scale-95 transition-all"
                >
                  Kembali ke Menu
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* QUIZ 1 & 3: MULTIPLE CHOICES STAGES */}
              {(activeQuiz === "listen-choose" || activeQuiz === "time-challenge") && currentLetter && (
                <div className="text-center space-y-6">
                  <div>
                    {activeQuiz === "listen-choose" ? (
                      <span className="text-[10px] font-extrabold bg-blue-100 text-blue-700 px-3 py-1 rounded-full uppercase">
                        Soalan {questionIndex + 1} daripada 5
                      </span>
                    ) : (
                      <span className="text-[10px] font-extrabold bg-rose-100 text-rose-700 px-3 py-1 rounded-full uppercase">
                        Mod Pecutan Cabaran Masa
                      </span>
                    )}
                    <h4 className="text-base font-extrabold text-slate-800 font-sans mt-3">
                      Sila dengarkan bunyi dan pilih huruf Hijaiyah yang betul!
                    </h4>
                  </div>

                  {/* Play sound again node */}
                  <div className="flex justify-center">
                    <button
                      onClick={() => speakWord(currentLetter.char)}
                      className="p-6 bg-indigo-500 hover:bg-indigo-600 text-white rounded-[32px] shadow-lg hover:shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 group cursor-pointer"
                    >
                      <Volume2 className="w-8 h-8 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-extrabold tracking-wide uppercase">Dengar Bunyi</span>
                    </button>
                  </div>

                  {/* Choices Buttons grid */}
                  <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
                    {choices.map((choice, index) => {
                      const isSelected = selectedAnswer === choice;
                      const isThisCorrect = choice === currentLetter.name;
                      let btnStyle = "bg-white border-slate-200 text-slate-700 hover:border-indigo-400 hover:bg-indigo-50/20";
                      
                      if (selectedAnswer !== null) {
                        if (isSelected) {
                          btnStyle = isThisCorrect ? "bg-emerald-500 text-white border-emerald-500" : "bg-red-500 text-white border-red-500";
                        } else if (isThisCorrect) {
                          btnStyle = "bg-emerald-500 text-white border-emerald-500";
                        }
                      }

                      return (
                        <button
                          key={index}
                          onClick={() => handleSubmitAnswer(choice, activeQuiz)}
                          disabled={selectedAnswer !== null}
                          className={`p-4 rounded-2xl border-2 font-bold text-center transition-all text-xs active:scale-95 ${btnStyle}`}
                        >
                          {choice}
                        </button>
                      );
                    })}
                  </div>

                  {selectedAnswer !== null && (
                    <div className="p-3 bg-white border border-slate-200 rounded-2xl max-w-xs mx-auto animate-pulse flex items-center justify-center gap-1.5 text-xs font-bold">
                      {isAnswerCorrect ? (
                        <span className="text-emerald-600">Betul tepat! +10 XP</span>
                      ) : (
                        <span className="text-red-500">Salah, jawapan betul: {currentLetter.name}</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* QUIZ 2: SCAN & SPEAK STAGE */}
              {activeQuiz === "scan-speak" && (
                <div className="space-y-6">
                  {!speakScanScannedLetter ? (
                    <div>
                      <div className="text-center mb-4">
                        <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl text-[10px] font-bold">Langkah 1</span>
                        <h4 className="text-sm font-black text-slate-700 mt-2 font-sans">Sila Imbas Kad Huruf Dahulu</h4>
                      </div>
                      <QRScanner
                        onScanned={handleSpeakScanScanned}
                        titleOverride="Imbas kad pilihan anda untuk mulakan cabaran sebutan"
                      />
                    </div>
                  ) : (
                    <div className="text-center space-y-6">
                      <div className="text-center">
                        <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl text-[10px] font-bold">Langkah 2</span>
                        <h4 className="text-sm font-black text-slate-700 mt-2">Sebutkan Huruf Ini Sekarang!</h4>
                      </div>

                      {/* Display targeted letter */}
                      <div className="mx-auto w-32 h-32 bg-emerald-500 rounded-3xl flex items-center justify-center text-white text-5xl font-extrabold shadow-lg">
                        {speakScanScannedLetter.char}
                      </div>
                      <h5 className="text-sm font-bold text-emerald-700 tracking-tight leading-none">
                        Huruf: {speakScanScannedLetter.name}
                      </h5>

                      <div className="flex justify-center gap-3">
                        <button
                          onClick={startSpeakScanRecording}
                          disabled={isRecording || grading}
                          className={`px-5 py-3.5 rounded-full font-bold text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95 ${
                            isRecording 
                              ? "bg-red-500 text-white animate-pulse" 
                              : "bg-teal-500 hover:bg-teal-600 text-white shadow-teal-500/10"
                          }`}
                        >
                          <Zap className="w-4 h-4" /> {isRecording ? "Mendengar..." : "Sebut Sekarang!"}
                        </button>
                        <button
                          onClick={() => { playClick(); setSpeakScanScannedLetter(null); }}
                          className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-600 text-xs font-bold rounded-full active:scale-95 transition-all"
                        >
                          Tukar Huruf
                        </button>
                      </div>

                      {grading && (
                        <div className="text-xs font-semibold text-slate-500 animate-pulse">
                          AI sedang menilai sebutan anda...
                        </div>
                      )}

                      {liveTranscript && (
                        <p className="text-xs text-slate-500">
                          Suara tertangkap: <span className="font-bold text-slate-800">&ldquo;{liveTranscript}&rdquo;</span>
                        </p>
                      )}

                      {/* AI Evaluation Grade Feedback */}
                      {isRecordingResult && (
                        <div className="bg-white border border-emerald-200 p-4 rounded-2xl max-w-sm mx-auto shadow-md">
                          <div className="flex justify-center mb-1">
                            {Array.from({ length: 5 }).map((_, idx) => (
                              <Star key={idx} className={`w-4 h-4 ${idx < isRecordingResult.stars ? "text-amber-400 fill-amber-400" : "text-slate-200"}`} />
                            ))}
                          </div>
                          <span className="text-[10px] uppercase font-bold text-slate-400">Hasil Penilaian AI</span>
                          <p className="text-xs font-black text-slate-700 leading-tight mt-1">{isRecordingResult.feedback}</p>
                          <span className="block text-[11px] font-bold text-emerald-700 mt-1">Skor Ketepatan: {isRecordingResult.score}%</span>
                        </div>
                      )}

                    </div>
                  )}
                </div>
              )}

              {/* QUIZ 4: PADANAN HURUF */}
              {activeQuiz === "letter-match" && (
                <div className="space-y-6">
                  <div className="text-center">
                    <span className="p-2 bg-amber-100 text-amber-800 rounded-xl text-[10px] font-bold">Padanan Kad Sambung</span>
                    <h4 className="text-xs font-extrabold text-slate-700 mt-2">
                      Sila padankan KAD HURUF (kiri) dengan KAD BUNYI (kanan) yang sepadan!
                    </h4>
                  </div>

                  {/* Connect Grid layout */}
                  <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                    
                    {/* Arabic Characters list */}
                    <div className="space-y-2">
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase block text-center">Simbol Hijaiyah</span>
                      {matchLetters.map((letter) => {
                        const isMatched = matchedPairs.includes(letter.id);
                        const isSelected = selectedArabic === letter.char;

                        return (
                          <button
                            key={letter.id}
                            disabled={isMatched}
                            onClick={() => handleMatchSelectArabic(letter.char)}
                            className={`w-full p-4 rounded-2xl border-2 font-bold text-lg flex items-center justify-center transition-all ${
                              isMatched 
                                ? "bg-emerald-100 border-emerald-300 text-emerald-600 line-through cursor-not-allowed" 
                                : isSelected 
                                  ? "bg-amber-100 border-amber-500 text-amber-900 shadow-md ring-2 ring-amber-300" 
                                  : "bg-white border-slate-200 text-slate-700 hover:border-amber-400"
                            }`}
                          >
                            {letter.char} {isMatched && "✓"}
                          </button>
                        );
                      })}
                    </div>

                    {/* Word Spelling Phonemics list */}
                    <div className="space-y-2">
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase block text-center">Sebut Melayu</span>
                      {matchNames.map((name, index) => {
                        // find matching id to check matched status
                        const lObj = HIJAIYAH_LETTERS.find(i => i.name === name);
                        const isMatched = lObj ? matchedPairs.includes(lObj.id) : false;
                        const isSelected = selectedWord === name;

                        return (
                          <button
                            key={index}
                            disabled={isMatched}
                            onClick={() => handleMatchSelectWord(name)}
                            className={`w-full p-4 rounded-2xl border-2 font-bold text-xs flex items-center justify-center transition-all uppercase ${
                              isMatched 
                                ? "bg-emerald-100 border-emerald-300 text-emerald-600 line-through cursor-not-allowed" 
                                : isSelected 
                                  ? "bg-amber-100 border-amber-500 text-amber-900 shadow-md ring-2 ring-amber-300" 
                                  : "bg-white border-slate-200 text-slate-700 hover:border-amber-400"
                            }`}
                          >
                            {name} {isMatched && "✓"}
                          </button>
                        );
                      })}
                    </div>

                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      )}

    </div>
  );
}
