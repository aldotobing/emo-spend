// /lib/gemini-client.ts
import type { AIResponse } from "@/types/ai"; // We'll define this type soon

const GEMINI_API_URL_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models/";
// Use gemini-1.5-flash as it's generally available and cost-effective for this.
// The user's example used gemini-2.0-flash, but 1.5-flash is a very capable alternative.
// If gemini-2.0-flash is indeed what they have access to and prefer, they can change this.
const GEMINI_MODEL = "gemini-1.5-flash-latest"; // Or "gemini-pro"

export async function callGeminiAPI(
  apiKey: string,
  prompt: string,
  isDetailedAnalysis: boolean = false
): Promise<AIResponse> {
  const modelUrl = `${GEMINI_API_URL_BASE}${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  // Slightly different prompt structure for detailed analysis to guide the AI better
  const systemInstruction = isDetailedAnalysis
    ? "You are a compassionate financial psychologist. Provide a deep, empathetic, and actionable psychoanalytical explanation of the user's emotional spending habits based on their spending data and initial insights. Focus on underlying motivations, potential triggers, and offer constructive advice. The response must be in Bahasa Indonesia, formatted as a cohesive paragraph or a few paragraphs. Return only the analysis text."
    : "Provide a deeper psychoanalytical explanation of the user's emotional spending habits. Focus on underlying motivations, potential triggers, and offer actionable advice. Format as a cohesive paragraph or a few paragraphs. Return only the analysis text with proper Markdown.";

  try {
    const response = await fetch(modelUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user", // Role can be 'user' for direct prompts
            parts: [
              {
                text:
                  systemInstruction +
                  "\n\nHere is the user's data and request:\n\n" +
                  prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: isDetailedAnalysis ? 1000 : 500, // More tokens for detailed analysis
          // topP: 0.9, // Optional: nucleus sampling
          // topK: 40, // Optional: top-k sampling
        },
        // Safety settings (optional, defaults are usually reasonable)
        // safetySettings: [
        //   { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        //   { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        //   { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        //   { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        // ]
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Gemini API Error:", response.status, errorBody);
      throw new Error(
        `Gemini API request failed with status ${response.status}: ${errorBody}`
      );
    }

    const data = await response.json();

    if (
      !data.candidates ||
      data.candidates.length === 0 ||
      !data.candidates[0].content ||
      !data.candidates[0].content.parts ||
      data.candidates[0].content.parts.length === 0 ||
      !data.candidates[0].content.parts[0].text
    ) {
      console.error("Gemini API response format unexpected:", data);
      throw new Error("Invalid response format from Gemini API.");
    }

    const rawText = data.candidates[0].content.parts[0].text;
    if (isDetailedAnalysis) {
      return { text: rawText, modelUsed: "Gemini" };
    }

    const insights = rawText
      .split("\n")
      .map((line: string) => line.trim().replace(/^- /, ""))
      .filter((line: string) => line.length > 0);

    return { insights: insights.slice(0, 5), modelUsed: "Gemini" };
  } catch (error) {
    console.error("Error in callGeminiAPI:", error);
    if (isDetailedAnalysis) {
      return {
        text: "Gagal terhubung ke layanan Gemini AI untuk analisis mendalam.",
        modelUsed: "Gemini (Error)",
        error: (error as Error).message,
      };
    }
    return {
      insights: [
        "Gagal terhubung ke layanan Gemini AI untuk analisis.",
        "Wawasan tidak dapat dibuat saat ini menggunakan Gemini, silakan coba lagi nanti.",
      ],
      modelUsed: "Gemini (Error)",
      error: (error as Error).message,
    };
  }
}
