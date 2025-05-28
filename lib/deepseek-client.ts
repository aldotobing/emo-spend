// /lib/deepseek-client.ts
import type { AIResponse } from "@/types/ai";

const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";

interface DeepSeekMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Processes a ReadableStream from a streaming API response and returns a new ReadableStream
 * that emits the text content as it's being streamed.
 */
function processStream(stream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = '';
  
  const transformStream = new TransformStream<Uint8Array, Uint8Array>({
    async transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });
      
      // Process complete SSE events
      let eventEndIndex;
      while ((eventEndIndex = buffer.indexOf('\n\n')) !== -1) {
        const event = buffer.slice(0, eventEndIndex).trim();
        buffer = buffer.slice(eventEndIndex + 2);
        
        if (!event.startsWith('data: ')) continue;
        
        const data = event.slice(6).trim(); // Remove 'data: ' prefix
        if (data === '[DONE]') continue;
        
        try {
          const parsed: StreamChunk = JSON.parse(data);
          const content = parsed.choices[0]?.delta?.content;
          if (content) {
            controller.enqueue(encoder.encode(content));
          }
        } catch (e) {
          console.error('Error parsing stream chunk:', e);
        }
      }
    },
    
    flush(controller) {
      // Process any remaining data in the buffer
      if (buffer.trim()) {
        try {
          const event = buffer.trim();
          if (event.startsWith('data: ')) {
            const data = event.slice(6).trim();
            if (data !== '[DONE]') {
              const parsed: StreamChunk = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content;
              if (content) {
                controller.enqueue(encoder.encode(content));
              }
            }
          }
        } catch (e) {
          console.error('Error in flush:', e);
        }
      }
      controller.terminate();
    }
  });
  
  return stream.pipeThrough(transformStream);
}

interface StreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    delta: {
      content?: string;
      role?: string;
    };
    index: number;
    finish_reason: string | null;
  }[];
}

export async function callDeepSeekAPI(
  apiKey: string,
  prompt: string,
  isDetailedAnalysis: boolean = false,
  stream: boolean = false
): Promise<AIResponse> {
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
        "Authorization": `Bearer ${apiKey}`,
        "Accept": stream ? "text/event-stream" : "application/json",
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
      return {
        stream: processStream(response.body as ReadableStream<Uint8Array>),
        modelUsed: "DeepSeek",
      };
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

   