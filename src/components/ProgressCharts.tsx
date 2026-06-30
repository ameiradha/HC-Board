import React from "react";
import { HIJAIYAH_LETTERS } from "../data/hijaiyah";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area 
} from "recharts";
import { Trophy, TrendingUp, Award, Zap, Smile, BookOpen } from "lucide-react";

interface ProgressChartsProps {
  masteryRecord: Record<number, number>; // Maps letterId to high score
  totalXp: number;
}

export default function ProgressCharts({ masteryRecord, totalXp }: ProgressChartsProps) {
  const lettersScored = Object.keys(masteryRecord).length;
  
  // Calculate average score
  const scores = Object.values(masteryRecord);
  const avgScore = scores.length > 0 
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) 
    : 0;

  // Letters perfected (max score >= 80)
  const lettersMastered = scores.filter(s => s >= 80).length;

  // Parse chart data for the 29 Hijaiyah letters
  const chartData = HIJAIYAH_LETTERS.map((letter) => ({
    name: letter.name,
    score: masteryRecord[letter.id] || 0,
    makhraj: letter.phonemic
  }));

  // Identify ranking badge based on XP
  const getRankBadge = (xp: number) => {
    if (xp >= 1000) return { title: "Pendekar Makhraj 👑", color: "from-amber-500 to-orange-500", desc: "Sangat luar biasa! Anda menguasai Makhraj Hijaiyah sepenuhnya." };
    if (xp >= 600) return { title: "Sufi Al-Quran Muda 🌟", color: "from-indigo-500 to-purple-500", desc: "Bagus sekali! Penghafalan dan sebutan tajwid anda mantap." };
    if (xp >= 300) return { title: "Anak Bintang Huruf ✨", color: "from-teal-400 to-emerald-500", desc: "Hebat! Teruskan sebutan dan latihan setiap hari." };
    return { title: "Penjelajah Hijaiyah 🎒", color: "from-blue-400 to-sky-500", desc: "Mula terokai dan sebut huruf-huruf dengan AI Penyayang!" };
  };

  const badge = getRankBadge(totalXp);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6" id="progress-charts-panel">
      {/* Dynamic Bento Box Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        
        {/* Card 1: Rank Badge */}
        <div className={`p-6 bg-gradient-to-br ${badge.color} text-white rounded-3xl shadow-lg relative overflow-hidden flex flex-col justify-between min-h-36`}>
          <div>
            <span className="text-[9px] uppercase font-bold tracking-widest opacity-80 block leading-none mb-1">
              Pangkat Pencapaian
            </span>
            <h4 className="text-lg font-black font-sans leading-tight">
              {badge.title}
            </h4>
          </div>
          <div>
            <p className="text-[10px] leading-relaxed opacity-90 font-medium font-sans">
              {badge.desc}
            </p>
          </div>
          <Award className="absolute -right-3 -bottom-3 w-20 h-20 opacity-20 transform rotate-12" />
        </div>

        {/* Card 2: Letters Mastered Gauge */}
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-md flex items-center gap-4 relative overflow-hidden min-h-36">
          <div className="w-16 h-16 rounded-2xl bg-emerald-150 text-emerald-800 flex items-center justify-center font-bold shrink-0 shadow-sm">
            <Trophy className="w-8 h-8 text-emerald-600" />
          </div>
          <div>
            <span className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">
              Dikuasai (Skor &ge; 80)
            </span>
            <h5 className="text-2xl font-black text-slate-800 leading-none mt-1">
              {lettersMastered} / {HIJAIYAH_LETTERS.length} <span className="text-xs text-slate-400 font-normal">Huruf</span>
            </h5>
            <p className="text-[10px] text-slate-500 mt-1 leading-snug">
              Kuasai semua {HIJAIYAH_LETTERS.length} huruf Hijaiyah utama untuk mendapatkan pingat emas!
            </p>
          </div>
        </div>

        {/* Card 3: Experience & Average Score */}
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-md flex items-center gap-4 relative overflow-hidden min-h-36">
          <div className="w-16 h-16 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold shrink-0 shadow-sm">
            <Zap className="w-8 h-8 text-teal-600 animate-pulse" />
          </div>
          <div className="w-full">
            <span className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider block leading-none mb-1">
              Markah Penting
            </span>
            <div className="flex items-center gap-4">
              <div>
                <span className="text-[10px] text-slate-400 leading-none">Jumlah XP</span>
                <p className="text-lg font-black text-slate-800 leading-none">{totalXp}</p>
              </div>
              <div className="w-0.5 h-6 bg-slate-100"></div>
              <div>
                <span className="text-[10px] text-slate-400 leading-none">Purata Skor</span>
                <p className="text-lg font-black text-emerald-600 leading-none">{avgScore}%</p>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 leading-snug">
              Lakukan latihan makhraj sebutan harian murid untuk meningkatkan purata skor peratusan.
            </p>
          </div>
        </div>

      </div>

      {/* Recharts Analytics Graph Chart Area */}
      <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-xl space-y-6">
        <div>
          <h4 className="text-md font-extrabold text-slate-800 flex items-center gap-1.5 font-sans">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            Carta Penguasaan Skor Huruf Hijaiyah
          </h4>
          <p className="text-slate-500 text-xs mt-0.5">
            Graf di bawah memaparkan skor tertinggi yang diperolehi bagi setiap sebutan huruf (60% - 100%).
          </p>
        </div>

        {/* Chart Window */}
        <div className="h-64 md:h-80 w-full bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 9, fontWeight: "bold", fill: "#64748b" }} 
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                domain={[0, 100]} 
                tick={{ fontSize: 9, fontWeight: "bold", fill: "#94a3b8" }} 
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-800 text-white p-3 rounded-xl border border-slate-700 shadow-md text-xs">
                        <p className="font-bold">Huruf {data.name}</p>
                        <p className="text-[10px] text-slate-350">Makhraj: {data.makhraj}</p>
                        <p className="text-emerald-300 font-extrabold mt-1">Skor Tertinggi: {data.score}%</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar 
                dataKey="score" 
                fill="#10b981" 
                radius={[4, 4, 0, 0]} 
                maxBarSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Simple masteries overview listing below chart */}
        <div className="border-t border-slate-100 pt-5">
          <h5 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-1.5 font-sans">
            <BookOpen className="w-4 h-4 text-emerald-600" />
            Senarai Penguasaan Huruf Hijaiyah
          </h5>
          <div className="flex flex-wrap gap-2">
            {HIJAIYAH_LETTERS.map((letter) => {
              const maxScore = masteryRecord[letter.id] || 0;
              let badgeColor = "bg-slate-100 border-slate-200 text-slate-500";
              if (maxScore >= 90) badgeColor = "bg-emerald-55 border-emerald-200 text-emerald-800 font-bold";
              else if (maxScore >= 75) badgeColor = "bg-indigo-50 border-indigo-200 text-indigo-800";

              return (
                <div
                  key={letter.id}
                  className={`px-3 py-1.5 rounded-full border text-xs flex items-center gap-1.5 ${badgeColor}`}
                >
                  <span className="text-sm font-black font-sansLeading text-center">{letter.char}</span>
                  <span className="text-[10px] leading-none shrink-0 font-sans tracking-tight">{letter.name} ({maxScore}%)</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
