import { getExpenses } from "@/lib/db";
import type { Expense } from "@/types/expense";
import type { AIInsightResponse, AIDetailedAnalysisResponse } from "@/types/ai";
import { callGeminiAPI } from "./gemini-client";
import { callDeepSeekAPI } from "./deepseek-client";
import { prepareContextForAI, getDetailedAnalysisPrompt } from "./ai-context";

// Error messages and default responses
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
  deepSeekApiKey: string | undefined,
  providedExpenses?: Expense[] // Add optional parameter for expenses
): Promise<AIInsightResponse> {
  if (!geminiApiKey && !deepSeekApiKey) {
    console.error("Neither Gemini nor DeepSeek API key is configured.");
    return noApiKeyError;
  }

  try {
    // Use provided expenses if available, otherwise fetch all expenses
    const expenses = providedExpenses || await getExpenses();
    console.log(`Generating insights with ${expenses.length} expenses`);

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
  currentInsights: string[],
  stream: boolean = true // Add stream parameter, default to true
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
    const detailedContext = getDetailedAnalysisPrompt(currentInsights);

    let result;

    // Use DeepSeek directly for detailed analysis
    if (deepSeekApiKey) {
      console.log("Using DeepSeek API for detailed analysis...");
      result = await callDeepSeekAPI(deepSeekApiKey, detailedContext, true, stream);
      
      // If streaming is enabled and we have a stream in the response, return it directly
      if (stream && result.stream) {
        return {
          stream: result.stream,
          modelUsed: result.modelUsed,
        };
      }
      
      // Handle non-streaming response
      if (!result.error && result.text) {
        console.log("Successfully generated detailed analysis with DeepSeek.");
        return { 
          analysis: result.text, 
          modelUsed: result.modelUsed 
        };
      }
      console.warn(
        "DeepSeek API call for detailed analysis failed. Error:",
        result.error
      );
    }
    
    // Fall back to Gemini only if DeepSeek is not available or fails
    if (geminiApiKey) {
      console.log("Falling back to Gemini API for detailed analysis...");
      result = await callGeminiAPI(geminiApiKey, detailedContext, true);
      
      // If streaming is enabled and we have a stream in the response, return it directly
      if (stream && result.stream) {
        return {
          stream: result.stream,
          modelUsed: result.modelUsed,
        };
      }
      
      // Handle non-streaming response
      if (!result.error && result.text) {
        console.log("Successfully generated detailed analysis with Gemini.");
        return { 
          analysis: result.text, 
          modelUsed: result.modelUsed 
        };
      }
      console.warn(
        "Gemini API call for detailed analysis failed. Error:",
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


