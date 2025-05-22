import { getExpenses } from "@/lib/db";
import { getCategory } from "@/data/categories";
import { getMood } from "@/data/moods";
import type { Expense } from "@/types/expense";

// This function will be called from the client with the API key
export async function generateAIInsights(
  apiKey: string | undefined
): Promise<string[]> {
  if (!apiKey) {
    console.error("DeepSeek API key is missing. Cannot generate AI insights.");
    return [
      "Konfigurasi AI tidak lengkap. Wawasan tidak dapat dibuat.",
      "Kunci API untuk layanan AI tidak ditemukan.",
    ];
  }

  try {
    const expenses = await getExpenses();

    if (expenses.length < 3) {
      return [
        "Tambahkan lebih banyak pengeluaran untuk mendapatkan wawasan yang dipersonalisasi tentang pola pengeluaran Anda.",
        "Kami membutuhkan lebih banyak data untuk menganalisis kebiasaan belanja emosional Anda.",
        "Lacak beberapa pengeluaran lagi untuk membuka wawasan bertenaga AI!",
      ];
    }

    const context = prepareContextForAI(expenses);
    const insights = await callDeepSeekAPI(apiKey, context);
    return insights;
  } catch (error) {
    console.error("Error generating AI insights:", error);
    return [
      "Kami mengalami masalah saat menganalisis pola pengeluaran Anda.",
      "Coba lagi nanti untuk wawasan yang dipersonalisasi tentang pembelanjaan emosional Anda.",
    ];
  }
}

function prepareContextForAI(expenses: Expense[]): string {
  const expensesByMood: Record<string, Expense[]> = {};
  expenses.forEach((expense) => {
    if (!expensesByMood[expense.mood]) {
      expensesByMood[expense.mood] = [];
    }
    expensesByMood[expense.mood].push(expense);
  });

  const daysOfWeek = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
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
    "User's spending data summary (data is in Indonesian Rupiah (Rp) and Indonesian context):\n\n";
  context += "Spending by mood:\n";
  Object.entries(expensesByMood).forEach(([mood, moodExpenses]) => {
    const moodInfo = getMood(mood);
    const total = moodExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    context += `- ${moodInfo.label} (${moodInfo.emoji}): ${
      moodExpenses.length
    } expenses, total Rp${total.toLocaleString("id-ID")}\n`;
  });

  context += "\nSpending by day of week:\n";
  daysOfWeek.forEach((day) => {
    const dayExpenses = expensesByDay[day] || [];
    const total = dayExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    context += `- ${day}: ${
      dayExpenses.length
    } expenses, total Rp${total.toLocaleString("id-ID")}\n`;
  });

  context += "\nSpending by category:\n";
  Object.entries(expensesByCategory).forEach(
    ([categoryId, categoryExpenses]) => {
      const category = getCategory(categoryId);
      const total = categoryExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      context += `- ${category.name} (${category.icon}): ${
        categoryExpenses.length
      } expenses, total Rp${total.toLocaleString("id-ID")}\n`;
    }
  );

  context +=
    "\nSome specific expenses (date format is system default for Indonesian locale):\n";
  const sampleExpenses = expenses.slice(0, Math.min(5, expenses.length));
  sampleExpenses.forEach((expense) => {
    const mood = getMood(expense.mood);
    const category = getCategory(expense.category);
    const date = new Date(expense.date).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    context += `- ${date}: Rp${expense.amount.toLocaleString("id-ID")} on ${
      category.name
    } while feeling ${mood.label} ${mood.emoji}\n`;
  });

  context +=
    // "You are an AI financial advisor and psychoanalyst specializing in emotional spending patterns. \n\n";

    "As a financial advisor and psychoanalyst specializing in emotional spending patterns, Please provide insights in Bahasa Indonesia. Each insight should be on a new line. Respon like an advisor to direct person.\n" +
    // "Follow this :\n" +
    // "1. Analyze the user's spending data and provide insightful observations about their shopping habits.\n" +
    // "2. Focus on the connection between their emotions and spending behavior. \n" +
    // "3. Keep your insights concise, actionable, and psychologically grounded. \n" +
    // "4. At the end, provide a clear bottom line or advice that the user can apply to better manage their emotional spending.\n" +
    "Return only response!";
  return context;
}

// Actual function to call DeepSeek API
async function callDeepSeekAPI(
  apiKey: string,
  context: string
): Promise<string[]> {
  try {
    const response = await fetch(
      "https://api.deepseek.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            // {
            //   role: "system",
            //   content:
            //     "You are an AI financial advisor and psychoanalyst specializing in emotional spending patterns.",
            // },
            {
              role: "user",
              content: context,
            },
          ],
          temperature: 0.7,
          max_tokens: 500,
          n: 1,
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("DeepSeek API Error:", response.status, errorBody);
      throw new Error(
        `DeepSeek API request failed with status ${response.status}: ${errorBody}`
      );
    }

    const data = await response.json();

    if (
      !data.choices ||
      data.choices.length === 0 ||
      !data.choices[0].message ||
      !data.choices[0].message.content
    ) {
      console.error("DeepSeek API response format unexpected:", data);
      throw new Error("Invalid response format from DeepSeek API.");
    }

    const insightsText = data.choices[0].message.content;
    const insights = insightsText
      .split("\n")
      .map((line: string) => line.trim().replace(/^- /, ""))
      .filter((line: string | unknown[]) => line.length > 0);
    return insights.slice(0, 5);
  } catch (error) {
    console.error("Error in callDeepSeekAPI:", error);
    return [
      "Gagal terhubung ke layanan AI untuk analisis.",
      "Wawasan tidak dapat dibuat saat ini, silakan coba lagi nanti.",
    ];
  }
}
