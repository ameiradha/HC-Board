export interface HijaiyahLetter {
  id: number;
  char: string;
  name: string;
  phonemic: string;
  makhrajRule: string;
  metaphor: string;
  exampleWord: string;
  exampleTrans: string;
  exampleMeaning: string;
}

export const HIJAIYAH_LETTERS: HijaiyahLetter[] = [
  {
    id: 1,
    char: "أ",
    name: "Alif",
    phonemic: "A / I / U",
    makhrajRule: "Tenggorokan bahagian bawah (Halqi). Sebutan yang mudah dan mulus dari kerongkong.",
    metaphor: "Seperti sebatang pensel tegak atau sebilah tongkat berdiri tegap!",
    exampleWord: "أَرْنَبٌ",
    exampleTrans: "Arnabun",
    exampleMeaning: "Arnab"
  },
  {
    id: 2,
    char: "ب",
    name: "Ba",
    phonemic: "B",
    makhrajRule: "Pertemuan kedua-dua bibir atas dan bawah apabila ditekan lembut.",
    metaphor: "Seperti sebuah bot kecil yang sedang berlayar dengan sebiji batu kecil di bawahnya!",
    exampleWord: "بَيْتٌ",
    exampleTrans: "Baytun",
    exampleMeaning: "Rumah"
  },
  {
    id: 3,
    char: "ت",
    name: "Ta",
    phonemic: "T",
    makhrajRule: "Hujung lidah bertemu dengan pangkal gigi kacip sebelah atas.",
    metaphor: "Seperti sebuah pinggan snek yang di dalamnya ada dua biji buah ceri manis!",
    exampleWord: "تِلْفِازٌ",
    exampleTrans: "Tilfazun",
    exampleMeaning: "Televisyen"
  },
  {
    id: 4,
    char: "ث",
    name: "Tsa",
    phonemic: "Ts",
    makhrajRule: "Hujung lidah dikeluarkan sedikit dan menyentuh hujung gigi kacip atas.",
    metaphor: "Seperti pinggan snek juga, tetapi kali ini ada tiga biji ceri berkilau!",
    exampleWord: "ثَعْلَبٌ",
    exampleTrans: "Tsa'labun",
    exampleMeaning: "Musang"
  },
  {
    id: 5,
    char: "ج",
    name: "Jim",
    phonemic: "J",
    makhrajRule: "Tengah lidah ditekan ke lelangit keras bahagian atas.",
    metaphor: "Seperti perut buncit yang mempunyai satu biji gula-gula di dalamnya!",
    exampleWord: "جَمَلٌ",
    exampleTrans: "Jamalun",
    exampleMeaning: "Unta"
  },
  {
    id: 6,
    char: "ح",
    name: "Ha",
    phonemic: "H (Pedas)",
    makhrajRule: "Tenggorokan bahagian tengah (Halkum). Bunyinya pedas dan bersih seperti mendesah.",
    metaphor: "Seperti perut buncit jim, tetapi tiada gula-gula langsung! Kosong dan bersih.",
    exampleWord: "حِمَارٌ",
    exampleTrans: "Himarun",
    exampleMeaning: "Keldai"
  },
  {
    id: 7,
    char: "خ",
    name: "Kha",
    phonemic: "Kh",
    makhrajRule: "Tenggorokan bahagian atas dekat mulut. Berbunyi kasar seperti berdehem.",
    metaphor: "Seperti bumbung perut buncit yang diletakkan satu mahkota bintik di atas kepalanya!",
    exampleWord: "خَرُوفٌ",
    exampleTrans: "Kharufun",
    exampleMeaning: "Kambing Biri-biri"
  },
  {
    id: 8,
    char: "د",
    name: "Dal",
    phonemic: "D",
    makhrajRule: "Hujung lidah menekan pangkal gigi kacip atas dengan kuat lekatan.",
    metaphor: "Seperti pintu gua kecil yang condong atau tangan yang sedang melengkung mesra!",
    exampleWord: "دَجَاجَةٌ",
    exampleTrans: "Dajajatun",
    exampleMeaning: "Ayam"
  },
  {
    id: 9,
    char: "ذ",
    name: "Dzal",
    phonemic: "Dz",
    makhrajRule: "Hujung lidah disentuh lembut dengan hujung gigi kacip atas.",
    metaphor: "Seperti huruf dal, tetapi ada satu lampu kecil hiasan menyala di atas kepalanya!",
    exampleWord: "ذِئْبٌ",
    exampleTrans: "Zi'bun",
    exampleMeaning: "Serigala"
  },
  {
    id: 10,
    char: "ر",
    name: "Ro",
    phonemic: "R",
    makhrajRule: "Hujung lidah dinaikkan sedikit ke langit-langit dekat dengan makhraj Nun.",
    metaphor: "Bentuk bulan sabit yang tajam atau papan gelongsor taman permainan yang laju!",
    exampleWord: "رُمَّانٌ",
    exampleTrans: "Rummanun",
    exampleMeaning: "Delima"
  },
  {
    id: 11,
    char: "ز",
    name: "Za",
    phonemic: "Z",
    makhrajRule: "Hujung lidah berhampiran gigi kacip bawah dengan bunyi mendesing.",
    metaphor: "Seperti papan gelongsor ra juga, tetapi ada sebiji bola mainan di atasnya!",
    exampleWord: "زَرَافَةٌ",
    exampleTrans: "Zarafatun",
    exampleMeaning: "Zirafah"
  },
  {
    id: 12,
    char: "س",
    name: "Sin",
    phonemic: "S",
    makhrajRule: "Hujung lidah berhampiran gigi kacip bawah, berbunyi desif seperti tiupan angin.",
    metaphor: "Seperti gigi sisir kecil yang bergigi tiga dengan mangkuk besar di tepi!",
    exampleWord: "سَمَكَةٌ",
    exampleTrans: "Samakatun",
    exampleMeaning: "Ikan"
  },
  {
    id: 13,
    char: "ش",
    name: "Syin",
    phonemic: "Sy",
    makhrajRule: "Tengah lidah diangkat mendekati langit-langit atas, bunyi hamburan (Syafah).",
    metaphor: "Seperti sisir sin yang mempunyai tiga bintang berkilauan di atasnya!",
    exampleWord: "شَمْسٌ",
    exampleTrans: "Syamsun",
    exampleMeaning: "Matahari"
  },
  {
    id: 14,
    char: "ص",
    name: "Sod",
    phonemic: "Sh",
    makhrajRule: "Sebutan tebal dari hujung lidah menyentuh dinding dalam gigi kacip bawah.",
    metaphor: "Baling-baling yang bulat tumpul bersambung dengan mangkuk panjang!",
    exampleWord: "صَقْرٌ",
    exampleTrans: "Saqrun",
    exampleMeaning: "Burung Helang"
  },
  {
    id: 15,
    char: "ض",
    name: "Dhod",
    phonemic: "Dh",
    makhrajRule: "Sisi lidah (kanan atau kiri) dirapatkan dengan gigi geraham atas.",
    metaphor: "Sama seperti sod, tetapi diketemukan setitik intan mutiara di atas badannya!",
    exampleWord: "ضِفْدَعٌ",
    exampleTrans: "Dhifda'un",
    exampleMeaning: "Katak"
  },
  {
    id: 16,
    char: "ط",
    name: "Tho",
    phonemic: "Th",
    makhrajRule: "Hujung lidah melekat tebal ke pangkal gigi kacip atas (sebutan tebal).",
    metaphor: "Seperti helikopter kecil dengan sebilah tiub udara menegak tinggi ke langit!",
    exampleWord: "طَائِرَةٌ",
    exampleTrans: "Tha'iratun",
    exampleMeaning: "Kapal Terbang"
  },
  {
    id: 17,
    char: "ظ",
    name: "Zho",
    phonemic: "Zh",
    makhrajRule: "Hujung lidah bertemu hujung gigi kacip atas dengan nada tebal.",
    metaphor: "Helikopter tho tetapi kini ada bintik radar yang menyala di sebelahnya!",
    exampleWord: "ظَبْيٌ",
    exampleTrans: "Zabyun",
    exampleMeaning: "Kancil / Rusa"
  },
  {
    id: 18,
    char: "ع",
    name: "Ain",
    phonemic: "`A",
    makhrajRule: "Tenggorokan bahagian tengah (Halkum). Bunyinya jelas keluar dari kerongkong.",
    metaphor: "Seperti telinga dongeng bunian yang melengkung kemas ke bawah!",
    exampleWord: "عَيْنٌ",
    exampleTrans: "'Aynun",
    exampleMeaning: "Mata"
  },
  {
    id: 19,
    char: "غ",
    name: "Ghoin",
    phonemic: "Gh",
    makhrajRule: "Tenggorokan bahagian atas (Adnal Halqi). Seperti berkumur basah kental.",
    metaphor: "Bentuk telinga bunian dengan setitik hiasan butang subang di atas puncak telinga!",
    exampleWord: "غَزَالٌ",
    exampleTrans: "Ghazalun",
    exampleMeaning: "Zikir / Gazal (Rusa Comel)"
  },
  {
    id: 20,
    char: "ف",
    name: "Fa",
    phonemic: "F",
    makhrajRule: "Hujung gigi kacip atas ditekan di bahagian dalam bibir bawah.",
    metaphor: "Gelung bulat kecil seperti ekor anjing laut dengan satu bola terapung di atas muncungnya!",
    exampleWord: "فِيْلٌ",
    exampleTrans: "Filun",
    exampleMeaning: "Gajah"
  },
  {
    id: 21,
    char: "ق",
    name: "Qof",
    phonemic: "Q",
    makhrajRule: "Pangkal lidah paling belakang bertemu dengan langit-langit lembut (anak tekak).",
    metaphor: "Mangkuk bulat dalam dengan dua titik mata yang memandang anda!",
    exampleWord: "قِرْدٌ",
    exampleTrans: "Qirdun",
    exampleMeaning: "Monyet"
  },
  {
    id: 22,
    char: "ك",
    name: "Kaf",
    phonemic: "K",
    makhrajRule: "Pangkal lidah sedikit ke depan dari makhraj Qof, ditekan ke langit-langit keras.",
    metaphor: "Seperti kerusi malas dengan seekor ulat bulu kecil duduk di bahagian tengah!",
    exampleWord: "كِتَابٌ",
    exampleTrans: "Kitabun",
    exampleMeaning: "Buku"
  },
  {
    id: 23,
    char: "ل",
    name: "Lam",
    phonemic: "L",
    makhrajRule: "Ujung sisi lidah menyentuh gusi bahagian atas selepas makhraj dhad.",
    metaphor: "M menyerupai mata kail memancing ikan atau pemegang payung melengkung bawah!",
    exampleWord: "لَيْمُونٌ",
    exampleTrans: "Laymunun",
    exampleMeaning: "Lemon"
  },
  {
    id: 24,
    char: "م",
    name: "Mim",
    phonemic: "M",
    makhrajRule: "Pertemuan kedua-dua bibir atas dan bawah dengan suara sengau samar halus.",
    metaphor: "Satu cincin berpusing kecil yang condong ke bawah seperti gagang tongkat malam!",
    exampleWord: "مَوْزٌ",
    exampleTrans: "Mawzun",
    exampleMeaning: "Pisang"
  },
  {
    id: 25,
    char: "ن",
    name: "Nun",
    phonemic: "N",
    makhrajRule: "Hujung lidah menyentuh gusi atas, mengeluarkan dengung dari hidung.",
    metaphor: "Mangkuk sup yang lebar bulat dengan satu bintik lazat berdiri di atas kuah!",
    exampleWord: "نَجْمَةٌ",
    exampleTrans: "Najmatun",
    exampleMeaning: "Bintang"
  },
  {
    id: 26,
    char: "و",
    name: "Wau",
    phonemic: "W",
    makhrajRule: "Kedua-dua bibir ditarik membulat ke depan dengan kuat selesa.",
    metaphor: "Seperti siput cengkerang kecil yang meluncur membawa kail atau ekor panjang!",
    exampleWord: "وَرْدَةٌ",
    exampleTrans: "Wardatun",
    exampleMeaning: "Bunga Mawar"
  },
  {
    id: 27,
    char: "ه",
    name: "Ha (Besar)",
    phonemic: "H",
    makhrajRule: "Pangkal tenggorokan paling dalam dekat dada. Bernafas dalam.",
    metaphor: "Seperti ribbon hiasan hadiah besar yang melengkung gembira!",
    exampleWord: "هِلَالٌ",
    exampleTrans: "Hilalun",
    exampleMeaning: "Anak Bulan"
  },
  {
    id: 28,
    char: "لا",
    name: "Lam Alif",
    phonemic: "Laa",
    makhrajRule: "Gabungan huruf Lam dan Alif. Dibaca panjang 2 harakat dengan aliran udara lancar di tepi lidah.",
    metaphor: "Gabungan dua pemegang payung atau dua batang kayu yang saling bersilang mesra!",
    exampleWord: "لَا",
    exampleTrans: "Laa",
    exampleMeaning: "Tidak"
  },
  {
    id: 29,
    char: "ء",
    name: "Hamzah",
    phonemic: "' (Hentian)",
    makhrajRule: "Pangkal tenggorokan sebelah bawah. Sebutan bunyi hentian singkat.",
    metaphor: "Burung layang-layang kecil yang meluncur bebas di langit biru!",
    exampleWord: "مَاءٌ",
    exampleTrans: "Ma'un",
    exampleMeaning: "Air"
  },
  {
    id: 30,
    char: "ي",
    name: "Ya",
    phonemic: "Y",
    makhrajRule: "Tengah lidah dinaikkan ke langit-langit keras atas, menyembur suara lunak.",
    metaphor: "Seperti seekor itik berenang anggun dengan dua titisan air di bawah badannya!",
    exampleWord: "يَدٌ",
    exampleTrans: "Yadun",
    exampleMeaning: "Tangan"
  }
];
