"use client";

import { useEffect, useState, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getExpensesByDateRange } from "@/lib/db";
import type { Expense, MoodType } from "@/types/expense";
import { getDateRangeForPeriod } from "@/lib/utils";
import {
  Lightbulb,
  Calendar,
  Sparkles,
  MessageSquareText,
} from "lucide-react";
import { generateAIInsights, generateDetailedAnalysis } from "@/lib/ai-insights";
import type { AIInsightResponse, AIDetailedAnalysisResponse } from "@/types/ai";

// Updated import paths for components within the /insights/components/ directory
import { InsightsPageHeader } from "./components/insights-page-header";
import { PeriodControls } from "./components/period-controls";
import { AIInsightCards } from "./components/ai-insight-cards";
import { DetailedAnalysisCard } from "./components/detailed-analysis-card";
import { CalendarTabContent } from "./components/calendar-tab-content";
import { GamificationTabContent } from "./components/gamification-tab-content";

export default function InsightsPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<"week" | "month" | "year">("month");
  const [selectedMood, setSelectedMood] = useState<MoodType | "all">("all");
  const [cachedData, setCachedData] = useState<{
    week?: Expense[];
    month?: Expense[];
    year?: Expense[];
  }>({});
  const [insightsGenerated, setInsightsGenerated] = useState<{
    week?: boolean;
    month?: boolean;
    year?: boolean;
  }>({});

  const [aiInsightResult, setAiInsightResult] = useState<AIInsightResponse>({
    insights: [],
    modelUsed: "",
  });
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  const [detailedAnalysisResult, setDetailedAnalysisResult] =
    useState<AIDetailedAnalysisResponse | null>(null);
  const [isGeneratingDetailed, setIsGeneratingDetailed] = useState(false);
  const [analysisStartTime, setAnalysisStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [responseStream, setResponseStream] = useState<ReadableStream<Uint8Array> | null>(null);
  const [streamKey, setStreamKey] = useState(0);

  const getLoadingMessage = (seconds: number) => {
    if (seconds < 5) return "Menganalisis data transaksi Anda...";
    if (seconds < 15) return "Mengidentifikasi pola pengeluaran...";
    if (seconds < 25) return "Menyusun rekomendasi personal...";
    return "Hampir selesai...";
  };

  const getLoadingSubMessage = (seconds: number) => {
    if (seconds < 5) return "Ini mungkin memakan waktu beberapa saat...";
    if (seconds < 15) return "Menganalisis lebih dalam...";
    if (seconds < 25) return "Hanya beberapa detik lagi...";
    return "Menyelesaikan analisis...";
  };

  const geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  const deepSeekApiKey = process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY;

  const noApiKeysConfigured = !geminiApiKey && !deepSeekApiKey;

  useEffect(() => {
    if (!cachedData[period]) {
      fetchDataForPeriod(period);
    } else {
      setExpenses(cachedData[period] || []);
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setAiInsightResult({ insights: [], modelUsed: "" });
    if (cachedData[period]) {
      setExpenses(cachedData[period] || []);
      setIsLoading(false);
    } else {
      fetchDataForPeriod(period);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  async function fetchDataForPeriod(currentPeriod: "week" | "month" | "year") {
    setIsLoading(true);
    try {
      const { start, end } = getDateRangeForPeriod(currentPeriod);
      const expenseData = await getExpensesByDateRange(start, end);
      setExpenses(expenseData);
      setCachedData(prev => ({ ...prev, [currentPeriod]: expenseData }));
    } catch (error) {
      console.error(`Failed to load data for ${currentPeriod}:`, error);
      setAiInsightResult({
        insights: ["Gagal memuat wawasan. Periksa koneksi Anda."],
        modelUsed: "None (Error)",
        error: (error as Error).message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleGenerateInsights = async () => {
    if (noApiKeysConfigured) {
      setAiInsightResult({
        insights: [
          "Kunci API untuk wawasan AI tidak dikonfigurasi. Tidak dapat membuat wawasan baru.",
        ],
        modelUsed: "None",
        error: "No API Keys",
      });
      return;
    }
    setIsGeneratingInsights(true);
    setDetailedAnalysisResult(null);
    try {
      let expenseData = cachedData[period];
      if (!expenseData) {
        const { start, end } = getDateRangeForPeriod(period);
        expenseData = await getExpensesByDateRange(start, end);
        setExpenses(expenseData);
        setCachedData(prev => ({ ...prev, [period]: expenseData! }));
      }

      if (expenseData.length < 3) {
        setAiInsightResult({
          insights: ["Data Tidak Cukup\nAnda membutuhkan minimal 3 pengeluaran untuk dianalisis. Tambahkan lebih banyak pengeluaran terlebih dahulu."],
          modelUsed: "None",
          error: "Not enough data",
        });
        setIsGeneratingInsights(false); // Ensure loading state is reset
        return;
      }
      const newResult = await generateAIInsights(
        geminiApiKey,
        deepSeekApiKey,
        expenseData
      );
      setAiInsightResult(newResult);
      setInsightsGenerated(prev => ({ ...prev, [period]: true }));
    } catch (error) {
      console.error("Failed to generate insights:", error);
      setAiInsightResult({
        insights: ["Gagal Mendapatkan Wawasan\nTerjadi kesalahan. Silakan coba lagi nanti atau periksa koneksi Anda."],
        modelUsed: "None (Error)",
        error: (error as Error).message,
      });
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const handleGenerateDetailedAnalysis = async () => {
    console.log('Starting detailed analysis');
    
    // Reset all states
    setIsGeneratingDetailed(true);
    setIsStreaming(true);
    setStreamingContent('');
    setDetailedAnalysisResult(null);
    setAnalysisStartTime(Date.now());
    setElapsedTime(0);
    
    // Clean up any existing stream
    setResponseStream(null);
    setStreamKey(prev => prev + 1); // Force remount of card component
    
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    try {
      const analysisResult = await generateDetailedAnalysis(
        geminiApiKey,
        deepSeekApiKey,
        aiInsightResult.insights,
        true // Enable streaming
      );

      if (analysisResult.stream) {
        console.log('Setting response stream');
        setResponseStream(analysisResult.stream); // Directly set the stream
        return;
      }
      
      setDetailedAnalysisResult(analysisResult);
    } catch (error) {
      console.error('Failed to generate detailed analysis:', error);
      setDetailedAnalysisResult({
        analysis: "Gagal menghasilkan analisis mendalam. Silakan coba lagi nanti.",
        modelUsed: "None (Error)",
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsGeneratingDetailed(false);
      setIsStreaming(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  return (
    <div className="space-y-6 pb-10 lg:pb-12 xl:pb-16">
      <InsightsPageHeader />

      <Tabs defaultValue="insights" className="space-y-6">
        <TabsList className="overflow-x-auto rounded-lg shadow-sm">
          <TabsTrigger value="insights">
            <Lightbulb className="h-4 w-4 mr-2 shrink-0" />
            Wawasan
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <Calendar className="h-4 w-4 mr-2 shrink-0" />
            Kalender
          </TabsTrigger>
          <TabsTrigger value="gamification">
            <Sparkles className="h-4 w-4 mr-2 shrink-0" />
            Pencapaian
          </TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-6">
          <PeriodControls
            currentPeriod={period}
            onPeriodChange={(newPeriod) => setPeriod(newPeriod)}
            onGenerateInsights={handleGenerateInsights}
            isGeneratingInsights={isGeneratingInsights}
            isLoading={isLoading}
            noApiKeysConfigured={noApiKeysConfigured}
          />

          {aiInsightResult.modelUsed &&
            aiInsightResult.modelUsed !== "None" &&
            !aiInsightResult.modelUsed.includes("(Error)") && (
              <div className="flex items-center justify-start text-xs text-muted-foreground mb-1 mt-[-10px]">
                <MessageSquareText className="h-3 w-3 mr-1.5" />
                Wawasan utama dihasilkan oleh:{" "}
                {aiInsightResult.modelUsed.replace(/\s*\(Error\)\s*/, "")}
              </div>
            )}

          <AIInsightCards
            isLoading={isLoading || isGeneratingInsights}
            insights={aiInsightResult.insights}
            error={aiInsightResult.error}
            expenses={expenses}
            period={period}
          />

          <DetailedAnalysisCard
            aiInsightResult={aiInsightResult}
            detailedAnalysisResult={detailedAnalysisResult}
            isGeneratingDetailed={isGeneratingDetailed || isStreaming}
            isLoading={isLoading}
            isGeneratingInsights={isGeneratingInsights}
            noApiKeysConfigured={noApiKeysConfigured}
            onGenerateDetailedAnalysis={handleGenerateDetailedAnalysis}
            getLoadingMessage={getLoadingMessage}
            getLoadingSubMessage={getLoadingSubMessage}
            elapsedTime={elapsedTime}
            stream={responseStream} 
            key={`stream-${streamKey}`} 
          />
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <CalendarTabContent
            selectedMood={selectedMood}
            onMoodChange={(mood) => setSelectedMood(mood)}
            expenses={expenses}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="gamification">
          <GamificationTabContent expenses={expenses} isLoading={isLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}