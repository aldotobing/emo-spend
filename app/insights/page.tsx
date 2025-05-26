"use client";

import { useEffect, useState, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { getExpensesByDateRange } from "@/lib/db";
import type { Expense, MoodType } from "@/types/expense";
import { getDateRangeForPeriod } from "@/lib/utils";
import {
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Sparkles,
  Brain,
  SearchCheck, // For detailed analysis button
  MessageSquareText, // For model used
  ArrowRight,
  Zap,
  Loader2,
} from "lucide-react";
import { moods } from "@/data/moods";
import { EnhancedCalendar } from "@/components/enhanced-calendar";
import { Gamification } from "@/components/gamification";
import { generateAIInsights, generateDetailedAnalysis } from "@/lib/ai-insights";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { renderFormattedResponse } from "@/lib/text-formatter";
import type { AIInsightResponse, AIDetailedAnalysisResponse } from "@/types/ai";

export default function InsightsPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<"week" | "month" | "year">("month");
  const [selectedMood, setSelectedMood] = useState<MoodType | "all">("all");
  // Add a state to track if data needs to be fetched
  const [shouldFetchData, setShouldFetchData] = useState(true);
  // Add a state to store fetched data for each period
  const [cachedData, setCachedData] = useState<{
    week?: Expense[];
    month?: Expense[];
    year?: Expense[];
  }>({});
  // Track which periods have already had insights generated
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
  // Flag to track if we should generate AI insights when fetching data
  const [shouldGenerateInsights, setShouldGenerateInsights] = useState(false);

  const [detailedAnalysisResult, setDetailedAnalysisResult] =
    useState<AIDetailedAnalysisResponse | null>(null);
  const [isGeneratingDetailed, setIsGeneratingDetailed] = useState(false);
  const [analysisStartTime, setAnalysisStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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

  // --- Effects -----------------------------------------------------------------
  useEffect(() => {
    // Initial data load for the default period (month) if not already in cache
    if (!cachedData[period]) {
      console.log('Initial page load - fetching data for period:', period);
      fetchDataForPeriod(period);
    } else {
      console.log('Using cached data for initial load:', period);
      setExpenses(cachedData[period] || []);
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on component mount

  // Effect to handle period changes
  useEffect(() => {
    console.log(`Period changed to: ${period}`);
    
    // Clear any existing insights when period changes
    setAiInsightResult({
      insights: [],
      modelUsed: ""
    });
    
    // If we already have data for this period, use it
    if (cachedData[period]) {
      console.log(`Using cached data for ${period}`);
      setExpenses(cachedData[period] || []);
      setIsLoading(false);
    } else {
      // Otherwise fetch it
      console.log(`Fetching new data for ${period}`);
      fetchDataForPeriod(period);
    }
  }, [period]); // Only depend on period

  // Separate useEffect for API keys changes
  useEffect(() => {
    if (geminiApiKey || deepSeekApiKey) {
      // If API keys change, we might want to regenerate insights
      // But we'll let the user decide by clicking the button
    }
  }, [geminiApiKey, deepSeekApiKey]);

  async function fetchDataForPeriod(currentPeriod: "week" | "month" | "year") {
    setIsLoading(true);
    
    try {
      // Fetch expense data for the specified period
      const { start, end } = getDateRangeForPeriod(currentPeriod);
      console.log(`Fetching data for ${currentPeriod} from ${start} to ${end}`);
      
      const expenseData = await getExpensesByDateRange(start, end);
      console.log(`Received ${expenseData.length} expenses for ${currentPeriod}:`, expenseData);
      
      // Update the expenses state with the fetched data
      setExpenses(expenseData);
      
      // Cache the data for this period using a functional update to ensure we're working with the latest state
      setCachedData(prev => {
        const newCache = {
          ...prev,
          [currentPeriod]: expenseData
        };
        console.log('Updated cache:', newCache);
        return newCache;
      });
      
      console.log('Data fetched and cached for period:', currentPeriod);
      
      // Clear any previous insights when data is loaded
      // The UI will show the default message since insights are empty
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
  
  async function generateInsightsForPeriod(expenseData: Expense[]) {
    setIsGeneratingInsights(true);
    setDetailedAnalysisResult(null);
    
    try {
      if (noApiKeysConfigured) {
        console.warn(
          "No AI API Keys are configured. AI insights will be limited."
        );
        setAiInsightResult({
          insights: ["Kunci API untuk wawasan AI tidak dikonfigurasi."],
          modelUsed: "None",
          error: "No API Keys",
        });
      } else {
        // Use the provided expense data
        console.log('generateInsightsForPeriod - provided expenses:', expenseData);
        if (expenseData.length < 3) {
          console.warn(`Not enough expenses for AI insights: only ${expenseData.length} available`);
          setAiInsightResult({
            insights: ["Tidak cukup data untuk menghasilkan wawasan. Tambahkan lebih banyak pengeluaran."],
            modelUsed: "None",
            error: "Not enough data",
          });
          return;
        }
        
        // Generate insights using the provided expenses
        console.log('Calling generateAIInsights with expenses:', expenseData);
        const result = await generateAIInsights(
          geminiApiKey,
          deepSeekApiKey,
          expenseData // Pass the provided expenses
        );
        console.log('Received AI insights result:', result);
        setAiInsightResult(result);
        
        // Mark insights as generated for this period
        setInsightsGenerated(prev => ({
          ...prev,
          [period]: true
        }));
      }
    } catch (error) {
      console.error("Failed to generate insights:", error);
      setAiInsightResult({
        insights: ["Gagal memuat wawasan. Periksa koneksi Anda."],
        modelUsed: "None (Error)",
        error: (error as Error).message,
      });
    } finally {
      setIsGeneratingInsights(false);
    }
  }

  // --- Handlers ----------------------------------------------------------------
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
    
    console.log('Generate Insights clicked for period:', period);
    
    setIsGeneratingInsights(true);
    setDetailedAnalysisResult(null); // Reset detailed analysis
    
    try {
      // Use cached data if available, otherwise fetch fresh data
      let expenseData = cachedData[period];
      
      if (!expenseData) {
        const { start, end } = getDateRangeForPeriod(period);
        console.log(`Fetching fresh data for ${period} from ${start} to ${end}`);
        expenseData = await getExpensesByDateRange(start, end);
        console.log(`Received ${expenseData.length} expenses:`, expenseData);
        
        // Update the expenses and cache
        setExpenses(expenseData);
        setCachedData(prev => ({
          ...prev,
          [period]: expenseData
        }));
      } else {
        console.log(`Using cached data for ${period} with ${expenseData.length} expenses`);
      }
      
      // Check if we have enough data
      if (expenseData.length < 3) {
        console.warn(`Not enough expenses for AI insights: only ${expenseData.length} available`);
        setAiInsightResult({
          insights: ["Data Tidak Cukup\nAnda membutuhkan minimal 3 pengeluaran untuk dianalisis. Tambahkan lebih banyak pengeluaran terlebih dahulu."],
          modelUsed: "None",
          error: "Not enough data",
        });
        return;
      }
      
      // Generate AI insights with the current expense data
      console.log('Calling generateAIInsights with expenses:', expenseData);
      const newResult = await generateAIInsights(
        geminiApiKey,
        deepSeekApiKey,
        expenseData
      );
      console.log('Received AI insights result:', newResult);
      setAiInsightResult(newResult);
      
      // Mark insights as generated for current period
      setInsightsGenerated(prev => ({
        ...prev,
        [period]: true
      }));
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
    if (
      noApiKeysConfigured ||
      aiInsightResult.insights.length === 0 ||
      aiInsightResult.error
    ) {
      setDetailedAnalysisResult({
        analysis:
          "Analisis mendalam tidak dapat dibuat. Pastikan wawasan awal berhasil dibuat dan API Key telah dikonfigurasi.",
        modelUsed: "None",
        error: "Prerequisites not met",
      });
      return;
    }
    setIsGeneratingDetailed(true);
    const startTime = Date.now();
    setAnalysisStartTime(startTime);
    setElapsedTime(0);
    
    // Start the timer
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    
    try {
      const analysisResult = await generateDetailedAnalysis(
        geminiApiKey,
        deepSeekApiKey,
        aiInsightResult.insights
      );
      setDetailedAnalysisResult(analysisResult);
    } catch (error) {
      console.error("Failed to generate detailed analysis:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setDetailedAnalysisResult({
        analysis: "Gagal menghasilkan analisis mendalam. Silakan coba lagi nanti.",
        modelUsed: "None (Error)",
        error: errorMessage,
      });
    } finally {
      setIsGeneratingDetailed(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  // --- Render ------------------------------------------------------------------
  return (
    <div className="space-y-6 pb-10 lg:pb-12 xl:pb-16">
      {/* Heading */}
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Wawasan Emosional</h1>
        <p className="text-muted-foreground max-w-lg">
          Pahami pola pengeluaranmu berdasarkan suasana hati
        </p>
      </header>

      {/* Main Tabs */}
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <Tabs
              defaultValue={period}
              onValueChange={(value) => {
                const newPeriod = value as "week" | "month" | "year";
                console.log(`Tab clicked: changing period from ${period} to ${newPeriod}`);
                setPeriod(newPeriod);
              }}
              className="w-full sm:w-auto"
            >
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="week" className="flex-1 sm:flex-none">
                  Minggu Ini
                </TabsTrigger>
                <TabsTrigger value="month" className="flex-1 sm:flex-none">
                  Bulan Ini
                </TabsTrigger>
                <TabsTrigger value="year" className="flex-1 sm:flex-none">
                  Tahun Ini
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateInsights}
              disabled={
                isGeneratingInsights || isLoading || noApiKeysConfigured
              }
              className="flex items-center gap-2 border-primary/20 hover:border-primary/50 focus-visible:ring-primary/60"
            >
              {isGeneratingInsights ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 1,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "linear",
                  }}
                >
                  <Zap className="h-4 w-4" />
                </motion.div>
              ) : (
                <Zap className="h-4 w-4" />
              )}
              {isGeneratingInsights ? "Menganalisis..." : "Analisa AI"}
            </Button>
          </div>

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

          {/* Detailed Analysis Section */}
          {aiInsightResult.insights &&
            aiInsightResult.insights.length > 0 &&
            !aiInsightResult.error && (
              <div className="mt-8 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Analisis Perilaku Mendalam</CardTitle>
                    <CardDescription>
                      Dapatkan pemahaman yang lebih dalam tentang kebiasaan
                      belanja emosional Anda.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {detailedAnalysisResult && !isGeneratingDetailed && (
                      <>
                        {detailedAnalysisResult.modelUsed &&
                          detailedAnalysisResult.modelUsed !== "None" &&
                          !detailedAnalysisResult.modelUsed.includes(
                            "(Error)"
                          ) && (
                            <div className="flex items-center text-xs text-muted-foreground mb-3">
                              <MessageSquareText className="h-3 w-3 mr-1.5" />
                              Analisis mendalam oleh:{" "}
                              {detailedAnalysisResult.modelUsed.replace(
                                /\s*\(Error\)\s*/,
                                ""
                              )}
                            </div>
                          )}
                        <div className="prose prose-sm dark:prose-invert max-w-none space-y-2">
                          {renderFormattedResponse(
                            detailedAnalysisResult.analysis
                          )}
                        </div>
                      </>
                    )}
                    {isGeneratingDetailed && (
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2 text-sm">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              ease: "linear",
                            }}
                          >
                            <Zap className="h-4 w-4 text-primary" />
                          </motion.div>
                          <div className="space-y-1">
                          <p className="font-medium">
                            {getLoadingMessage(elapsedTime)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {getLoadingSubMessage(elapsedTime)}
                          </p>
                        </div>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                          <motion.div 
                            className="h-full bg-primary/80 rounded-full"
                            initial={{ width: '0%' }}
                            animate={{ width: '100%' }}
                            transition={{ 
                              duration: 30, // Total duration of the progress bar
                              ease: 'linear' 
                            }}
                          />
                        </div>
                      </div>
                    )}
                    {!detailedAnalysisResult && !isGeneratingDetailed && (
                      <p className="text-sm text-muted-foreground">
                        Klik tombol di bawah untuk mendapatkan analisis yang
                        lebih detail.
                      </p>
                    )}
                    {detailedAnalysisResult?.error && !isGeneratingDetailed && (
                      <p className="text-sm text-destructive">
                        {detailedAnalysisResult.analysis}
                      </p>
                    )}
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleGenerateDetailedAnalysis}
                      disabled={
                        isGeneratingDetailed ||
                        isLoading ||
                        isGeneratingInsights ||
                        noApiKeysConfigured ||
                        !!aiInsightResult.error
                      }
                      className="mt-4 flex items-center gap-2"
                    >
                      {isGeneratingDetailed ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                        >
                          <Sparkles className="h-4 w-4" />
                        </motion.div>
                      ) : (
                        <SearchCheck className="h-4 w-4" />
                      )}
                      {detailedAnalysisResult && !detailedAnalysisResult.error
                        ? "Analisis Ulang Mendalam"
                        : "Analisis Mendalam"}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="space-y-4">
          {/* ... (content remains the same) ... */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <h2 className="text-xl font-semibold shrink-0">
              Kalender Pengeluaran
            </h2>
            <Select
              value={selectedMood}
              onValueChange={(value) =>
                setSelectedMood(value as MoodType | "all")
              }
            >
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Filter berdasarkan mood" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Mood</SelectItem>
                {moods.map((mood) => (
                  <SelectItem key={mood.id} value={mood.id}>
                    <span className="flex items-center">
                      <span className="mr-2">{mood.emoji}</span>
                      <span>{mood.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <EnhancedCalendar
            selectedMood={selectedMood === "all" ? undefined : selectedMood}
            expenses={expenses}
            isLoading={isLoading}
          />
        </TabsContent>

        {/* Gamification Tab */}
        <TabsContent value="gamification">
          <Gamification expenses={expenses} isLoading={isLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Update AIInsightCards to accept an optional error prop
function AIInsightCards({
  isLoading,
  insights,
  error,
  expenses,
  period
}: {
  isLoading: boolean;
  insights: string[];
  error?: string;
  expenses: any[];
  period: string;
}) {
  const icons = [Lightbulb, TrendingUp, AlertTriangle, Brain, Sparkles];

  if (isLoading) {
    // ... (skeleton remains the same) ...
    return (
      <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Check for errors first, then empty insights
  const hasError =
    !!error ||
    insights.some((insight) =>
      [
        "gagal",
        "error",
        "tidak dikonfigurasi",
        "tidak ditemukan",
        "tidak lengkap",
      ].some((kw) => insight.toLowerCase().includes(kw))
    );

  // Check if there's any data for the current period
  const hasData = expenses.length > 0;
  
  // Show appropriate message based on data availability
  const showDefaultMessage = insights.length === 0 || 
    (insights.length === 1 && insights[0].startsWith("Belum Ada Wawasan"));

  if (showDefaultMessage || hasError) {
    let title = hasData 
      ? <div className="flex items-center gap-2">
          <motion.div
            animate={{ x: [0, 4, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <Zap className="h-5 w-5 text-green-500" />
          </motion.div>
          <span>Data Siap Dianalisis</span>
        </div>
      : "Data Kosong";
      
    let description = hasData
      ? <>
          <p className="mb-2">Kami menemukan <span className="font-semibold">{expenses.length} transaksi</span> yang siap dianalisis.</p>
          <p>Klik tombol <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 rounded-md text-sm">
            <Zap className="h-3 w-3" /> Analisa AI
          </span> untuk mendapatkan wawasan tentang pola belanja emosional Anda.</p>
        </>
      : `Tidak ditemukan data pengeluaran untuk ${period === 'week' ? 'minggu ini' : period === 'month' ? 'bulan ini' : 'tahun ini'}. ` +
        `Sistem tidak dapat menganalisis apa pun tanpa data. ` +
        `Silakan tambahkan pengeluaran Anda terlebih dahulu atau pilih periode lain yang memiliki data.`;

    if (hasError && insights.length > 0) {
      // Even if there's an error, display the insights (which might be error messages)
      title = "Informasi Wawasan";
      description = insights.join("\n"); // Use newline for potentially multiple error messages
      if (
        error?.toLowerCase().includes("no api keys") ||
        insights.some((i) => i.toLowerCase().includes("tidak dikonfigurasi"))
      ) {
        title = "Konfigurasi Diperlukan";
      } else if (error?.toLowerCase().includes("not enough data")) {
        title = "Data Tidak Mencukupi";
        description = "Data pengeluaran Anda belum cukup untuk dianalisis. " +
          "Anda membutuhkan minimal 3 transaksi untuk mendapatkan wawasan yang bermakna. " +
          "Silakan tambahkan lebih banyak pengeluaran dan coba lagi.";
      } else if (hasError) {
        title = "Gagal Memproses Permintaan";
        description = "Terjadi kesalahan saat memproses data Anda. " +
          "Ini bisa terjadi karena masalah koneksi atau masalah teknis. " +
          "Silakan periksa koneksi internet Anda dan coba lagi nanti. " +
          "Jika masalah berlanjut, harap laporkan ke tim dukungan kami.";
      }
    } else if (error) {
      // No insights, but there is an error string
      title = "Terjadi Kesalahan";
      description = "Sistem mengalami kendala saat memproses permintaan Anda. " +
        "Ini bisa disebabkan oleh beberapa hal:\n\n" +
        "• Koneksi internet yang tidak stabil\n" +
        "• Masalah pada server\n" +
        "• Format data yang tidak sesuai\n\n" +
        "Silakan periksa koneksi Anda dan coba lagi. Jika masalah berlanjut, " +
        "Anda dapat menghubungi tim dukungan kami untuk bantuan lebih lanjut.";
    }

    return (
      <Card className={`border-dashed border-2 ${hasData ? 'border-green-500/30' : 'border-destructive/30'}`}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription className="prose-sm dark:prose-invert">
            {typeof description === 'string' ? renderFormattedResponse(description) : description}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {insights.map((insight, index) => {
        const Icon = icons[index % icons.length];
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="h-full"
          >
            <Card className="h-full flex flex-col border-primary/10 hover:border-primary/30 hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <span className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-primary" />
                  </span>
                  <CardTitle className="text-lg">Wawasan AI</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="grow flex flex-col">
                <div className="prose prose-sm dark:prose-invert max-w-none space-y-2">
                  {renderFormattedResponse(insight)}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
