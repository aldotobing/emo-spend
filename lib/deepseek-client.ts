// /lib/deepseek-client.ts
import type { AIResponse} from "@/types/ai";

const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";

interface DeepSeekMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function callDeepSeekAPI(
  apiKey: string,
  prompt: string,
  isDetailedAnalysis: boolean = false,
  stream: boolean = false
): Promise<AIResponse> {
  // Adjust prompt for detailed analysis if needed, though DeepSeek might be less nuanced with system prompts.
  // For simplicity, we'll use the same context but expect potentially less depth.
  // The main 'context' already has instructions.

  let finalContext = prompt;
  if (isDetailedAnalysis) {
    finalContext +=
      "\n\nProvide a deeper psychoanalytical explanation of the user's emotional spending habits. Focus on underlying motivations, potential triggers, and offer actionable advice. Format as a cohesive paragraph or a few paragraphs. Return only the analysis text.";
  }

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
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
        temperature: 0.7,
        max_tokens: isDetailedAnalysis ? 2000 : 500,
        stream: stream,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("DeepSeek API Error:", response.status, errorBody);
      throw new Error(
        `DeepSeek API request failed with status ${response.status}: ${errorBody}`
      );
    }

    // Handle streaming response
    if (stream && response.body) {
      const result: AIResponse = {
        stream: response.body as ReadableStream<Uint8Array>,
        modelUsed: "DeepSeek",
      };
      return result;
    }

    // Handle non-streaming response
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

   