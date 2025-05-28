import type { Expense, Income } from "@/types/expense";
import { getCategory } from "@/data/categories";
import { getMood } from "@/data/moods";
import { getIncomesByDateRange } from "@/lib/income";

export async function prepareContextForAI(
  expenses: Expense[],
  isForDetailedAnalysis: boolean,
  startDate?: Date,
  endDate?: Date
): Promise<string> {
  // If date range is provided, fetch incomes for the same period
  let incomes: Income[] = [];
  if (startDate && endDate) {
    try {
      incomes = await getIncomesByDateRange(startDate.toISOString(), endDate.toISOString());
    } catch (error) {
      console.error('Error fetching incomes:', error);
    }
  }
  const expensesByMood = groupExpensesByMood(expenses);
  const expensesByDay = groupExpensesByDay(expenses);
  const expensesByCategory = groupExpensesByCategory(expenses);

  let context =
    "# Analisis Data Keuangan Pengguna untuk Wawasan Emosional\n\n" +
    "**Konteks Utama:** Data keuangan pengguna ini dalam **Rupiah Indonesia (Rp)** dan seluruh interaksi serta respons diharapkan dalam **Bahasa Indonesia**.\n" +
    "**Peran AI:** Anda adalah seorang penasihat keuangan yang juga memiliki keahlian sebagai psikoanalis, berfokus pada identifikasi pola keuangan emosional. Penting untuk memahami bahwa emosi pengguna bisa positif maupun negatif, dan keduanya dapat mempengaruhi pola keuangan dengan cara yang berbeda-beda.\n\n";

  // Add income summary if we have income data
  if (incomes.length > 0) {
    context += generateIncomeSummary(incomes);
  }

  context += generateMoodSummary(expensesByMood);
  context += generateDaySummary(expensesByDay);
  context += generateCategorySummary(expensesByCategory);
  context += generateTransactionSamples(expenses);

  if (!isForDetailedAnalysis) {
    context += getInitialInsightsPrompt(incomes.length > 0);
  } else {
    context +=
      "\n## Catatan untuk AI: Persiapan Analisis Mendalam\n" +
      "Data di atas akan digunakan sebagai dasar untuk analisis psikoanalisis yang lebih mendalam. Anda akan menerima instruksi lebih lanjut yang sangat spesifik mengenai format dan konten analisis mendalam tersebut, termasuk permintaan untuk output dalam format Markdown yang terstruktur.";
  }

  return context;
}

function groupExpensesByMood(expenses: Expense[]): Record<string, Expense[]> {
  const expensesByMood: Record<string, Expense[]> = {};
  expenses.forEach((expense) => {
    if (!expensesByMood[expense.mood]) {
      expensesByMood[expense.mood] = [];
    }
    expensesByMood[expense.mood].push(expense);
  });
  return expensesByMood;
}

function groupExpensesByDay(expenses: Expense[]): Record<string, Expense[]> {
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
  return expensesByDay;
}

function groupExpensesByCategory(expenses: Expense[]): Record<string, Expense[]> {
  const expensesByCategory: Record<string, Expense[]> = {};
  expenses.forEach((expense) => {
    if (!expensesByCategory[expense.category]) {
      expensesByCategory[expense.category] = [];
    }
    expensesByCategory[expense.category].push(expense);
  });
  return expensesByCategory;
}

function generateMoodSummary(expensesByMood: Record<string, Expense[]>): string {
  let summary = "## Ringkasan Pengeluaran Berdasarkan Suasana Hati\n" +
    "Berikut adalah ringkasan pengeluaran yang dikelompokkan berdasarkan suasana hati yang dilaporkan pengguna:\n\n";
  
  Object.entries(expensesByMood).forEach(([moodId, moodExpenses]) => {
    const moodInfo = getMood(moodId);
    const total = moodExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    summary += `- **Suasana Hati: ${moodInfo.label} ${moodInfo.emoji}**\n`;
    summary += `  - Jumlah Transaksi: ${moodExpenses.length}\n`;
    summary += `  - Total Pengeluaran: Rp${total.toLocaleString("id-ID")}\n`;
  });
  
  return summary + "\n";
}

