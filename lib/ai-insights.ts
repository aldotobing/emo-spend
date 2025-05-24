// /lib/ai-insights.ts
import { getExpenses } from "@/lib/db";
import { getCategory } from "@/data/categories";
import { getMood } from "@/data/moods";
import type { Expense } from "@/types/expense";
import type { AIInsightResponse, AIDetailedAnalysisResponse } from "@/types/ai";
import { callGeminiAPI } from "./gemini-client";
import { callDeepSeekAPI } from "./deepseek-client";

// ... (genericErrorInsights, noApiKeyError, notEnoughDataError remain the same) ...
const genericErrorInsights = [
  "Kami mengalami masalah saat menganalisis pola pengeluaran Anda.",
  "Coba lagi nanti untuk wawasan yang dipersonalisasi tentang pembelanjaan emosional Anda.",
];

const noApiKeyError = {
  insights: [
    "Konfigurasi AI tidak lengkap. Wawasan tidak dapat dibuat.",
    "Kunci API untuk layanan AI tidak ditemukan.",
  ],
  modelUsed: "None",
  error: "No API keys configured",
};

const notEnoughDataError = {
  insights: [
    "Tambahkan lebih banyak pengeluaran untuk mendapatkan wawasan yang dipersonalisasi tentang pola pengeluaran Anda.",
    "Kami membutuhkan lebih banyak data untuk menganalisis kebiasaan belanja emosional Anda.",
    "Lacak beberapa pengeluaran lagi untuk membuka wawasan bertenaga AI!",
  ],
  modelUsed: "None",
  error: "Not enough data",
};

export async function generateAIInsights(
  geminiApiKey: string | undefined,
  deepSeekApiKey: string | undefined
): Promise<AIInsightResponse> {
  if (!geminiApiKey && !deepSeekApiKey) {
    console.error("Neither Gemini nor DeepSeek API key is configured.");
    return noApiKeyError;
  }

  try {
    const expenses = await getExpenses();

    if (expenses.length < 3) {
      return notEnoughDataError;
    }

    const context = prepareContextForAI(expenses, false); // false for not detailed
    let result;

    if (geminiApiKey) {
      console.log("Attempting to use Gemini API for insights...");
      result = await callGeminiAPI(geminiApiKey, context, false);
      // The client functions should already handle splitting lines and cleaning up if AI returns markdown list items
      if (!result.error && result.insights && result.insights.length > 0) {
        console.log("Successfully generated insights with Gemini.");
        return { insights: result.insights, modelUsed: result.modelUsed };
      }
      console.warn(
        "Gemini API call for insights failed or returned no insights. Error:",
        result.error
      );
    }

    if (deepSeekApiKey) {
      console.log("Falling back to DeepSeek API for insights...");
      result = await callDeepSeekAPI(deepSeekApiKey, context, false);
      if (!result.error && result.insights && result.insights.length > 0) {
        console.log("Successfully generated insights with DeepSeek.");
        return { insights: result.insights, modelUsed: result.modelUsed };
      }
      console.warn(
        "DeepSeek API call for insights failed or returned no insights. Error:",
        result.error
      );
    }

    console.error(
      "All AI API calls failed or no suitable API key was available."
    );
    return {
      insights: genericErrorInsights,
      modelUsed: "None (All Failed)",
      error: "All AI API calls failed.",
    };
  } catch (error) {
    console.error("Error in generateAIInsights orchestrator:", error);
    return {
      insights: genericErrorInsights,
      modelUsed: "None (Error)",
      error: (error as Error).message,
    };
  }
}

