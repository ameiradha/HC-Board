import React, { useState } from "react";
import { HIJAIYAH_LETTERS, HijaiyahLetter } from "../data/hijaiyah";
import { generateQrSvg, getQrGrid } from "../utils/qr";
import { playBeep, playClick } from "../utils/audio";
import { Printer, Download, Share2, Grid, BookOpen, AlertCircle, FileDown } from "lucide-react";
import { jsPDF } from "jspdf";

export default function QRGenerator() {
  const [selectedLetter, setSelectedLetter] = useState<HijaiyahLetter | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handlePrintAll = () => {
    playBeep();
    window.print();
  };

  const handleDownloadFullPdf = async () => {
    playClick();
    setIsGeneratingPdf(true);
    
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      // Loop over all 29 HIJAIYAH_LETTERS
      for (let i = 0; i < HIJAIYAH_LETTERS.length; i++) {
        const letter = HIJAIYAH_LETTERS[i];
        
        // Add new page after the first page
        if (i > 0) {
          doc.addPage();
        }

        // --- DRAW BORDERS & SHAPES ---
        // Elegant outer frame (sky-500 color)
        doc.setDrawColor(14, 165, 233); // sky-500
        doc.setLineWidth(1.5);
        doc.rect(15, 15, 180, 267); // Margins of 15mm

        // Subtle inner border
        doc.setDrawColor(224, 242, 254); // sky-100
        doc.setLineWidth(0.5);
        doc.rect(18, 18, 174, 261);

        // --- HEADER ---
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(2, 132, 199); // sky-600
        doc.text("JOM BELAJAR HIJAIYAH AI", 105, 30, { align: "center" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text("H.C Board - Kad Imbasan Makhraj Kekal", 105, 36, { align: "center" });

        // Decorative horizontal rule
        doc.setDrawColor(224, 242, 254);
        doc.setLineWidth(0.5);
        doc.line(30, 42, 180, 42);

        // --- LARGE ARABIC LETTER EMBED (CANVAS RENDERER) ---
        // Render Arabic letter offscreen to PNG to bypass unicode PDF font limitations
        const canvas = document.createElement("canvas");
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          // Transparent background
          ctx.clearRect(0, 0, 400, 400);
          
          // Draw a soft sky-blue circle background
          ctx.fillStyle = "#f0f9ff"; // sky-50
          ctx.beginPath();
          ctx.arc(200, 200, 180, 0, 2 * Math.PI);
          ctx.fill();

          // Border for the circle
          ctx.strokeStyle = "#bae6fd"; // sky-200
          ctx.lineWidth = 12;
          ctx.stroke();

          // Draw Arabic glyph perfectly centered
          ctx.fillStyle = "#0369a1"; // sky-700
          ctx.font = "bold 200px Arial, 'Microsoft Sans Serif', system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(letter.char, 200, 200);
        }
        
        const letterDataUrl = canvas.toDataURL("image/png");
        // Place the beautiful letter circle on the PDF page
        doc.addImage(letterDataUrl, "PNG", 75, 48, 60, 60);

        // --- PHONETIC LABELS ---
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text(`HURUF ${letter.name.toUpperCase()}`, 105, 120, { align: "center" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(51, 65, 85); // slate-700
        doc.text(`Bunyi Sebutan: ${letter.phonemic}`, 105, 127, { align: "center" });

        // Outer box for QR Code
        doc.setFillColor(248, 250, 252); // slate-50
        doc.roundedRect(65, 137, 80, 80, 4, 4, "F");
        
        doc.setDrawColor(241, 245, 249); // slate-100
        doc.setLineWidth(0.5);
        doc.roundedRect(65, 137, 80, 80, 4, 4, "D");

        // --- VECTOR QR CODE DRAWING ---
        // Get the stable QR grid
        const qrGrid = getQrGrid(`hijaiyah:${letter.name.toLowerCase()}`);
        const matrixSize = 25;
        const qrSize = 70; // 70mm x 70mm QR
        const qrStartX = 105 - (qrSize / 2);
        const qrStartY = 142;
        const cellSize = qrSize / matrixSize;

        doc.setFillColor(30, 41, 59); // slate-800
        for (let r = 0; r < matrixSize; r++) {
          for (let c = 0; c < matrixSize; c++) {
            if (qrGrid[r][c]) {
              const xPos = qrStartX + (c * cellSize);
              const yPos = qrStartY + (r * cellSize);
              // Draw small overlap rect
              doc.rect(xPos, yPos, cellSize + 0.05, cellSize + 0.05, "F");
            }
          }
        }

        // --- MAKHRAJ EXPLANATION PANEL ---
        doc.setFillColor(240, 253, 250); // teal-50
        doc.roundedRect(25, 222, 160, 18, 2, 2, "F");
        doc.setDrawColor(153, 246, 228); // teal-200
        doc.setLineWidth(0.3);
        doc.roundedRect(25, 222, 160, 18, 2, 2, "D");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(13, 148, 136); // teal-600
        doc.text("PANDUAN SEBUTAN MAKRAJ ASAS KERAJAAN:", 105, 227, { align: "center" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(15, 118, 110); // teal-700
        
        // Wrap/split long text to avoid overflow
        const ruleLines = doc.splitTextToSize(letter.makhrajRule, 150);
        doc.text(ruleLines, 105, 232, { align: "center" });

        // --- FUN CAPTION / METAPHOR ---
        doc.setFont("helvetica", "italic");
        doc.setFontSize(10);
        doc.setTextColor(217, 119, 6); // amber-600
        const metaphorLines = doc.splitTextToSize(`"${letter.metaphor}"`, 150);
        doc.text(metaphorLines, 105, 248, { align: "center" });

        // --- FOOTER INFO ---
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text("Hak Cipta Terpelihara (c) 2026 - Jom Belajar Huruf Hijaiyah AI (H.C Board)", 105, 268, { align: "center" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text(`Imbas QR di atas dalam Web App untuk menguji sebutan serta-merta  |  Keping ${letter.id} / ${HIJAIYAH_LETTERS.length}`, 105, 273, { align: "center" });
      }

      // Save PDF
      doc.save("Kad_Imbasan_Hijaiyah_AI_HC_Board.pdf");
    } catch (error) {
      console.error("Gagal menjana PDF:", error);
      alert("Maaf, ralat berlaku semasa menghasilkan PDF. Sila cuba lagi.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadSingleSvg = (letter: HijaiyahLetter) => {
    playClick();
    const svgContent = generateQrSvg(`hijaiyah:${letter.name.toLowerCase()}`, 250);
    const blob = new Blob([svgContent], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `QR_Hijaiyah_${letter.name}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleShare = async (letter: HijaiyahLetter) => {
    playClick();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Kad QR Jom Belajar Hijaiyah - ${letter.name}`,
          text: `Jom scan dan belajar sebutan huruf ${letter.char} (${letter.name}) bersama AI!`,
          url: window.location.origin
        });
      } catch (e) {
        console.warn(e);
      }
    } else {
      alert("Fungsi kongsi tidak disokong oleh pelayar anda. Anda boleh memuat turun fail SVG!");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6" id="qr-generator-panel">
      {/* Printable Sheet styling inject - Hide everything except cards grid upon printing */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area-only, #print-area-only * {
            visibility: visible;
          }
          #print-area-only {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Intro info card */}
      <div className="bg-white rounded-3xl border border-dashed border-amber-200 p-6 shadow-md mb-8 flex flex-col md:flex-row items-center justify-between gap-6 no-print">
        <div>
          <h3 className="text-xl font-black text-slate-800 font-sans tracking-tight">
            Muat Turun &amp; Cetak Kad QR Hijaiyah 🖨️
          </h3>
          <p className="text-slate-500 text-xs mt-1 leading-relaxed max-w-xl">
            Cipta kad fizikal bercetak untuk murid di rumah atau kelas! Anda boleh mencetak terus atau memuat turun **fail PDF Kekal (Satu Huruf Sepos, {HIJAIYAH_LETTERS.length} Muka Surat)** secara percuma yang dijamin tidak akan tamat tempoh dan boleh diimbas selamanya.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
          <button
            onClick={handleDownloadFullPdf}
            disabled={isGeneratingPdf}
            className={`px-5 py-2.5 ${
              isGeneratingPdf 
                ? 'bg-slate-400 cursor-not-allowed' 
                : 'bg-gradient-to-tr from-sky-400 to-sky-500 hover:opacity-90 active:scale-95 shadow-lg shadow-sky-500/15'
            } text-white font-extrabold text-xs rounded-full transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer`}
          >
            <FileDown className="w-4 h-4" /> 
            {isGeneratingPdf ? "Menjana PDF..." : `Muat Turun PDF Kad (${HIJAIYAH_LETTERS.length} Page)`}
          </button>
          <button
            onClick={handlePrintAll}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold text-xs rounded-full shadow-lg shadow-orange-500/15 flex items-center justify-center gap-1.5 hover:opacity-90 active:scale-95 transition-all text-center cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Cetak (A4)
          </button>
        </div>
      </div>

      {/* Print target Container layout */}
      <div id="print-area-only" className="bg-slate-50 rounded-3xl p-6 border border-slate-100 shadow-xl">
        <div className="mb-6 flex items-center justify-between no-print">
          <span className="text-xs font-bold text-slate-500">Jumlah: {HIJAIYAH_LETTERS.length} Kad QR Sedia Dicetak</span>
          <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full font-bold">Cetak A4 Sesuai</span>
        </div>

        {/* Layout grid cards - Standard business card ratio when printed */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4" id="cards-grid">
          {HIJAIYAH_LETTERS.map((letter) => (
            <div
              key={letter.id}
              className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-5 flex flex-col items-center justify-between text-center relative shadow-sm hover:shadow-md transition-shadow group overflow-hidden break-inside-avoid min-h-72"
            >
              {/* Card Label Header */}
              <div className="w-full flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-slate-400">Jom Belajar Hijaiyah AI</span>
                <span className="text-xs font-bold text-emerald-600 font-mono">#{letter.id}</span>
              </div>

              {/* Character Viewport */}
              <div className="my-2 select-none flex flex-col items-center">
                <span className="text-3xl font-black text-slate-800 leading-none font-sans mb-1">{letter.char}</span>
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">{letter.name}</span>
                <span className="text-[10px] text-slate-400 font-bold">Makhraj: {letter.phonemic}</span>
              </div>

              {/* Vector QR Code */}
              <div 
                className="my-3 opacity-90 hover:opacity-100 transition-opacity p-2.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center shadow-inner"
                dangerouslySetInnerHTML={{ __html: generateQrSvg(`hijaiyah:${letter.name.toLowerCase()}`, 110) }}
              />

              {/* Fun small caption */}
              <p className="text-[9px] text-slate-400 italic leading-snug font-sans px-2 mb-2">
                &ldquo;{letter.metaphor}&rdquo;
              </p>

              {/* Bottom Quick-Action toolbox */}
              <div className="w-full flex items-center justify-center gap-1.5 no-print mt-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => handleDownloadSingleSvg(letter)}
                  className="p-1.5 bg-slate-100 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl active:scale-95 transition-all text-xs flex items-center justify-center gap-1 font-bold"
                  title="Muat turun SVG"
                >
                  <Download className="w-3.5 h-3.5" /> <span className="text-[10px]">Muat Turun</span>
                </button>
                <button
                  onClick={() => handleShare(letter)}
                  className="p-1.5 bg-slate-100 text-slate-600 hover:text-sky-700 hover:bg-sky-50 rounded-xl active:scale-95 transition-all"
                  title="Kongsi Kad"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
