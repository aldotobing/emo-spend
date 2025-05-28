export interface AIInsightResponse {
  insights: string[];
  modelUsed: string;
  error?: string; // Optional error message if the process failed at a higher level
}

export type AIDetailedAnalysisResponse =
  | {
      analysis: string;
      modelUsed: string;
      error?: string;
      stream?: never;
    }
  | {
      stream: ReadableStream<Uint8Array>;
      modelUsed: string;
      analysis?: never;
      error?: never;
    };

// Union type for client functions which can return either list of insights, single text, or a stream
export type AIResponse =
  | { insights: string[]; modelUsed: string; error?: string; text?: never; stream?: never }
  | { text: string; modelUsed: string; error?: string; insights?: never; stream?: never }
  | { stream: ReadableStream<Uint8Array>; modelUsed: string; insights?: never; text?: never; error?: never };