function generateDaySummary(expensesByDay: Record<string, Expense[]>): string {
  const daysOfWeek = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  let summary = "## Ringkasan Pengeluaran Berdasarkan Hari dalam Seminggu\n" +
    "Pola pengeluaran pengguna berdasarkan hari:\n\n";
  
  daysOfWeek.forEach((day) => {
    const dayExpenses = expensesByDay[day] || [];
    const total = dayExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    summary += `- **Hari: ${day}**\n`;
    summary += `  - Jumlah Transaksi: ${dayExpenses.length}\n`;
    summary += `  - Total Pengeluaran: Rp${total.toLocaleString("id-ID")}\n`;
  });
  
  return summary + "\n";
}

function generateCategorySummary(expensesByCategory: Record<string, Expense[]>): string {
  let summary = "## Ringkasan Pengeluaran Berdasarkan Kategori\n" +
    "Distribusi pengeluaran ke berbagai kategori:\n\n";
  
  Object.entries(expensesByCategory).forEach(([categoryId, categoryExpenses]) => {
    const category = getCategory(categoryId);
    const total = categoryExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const categoryName = category?.name || 'Tidak Diketahui';
    const categoryIcon = category?.icon || '❓';
    summary += `- **Kategori: ${categoryName} ${categoryIcon}**\n`;
    summary += `  - Jumlah Transaksi: ${categoryExpenses.length}\n`;
    summary += `  - Total Pengeluaran: Rp${total.toLocaleString("id-ID")}\n`;
  });
  
  return summary + "\n";
}

function generateTransactionSamples(expenses: Expense[]): string {
  let samples = "## Contoh Detail Beberapa Transaksi Pengeluaran Spesifik\n" +
    "Data transaksi individual untuk analisis lebih mendalam (format tanggal: DD MMMM YYYY):\n\n";
  
  const sampleExpenses = expenses.slice(0, Math.min(10, expenses.length));
  sampleExpenses.forEach((expense, index) => {
    const mood = getMood(expense.mood);
    const category = getCategory(expense.category) || { name: 'Tidak Diketahui', icon: '❓' };
    const date = new Date(expense.date).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    
    samples += `**Transaksi #${index + 1} (${date}):**\n`;
    samples += `- Jumlah: Rp${expense.amount.toLocaleString("id-ID")}\n`;
    samples += `- Kategori: ${category.name} ${category.icon}\n`;
    samples += `- Suasana Hati Saat Belanja: ${mood.label} ${mood.emoji}\n`;

    if (expense.moodReason?.trim()) {
      samples += `- Alasan Suasana Hati: "${expense.moodReason.trim()}"\n`;
    }
    if (expense.notes?.trim()) {
      samples += `- Catatan Tambahan: "${expense.notes.trim()}"\n`;
    }
    samples += "\n";
  });
  
  return samples + "\n";
}

function generateIncomeSummary(incomes: Income[]): string {
  const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);
  const incomeBySource: Record<string, number> = {};
  
  incomes.forEach(income => {
    const source = income.source || 'Lainnya';
    incomeBySource[source] = (incomeBySource[source] || 0) + income.amount;
  });

  let summary = "## Ringkasan Pendapatan\n\n" +
    `- **Total Pendapatan**: Rp${totalIncome.toLocaleString('id-ID')}\n`;
  
  // Add income by source
  if (Object.keys(incomeBySource).length > 0) {
    summary += "- **Sumber Pendapatan**:\n";
    Object.entries(incomeBySource).forEach(([source, amount]) => {
      const percentage = (amount / totalIncome * 100).toFixed(1);
      summary += `  - ${source}: Rp${amount.toLocaleString('id-ID')} (${percentage}%)\n`;
    });
  }

  // Add recent income samples
  const recentIncomes = [...incomes]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);
  
  if (recentIncomes.length > 0) {
    summary += "\n**Contoh Pendapatan Terbaru**:\n";
    recentIncomes.forEach((income, index) => {
      const date = new Date(income.date).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      const source = income.source || 'Lainnya';
      const desc = income.description ? ` - ${income.description}` : '';
      summary += `${index + 1}. ${date}: ${source} - Rp${income.amount.toLocaleString('id-ID')}${desc}\n`;
    });
  }

  return summary + "\n\n";
}

