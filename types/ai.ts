export interface AIInsightResponse {
  insights: string[];
  modelUsed: string;
  error?: string; // Optional error message if the process failed at a higher level
}

export interface AIDetailedAnalysisResponse {
  analysis: string;
  modelUsed: string;
  error?: string;
}

// Union type for client functions which can return either list of insights or single text
export type AIResponse =
  | { insights: string[]; modelUsed: string; error?: string; text?: never }
  | { text: string; modelUsed: string; error?: string; insights?: never };