export async function generateDetailedAnalysis(
  geminiApiKey: string | undefined,
  deepSeekApiKey: string | undefined,
  currentInsights: string[]
): Promise<AIDetailedAnalysisResponse> {
  if (!geminiApiKey && !deepSeekApiKey) {
    console.error(
      "Neither Gemini nor DeepSeek API key is configured for detailed analysis."
    );
    return {
      analysis:
        "Kunci API untuk layanan AI tidak dikonfigurasi. Analisis mendalam tidak dapat dibuat.",
      modelUsed: "None",
      error: "No API keys configured",
    };
  }

  try {
    const expenses = await getExpenses();
    if (expenses.length < 3) {
      return {
        analysis: "Data pengeluaran tidak cukup untuk analisis mendalam.",
        modelUsed: "None",
        error: "Not enough data",
      };
    }

    const baseContext = prepareContextForAI(expenses, true);

    const detailedContext =
      `${baseContext}\n\n` +
      `## Konteks Tambahan: Wawasan Awal Pengguna\n` +
      `Wawasan berikut sebelumnya telah diberikan kepada pengguna. Gunakan ini untuk memperdalam analisis Anda, bukan untuk diulang:\n` +
      `${currentInsights.map((insight) => `- ${insight}`).join("\n")}\n\n` +
      `## Instruksi Utama untuk Analisis Mendalam (Format: Markdown Lanjutan)\n\n` +
      `Sebagai seorang psikolog keuangan yang ahli dan empatik, tugas Anda adalah memberikan **analisis psikoanalisis yang komprehensif, mendalam, dan actionable** mengenai kebiasaan belanja emosional pengguna. Berdasarkan **semua data yang disediakan** (ringkasan pengeluaran, contoh transaksi spesifik termasuk alasan suasana hati dan catatan, serta wawasan awal yang telah diberikan), susunlah analisis Anda dengan cermat.\n\n` +
      `**Struktur dan Konten Analisis yang Diharapkan:**\n` +
      `Harap jelaskan poin-poin berikut secara rinci:\n\n` +
      `### 1. Identifikasi Pola Belanja Emosional Utama\n` +
      `   - Rangkum pola-pola belanja emosional yang paling menonjol dari data.\n` +
      `   - Jelaskan bagaimana pola-pola ini termanifestasi (misalnya, belanja saat sedih, pengeluaran impulsif pada kategori tertentu saat stres).\n\n` +
      `### 2. Analisis Motivasi Emosional Dasar\n` +
      `   - Gali lebih dalam mengenai kemungkinan motivasi emosional di balik setiap pola utama.\n` +
      `   - Pertimbangkan berbagai motivasi, seperti: merayakan pencapaian, menghargai diri sendiri, mengatasi emosi negatif, mencari kesenangan, mengisi kekosongan, atau mekanisme koping lainnya.\n` +
      `   - Perhatikan bahwa belanja emosional bisa bersifat positif (misalnya, hadiah untuk diri sendiri setelah mencapai target) atau negatif (misalnya, belanja impulsif saat stres).\n\n` +
      `### 3. Identifikasi Pemicu (Triggers)\n` +
      `   - Sebutkan potensi pemicu emosional (baik positif seperti kebahagiaan, pencapaian, maupun negatif seperti kesepian, kebosanan, stres kerja) dan situasional (misalnya, akhir pekan, setelah menerima gaji, melihat iklan, merayakan kesuksesan) yang mungkin menyebabkan pengeluaran tersebut.\n` +
      `   - Jika memungkinkan, buat **tabel sederhana** atau **bullet points terstruktur** yang menghubungkan pemicu dengan jenis pengeluaran atau suasana hati tertentu.\n` +
      `     Contoh tabel (gunakan format Markdown untuk tabel):\n` +
      `     | Pemicu Potensial        | Suasana Hati Terkait | Jenis Pengeluaran Umum |\n` +
      `     |-------------------------|----------------------|------------------------|\n` +
      `     | Stres kerja             | Cemas, Lelah         | Makanan cepat saji, Belanja online impulsif |\n` +
      `     | Merasa kesepian         | Sedih, Bosan         | Hiburan, Barang mewah kecil |\n\n` +
      `### 4. Dampak Pola Belanja\n` +
      `   - Jelaskan secara singkat potensi dampak jangka pendek dan jangka panjang dari pola belanja emosional ini terhadap kesejahteraan finansial dan emosional pengguna.\n` +
      `   - Bedakan antara pola belanja yang sehat (yang mungkin meningkatkan kesejahteraan emosional tanpa mengorbankan stabilitas keuangan) dan pola belanja yang kurang sehat (yang mungkin memberikan kepuasan sementara tetapi berdampak negatif pada keuangan).\n\n` +
      `### 5. Saran Konstruktif dan Strategi Pengelolaan\n` +
      `   - Berikan saran yang **konkret, praktis, dan dapat ditindaklanjuti** untuk membantu pengguna:\n` +
      `     - Meningkatkan kesadaran diri terhadap pola belanja emosional, baik positif maupun negatif.\n` +
      `     - Mempertahankan dan meningkatkan pola belanja positif yang sehat dan seimbang.\n` +
      `     - Mengembangkan strategi pengelolaan yang lebih sehat untuk mengelola emosi negatif tanpa harus belanja berlebihan.\n` +
      `     - Membuat rencana anggaran yang mempertimbangkan kebutuhan emosional dan memberikan ruang untuk pengeluaran yang meningkatkan kesejahteraan.\n` +
      `   - Gunakan **bullet points** untuk setiap saran agar mudah dibaca dan dicerna.\n` +
      `   - Jika relevan, Anda dapat menyajikan alur sederhana atau "decision tree" tekstual untuk membantu pengguna mengidentifikasi dan mengatasi dorongan belanja emosional. Contoh konseptual:\n` +
      `     \`Merasa dorongan belanja? -> Identifikasi emosi saat ini -> Apakah ada kebutuhan nyata? -> Jika tidak, coba alternatif [Aktivitas X, Y, Z] -> Evaluasi setelah 15 menit.\`\n\n` +
      `     'Merasa dorongan belanja? -> Identifikasi emosi saat ini -> Apakah ada kebutuhan nyata? -> Jika tidak, coba alternatif [Aktivitas X, Y, Z] -> Evaluasi setelah 15 menit.'\n\n` +
      `**Format Respons Keseluruhan:**\n` +
      `-   Gunakan **Bahasa Indonesia** yang formal, empatik, dan mudah dipahami.\n` +
      `-   Strukturkan seluruh respons Anda menggunakan **format Markdown yang baik dan jelas**. Ini termasuk penggunaan headings (misalnya, '#', '##', '###'), paragraf, bullet points (misalnya, '-' atau '*'), **tabel Markdown jika sesuai**, dan **bold/italics** untuk penekanan.\n` +
      `-   Pastikan analisis Anda mengalir secara logis dan koheren.\n` +
      `-   **PENTING:** Kembalikan **HANYA teks analisis dalam format Markdown**. Jangan sertakan sapaan, basa-basi, atau teks lain di luar analisis yang diminta.`;

    let result;

    if (geminiApiKey) {
      console.log("Attempting to use Gemini API for detailed analysis...");
      result = await callGeminiAPI(geminiApiKey, detailedContext, true); // true for detailed
      if (!result.error && result.text) {
        console.log("Successfully generated detailed analysis with Gemini.");
        return { analysis: result.text, modelUsed: result.modelUsed };
      }
      console.warn(
        "Gemini API call for detailed analysis failed. Error:",
        result.error
      );
    }

    if (deepSeekApiKey) {
      console.log("Falling back to DeepSeek API for detailed analysis...");
      result = await callDeepSeekAPI(deepSeekApiKey, detailedContext, true); // true for detailed
      if (!result.error && result.text) {
        console.log("Successfully generated detailed analysis with DeepSeek.");
        return { analysis: result.text, modelUsed: result.modelUsed };
      }
      console.warn(
        "DeepSeek API call for detailed analysis failed. Error:",
        result.error
      );
    }

    console.error("All AI API calls for detailed analysis failed.");
    return {
      analysis:
        "Gagal menghasilkan analisis mendalam. Layanan AI tidak dapat dihubungi atau mengembalikan respons yang tidak valid.",
      modelUsed: "None (All Failed)",
      error: "All AI API calls for detailed analysis failed.",
    };
  } catch (error) {
    console.error("Error in generateDetailedAnalysis orchestrator:", error);
    return {
      analysis:
        "Terjadi kesalahan sistem saat mencoba menghasilkan analisis mendalam.",
      modelUsed: "None (Error)",
      error: (error as Error).message,
    };
  }
}