export function getInitialInsightsPrompt(hasIncomeData: boolean = false): string {
  let prompt = "## Instruksi untuk AI: Wawasan Awal (Format: Markdown List)\n" +
    "Berdasarkan **semua data di atas**, lakukan hal berikut:\n";

  if (hasIncomeData) {
    prompt += "1.  Analisis **pola pendapatan** pengguna, termasuk sumber pendapatan utama dan stabilitas pendapatan.\n" +
      "2.  Identifikasi **3 hingga 4 pola keuangan emosional** yang paling signifikan, termasuk bagaimana pendapatan dan pengeluaran saling berhubungan. Perhatikan baik emosi positif (seperti bahagia, puas) maupun emosi negatif (seperti sedih, stres) dan bagaimana keduanya mempengaruhi keuangan.\n";
  } else {
    prompt += "1.  Identifikasi **3 hingga 4 pola belanja emosional** yang paling signifikan atau menarik dari data pengguna. Perhatikan baik emosi positif (seperti bahagia, puas) maupun emosi negatif (seperti sedih, stres) dan bagaimana keduanya mempengaruhi pengeluaran.\n";
  }

  prompt += "**PENTING** : Buatkan hipotesa sebagai judul besarnya tanpa tulisan Hipotesa \n" +
    (hasIncomeData ? "3" : "2") + ".  Untuk setiap pola, berikan **satu wawasan (insight)** yang singkat dan jelas dan actionable. Wawasan ini bisa berupa penguatan pola positif atau perbaikan pola negatif.\n" +
    (hasIncomeData ? "4" : "3") + ".  Sampaikan setiap wawasan sebagai **item dalam daftar Markdown** (misalnya, diawali dengan `- ` atau `* ` atau `###` atau `>' atau `##` atau `####`).\n" +
    (hasIncomeData ? "5" : "4") + ".  Gunakan **Bahasa Indonesia** yang empatik, santai namun profesional. Boleh sertakan emoji agar tidak terlalu kaku\n" +
    (hasIncomeData ? "6" : "5") + ".  **PENTING:** Kembalikan **HANYA daftar Markdown berisi wawasan tersebut**. Jangan sertakan teks pembuka, penutup, judul tambahan, atau sapaan. Setiap item list harus merupakan wawasan yang diminta.\n\n" +
    (hasIncomeData ? "7" : "6") + ".  **PENTING:** Buat singkat, padat dan jelas.\n\n" +
    "Contoh format output yang diinginkan:\n" +
    "- Wawasan pertama Anda ada di sini.\n" +
    "- Wawasan kedua yang menjelaskan pola lain.\n" +
    "- Dan seterusnya...";

  return prompt;
}

export function getDetailedAnalysisPrompt(currentInsights: string[]): string {
  return `## Konteks Tambahan: Wawasan Awal Pengguna
` +
    `Wawasan berikut sebelumnya telah diberikan kepada pengguna. Gunakan ini untuk memperdalam analisis Anda, bukan untuk diulang:
` +
    `${currentInsights.map((insight) => `- ${insight}`).join("\n")}\n\n` +
    `## Instruksi Utama untuk Analisis Mendalam (Format: Markdown Lanjutan)
` +
    `## Berbicara langsung kepada pengguna.\n` +
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
    `   - Jika memungkinkan, buat **tabel sederhana** atau **bullet points terstruktur** yang menghubungkan pemicu dengan jenis pengeluaran atau suasana hati tertentu, dan pendapatan vs pengeluaran. buat ini statistically appealing\n` +
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
    `**Format Respons Keseluruhan:**\n` +
    `-   Gunakan **Bahasa Indonesia** yang formal, empatik, dan mudah dipahami.\n` +
    `-   Strukturkan seluruh respons Anda menggunakan **format Markdown yang baik dan jelas**. Ini termasuk penggunaan headings (misalnya, '#', '##', '###'), paragraf, bullet points (misalnya, '-' atau '*'), **tabel Markdown jika sesuai**, dan **bold/italics** untuk penekanan.\n` +
    `-   Pastikan analisis Anda mengalir secara logis dan koheren.\n` +
    `-   **PENTING:** Kembalikan **HANYA teks analisis dalam format Markdown**. Jangan sertakan sapaan, basa-basi, atau teks lain di luar analisis yang diminta.`;
}
