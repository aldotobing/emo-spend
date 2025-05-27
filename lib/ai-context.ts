import type { Expense, Income } from "@/types/expense";
import { getCategory } from "@/data/categories";
import { getMood } from "@/data/moods";

export function prepareContextForAI(
  expenses: Expense[],
  incomes: Income[],
  isForDetailedAnalysis: boolean
): string {
  const expensesByMood = groupExpensesByMood(expenses);
  const expensesByDay = groupExpensesByDay(expenses);
  const expensesByCategory = groupExpensesByCategory(expenses);

  let context =
    "# Financial & Emotional Spending Analysis\n\n" +
    "**Context:** All values in Indonesian Rupiah (Rp)\n" +
    "**AI Role:** Financial advisor with psychoanalytic expertise\n\n";

  // Enhanced Income Analysis Section
  if (incomes.length > 0) {
    const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);
    const avgIncome = totalIncome / incomes.length;
    const incomeSources = [...new Set(incomes.map(i => i.source))];
    const incomeBySource = incomes.reduce((acc, income) => {
      acc[income.source] = (acc[income.source] || 0) + income.amount;
      return acc;
    }, {} as Record<string, number>);

    context += "## Income Analysis\n" +
      `- Total Income: Rp${totalIncome.toLocaleString("id-ID")}\n` +
      `- Average Income: Rp${avgIncome.toLocaleString("id-ID")}\n` +
      `- Income Sources: ${incomeSources.join(", ")}\n\n` +
      "### Income by Source:\n";

    Object.entries(incomeBySource).forEach(([source, amount]) => {
      context += `- ${source}: Rp${amount.toLocaleString("id-ID")} ` +
        `(${((amount / totalIncome) * 100).toFixed(1)}% of total)\n`;
    });

    // Financial Health Metrics
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const netBalance = totalIncome - totalExpenses;
    const savingsRatio = totalIncome > 0 ? 
      (netBalance / totalIncome * 100).toFixed(1) : "0.0";

    context += "\n## Financial Health Overview\n" +
      `- Total Expenses: Rp${totalExpenses.toLocaleString("id-ID")}\n` +
      `- Net Balance: Rp${netBalance.toLocaleString("id-ID")}\n` +
      `- Savings Rate: ${savingsRatio}%\n`;
  }

  // Existing expense analysis
  context += generateMoodSummary(expensesByMood);
  context += generateDaySummary(expensesByDay);
  context += generateCategorySummary(expensesByCategory);
  context += generateTransactionSamples(expenses);

  if (!isForDetailedAnalysis) {
    context += getInitialInsightsPrompt();
  } else {
    context += "\n## Ready for Detailed Analysis\n";
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

export function getInitialInsightsPrompt(): string {
  return "## Instruksi untuk AI: Wawasan Awal (Format: Markdown List)\n" +
    "Berdasarkan **semua data di atas**, lakukan hal berikut:\n" +
    "1.  Identifikasi **3 hingga 4 pola belanja emosional** yang paling signifikan atau menarik dari data pengguna. Perhatikan baik emosi positif (seperti bahagia, puas) maupun emosi negatif (seperti sedih, stres) dan bagaimana keduanya mempengaruhi pengeluaran. \n" +
    "**PENTING** : Buatkan hipotesa sebagai judul besarnya tanpa tulisan Hipotesa \n" +
    "2.  Untuk setiap pola, berikan **satu wawasan (insight)** yang jelas dan actionable. Wawasan ini bisa berupa penguatan pola positif atau perbaikan pola negatif.\n" +
    "3.  Sampaikan setiap wawasan sebagai **item dalam daftar Markdown** (misalnya, diawali dengan `- ` atau `* ` atau `###` atau `>' atau `##` atau `####`).\n" +
    "4.  Gunakan **Bahasa Indonesia** yang empatik, santai namun profesional. Boleh sertakan emoji agar tidak terlalu kaku\n" +
    "5.  **PENTING:** Kembalikan **HANYA daftar Markdown berisi wawasan tersebut**. Jangan sertakan teks pembuka, penutup, judul tambahan, atau sapaan. Setiap item list harus merupakan wawasan yang diminta.\n\n" +
    "6.  **PENTING:** Buat singkat, padat dan jelas sekitar 5 kalimat\n\n" +
    "7.  **PENTING:** Buat singkat, padat dan jelas sekitar 5 kalimat\n\n" +
    "Contoh format output yang diinginkan:\n" +
    "- Wawasan pertama Anda ada di sini.\n" +
    "- Wawasan kedua yang menjelaskan pola lain.\n" +
    "- Dan seterusnya...";
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
    `   - Jika memungkinkan, buat **tabel sederhana** atau **bullet points terstruktur** yang menghubungkan pemicu dengan jenis pengeluaran atau suasana hati tertentu. buat ini statistically appealing\n` +
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