function prepareContextForAI(
  expenses: Expense[],
  isForDetailedAnalysis: boolean
): string {
  const expensesByMood: Record<string, Expense[]> = {};
  expenses.forEach((expense) => {
    if (!expensesByMood[expense.mood]) {
      expensesByMood[expense.mood] = [];
    }
    expensesByMood[expense.mood].push(expense);
  });

  const daysOfWeek = [
    "Minggu",
    "Senin",
    "Selasa",
    "Rabu",
    "Kamis",
    "Jumat",
    "Sabtu",
  ];
  const expensesByDay: Record<string, Expense[]> = {};
  expenses.forEach((expense) => {
    const date = new Date(expense.date);
    const day = daysOfWeek[date.getDay()];
    if (!expensesByDay[day]) {
      expensesByDay[day] = [];
    }
    expensesByDay[day].push(expense);
  });

  const expensesByCategory: Record<string, Expense[]> = {};
  expenses.forEach((expense) => {
    if (!expensesByCategory[expense.category]) {
      expensesByCategory[expense.category] = [];
    }
    expensesByCategory[expense.category].push(expense);
  });

  let context =
    "# Analisis Data Pengeluaran Pengguna untuk Wawasan Emosional\n\n" +
    "**Konteks Utama:** Data pengeluaran pengguna ini dalam **Rupiah Indonesia (Rp)** dan seluruh interaksi serta respons diharapkan dalam **Bahasa Indonesia**.\n" +
    "**Peran AI:** Anda adalah seorang penasihat keuangan yang juga memiliki keahlian sebagai psikoanalis, berfokus pada identifikasi pola belanja emosional. Penting untuk memahami bahwa emosi pengguna bisa positif maupun negatif, dan keduanya dapat mempengaruhi pola pengeluaran dengan cara yang berbeda-beda.\n\n";

  context +=
    "## Ringkasan Pengeluaran Berdasarkan Suasana Hati\n" +
    "Berikut adalah ringkasan pengeluaran yang dikelompokkan berdasarkan suasana hati yang dilaporkan pengguna:\n\n";
  Object.entries(expensesByMood).forEach(([moodId, moodExpenses]) => {
    const moodInfo = getMood(moodId);
    const total = moodExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    context += `- **Suasana Hati: ${moodInfo.label} ${moodInfo.emoji}**\n`;
    context += `  - Jumlah Transaksi: ${moodExpenses.length}\n`;
    context += `  - Total Pengeluaran: Rp${total.toLocaleString("id-ID")}\n`;
  });

  context +=
    "\n## Ringkasan Pengeluaran Berdasarkan Hari dalam Seminggu\n" +
    "Pola pengeluaran pengguna berdasarkan hari:\n\n";
  daysOfWeek.forEach((day) => {
    const dayExpenses = expensesByDay[day] || [];
    const total = dayExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    context += `- **Hari: ${day}**\n`;
    context += `  - Jumlah Transaksi: ${dayExpenses.length}\n`;
    context += `  - Total Pengeluaran: Rp${total.toLocaleString("id-ID")}\n`;
  });

  context +=
    "\n## Ringkasan Pengeluaran Berdasarkan Kategori\n" +
    "Distribusi pengeluaran ke berbagai kategori:\n\n";
  Object.entries(expensesByCategory).forEach(
    ([categoryId, categoryExpenses]) => {
      const category = getCategory(categoryId);
      const total = categoryExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      context += `- **Kategori: ${category.name} ${category.icon}**\n`;
      context += `  - Jumlah Transaksi: ${categoryExpenses.length}\n`;
      context += `  - Total Pengeluaran: Rp${total.toLocaleString("id-ID")}\n`;
    }
  );

  context +=
    "\n## Contoh Detail Beberapa Transaksi Pengeluaran Spesifik\n" +
    "Data transaksi individual untuk analisis lebih mendalam (format tanggal: DD MMMM YYYY):\n\n";
  const sampleExpenses = expenses.slice(0, Math.min(10, expenses.length));
  sampleExpenses.forEach((expense, index) => {
    const mood = getMood(expense.mood);
    const category = getCategory(expense.category);
    const date = new Date(expense.date).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    context += `**Transaksi #${index + 1} (${date}):**\n`;
    context += `- Jumlah: Rp${expense.amount.toLocaleString("id-ID")}\n`;
    context += `- Kategori: ${category.name} ${category.icon}\n`;
    context += `- Suasana Hati Saat Belanja: ${mood.label} ${mood.emoji}\n`;

    if (expense.moodReason && expense.moodReason.trim() !== "") {
      context += `- Alasan Suasana Hati: "${expense.moodReason.trim()}"\n`;
    }
    if (expense.notes && expense.notes.trim() !== "") {
      context += `- Catatan Tambahan: "${expense.notes.trim()}"\n`;
    }
    context += "\n";
  });

  if (!isForDetailedAnalysis) {
    context +=
      "## Instruksi untuk AI: Wawasan Awal (Format: Markdown List)\n" +
      "Berdasarkan **semua data di atas**, lakukan hal berikut:\n" +
      "1.  Identifikasi **3 hingga 6 pola belanja emosional** yang paling signifikan atau menarik dari data pengguna. Perhatikan baik emosi positif (seperti bahagia, puas) maupun emosi negatif (seperti sedih, stres) dan bagaimana keduanya mempengaruhi pengeluaran. Buatkan hipotesa sebagai judul besarnya\n" +
      "2.  Untuk setiap pola, berikan **satu wawasan (insight)** yang jelas dan actionable. Wawasan ini bisa berupa penguatan pola positif atau perbaikan pola negatif.\n" +
      "3.  Sampaikan setiap wawasan sebagai **item dalam daftar Markdown** (misalnya, diawali dengan `- ` atau `* ` atau `###` atau `>' atau `##` atau `####`).\n" +
      "4.  Gunakan **Bahasa Indonesia** yang empatik dan profesional.\n" +
      "5.  **PENTING:** Kembalikan **HANYA daftar Markdown berisi wawasan tersebut**. Jangan sertakan teks pembuka, penutup, judul tambahan, atau sapaan. Setiap item list harus merupakan wawasan yang diminta.\n\n" +
      "Contoh format output yang diinginkan:\n" +
      "- Wawasan pertama Anda ada di sini.\n" +
      "- Wawasan kedua yang menjelaskan pola lain.\n" +
      "- Dan seterusnya...";
  } else {
    context +=
      "\n## Catatan untuk AI: Persiapan Analisis Mendalam\n" +
      "Data di atas akan digunakan sebagai dasar untuk analisis psikoanalisis yang lebih mendalam. Anda akan menerima instruksi lebih lanjut yang sangat spesifik mengenai format dan konten analisis mendalam tersebut, termasuk permintaan untuk output dalam format Markdown yang terstruktur.";
  }

  return context;
}
