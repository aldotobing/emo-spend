// /lib/deepseek-client.ts
import type { AIResponse } from "@/types/ai";

export async function callDeepSeekAPI(
  apiKey: string,
  context: string,
  isDetailedAnalysis: boolean = false
): Promise<AIResponse> {
  // Adjust prompt for detailed analysis if needed, though DeepSeek might be less nuanced with system prompts.
  // For simplicity, we'll use the same context but expect potentially less depth.
  // The main 'context' already has instructions.

  let finalContext = context;
  if (isDetailedAnalysis) {
    finalContext +=
      "\n\nProvide a deeper psychoanalytical explanation of the user's emotional spending habits. Focus on underlying motivations, potential triggers, and offer actionable advice. Format as a cohesive paragraph or a few paragraphs. Return only the analysis text.";
  }

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
            {
              role: "user",
              content: finalContext,
            },
          ],
          temperature: 1.3,
          max_tokens: isDetailedAnalysis ? 1000 : 500,
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

    const rawText = data.choices[0].message.content;
    if (isDetailedAnalysis) {
      return { text: rawText, modelUsed: "DeepSeek" };
    }

    const insights = rawText
      .split("\n")
      .map((line: string) => line.trim().replace(/^- /, ""))
      .filter((line: string) => line.length > 0);
    return { insights: insights.slice(0, 5), modelUsed: "DeepSeek" };
  } catch (error) {
    console.error("Error in callDeepSeekAPI:", error);
    if (isDetailedAnalysis) {
      return {
        text: "Gagal terhubung ke layanan DeepSeek AI untuk analisis mendalam.",
        modelUsed: "DeepSeek (Error)",
        error: (error as Error).message,
      };
    }
    return {
      insights: [
        "Gagal terhubung ke layanan DeepSeek AI untuk analisis.",
        "Wawasan tidak dapat dibuat saat ini menggunakan DeepSeek, silakan coba lagi nanti.",
      ],
      modelUsed: "DeepSeek (Error)",
      error: (error as Error).message,
    };
  }
}
