"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import { moods } from "@/data/moods";
import { CalendarHeatmap } from "@/components/calendar-heatmap";
import { Gamification } from "@/components/gamification";
import {
  generateAIInsights,
  generateDetailedAnalysis,
} from "@/lib/ai-insights";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { renderFormattedResponse } from "@/lib/text-formatter";
import type { AIInsightResponse, AIDetailedAnalysisResponse } from "@/types/ai";

export default function InsightsPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<"week" | "month" | "year">("month");
  const [selectedMood, setSelectedMood] = useState<MoodType | "all">("all");

  const [aiInsightResult, setAiInsightResult] = useState<AIInsightResponse>({
    insights: [],
    modelUsed: "",
  });
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  const [detailedAnalysisResult, setDetailedAnalysisResult] =
    useState<AIDetailedAnalysisResponse | null>(null);
  const [isGeneratingDetailed, setIsGeneratingDetailed] = useState(false);

  const geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  const deepSeekApiKey = process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY;

  const noApiKeysConfigured = !geminiApiKey && !deepSeekApiKey;

  // --- Effects -----------------------------------------------------------------
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setIsGeneratingInsights(true);
      setDetailedAnalysisResult(null); // Reset detailed analysis on period change

      try {
        const { start, end } = getDateRangeForPeriod(period);
        const expenseData = await getExpensesByDateRange(start, end);
        setExpenses(expenseData);

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
          const initialResult = await generateAIInsights(
            geminiApiKey,
            deepSeekApiKey
          );
          setAiInsightResult(initialResult);
        }
      } catch (error) {
        console.error("Failed to load data:", error);
        setAiInsightResult({
          insights: ["Gagal memuat wawasan. Periksa koneksi Anda."],
          modelUsed: "None (Error)",
          error: (error as Error).message,
        });
      } finally {
        setIsLoading(false);
        setIsGeneratingInsights(false);
      }
    }

    loadData();
  }, [period, geminiApiKey, deepSeekApiKey]); // Add API keys to dependency array if they could change (e.g. dynamic env)

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
    setIsGeneratingInsights(true);
    setDetailedAnalysisResult(null); // Reset detailed analysis
    try {
      const newResult = await generateAIInsights(geminiApiKey, deepSeekApiKey);
      setAiInsightResult(newResult);
    } catch (error) {
      console.error("Failed to generate insights:", error);
      setAiInsightResult({
        insights: ["Gagal membuat wawasan baru. Periksa koneksi Anda."],
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
    try {
      const analysisResult = await generateDetailedAnalysis(
        geminiApiKey,
        deepSeekApiKey,
        aiInsightResult.insights
      );
      setDetailedAnalysisResult(analysisResult);
    } catch (error) {
      console.error("Failed to generate detailed analysis:", error);
      setDetailedAnalysisResult({
        analysis: "Gagal membuat analisis mendalam. Periksa koneksi Anda.",
        modelUsed: "None (Error)",
        error: (error as Error).message,
      });
    } finally {
      setIsGeneratingDetailed(false);
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
              onValueChange={(value) =>
                setPeriod(value as "week" | "month" | "year")
              }
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
                  <Sparkles className="h-4 w-4" />
                </motion.div>
              ) : (
                <Brain className="h-4 w-4" />
              )}
              {isGeneratingInsights ? "Menganalisis..." : "Analisis Ulang AI"}
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
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
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
                        <span>Menganalisis lebih dalam...</span>
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

          <CalendarHeatmap
            selectedMood={selectedMood === "all" ? undefined : selectedMood}
            expenses={expenses}
            isLoading={isLoading}
          />
        </TabsContent>

        {/* Gamification Tab */}
        <TabsContent value="gamification">
          <Gamification />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Update AIInsightCards to accept an optional error prop
function AIInsightCards({
  isLoading,
  insights,
  error, // Add error prop
}: {
  isLoading: boolean;
  insights: string[];
  error?: string; // Optional error from AIInsightResponse
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

  if (insights.length === 0 || hasError) {
    let title = "Belum Ada Wawasan";
    let description =
      "Tambahkan lebih banyak pengeluaran atau coba analisis AI untuk mendapatkan wawasan tentang pola belanjamu.";

    if (insights.length > 0) {
      // Even if there's an error, display the insights (which might be error messages)
      title = "Informasi Wawasan";
      description = insights.join("\n"); // Use newline for potentially multiple error messages
      if (
        error?.toLowerCase().includes("no api keys") ||
        insights.some((i) => i.toLowerCase().includes("tidak dikonfigurasi"))
      ) {
        title = "Konfigurasi Diperlukan";
      } else if (error?.toLowerCase().includes("not enough data")) {
        title = "Data Tidak Cukup";
      } else if (hasError) {
        title = "Gagal Mendapatkan Wawasan";
      }
    } else if (error) {
      // No insights, but there is an error string
      title = "Gagal Mendapatkan Wawasan";
      description =
        "Terjadi kesalahan. Silakan coba lagi nanti atau periksa konfigurasi.";
    }

    return (
      <Card className="border-dashed border-2 border-destructive/30">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription className="prose-sm dark:prose-invert">
            {renderFormattedResponse(description)}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // ... (Insight Cards rendering remains similar) ...
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
