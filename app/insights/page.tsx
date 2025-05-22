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
} from "lucide-react";
import { moods } from "@/data/moods";
import { CalendarHeatmap } from "@/components/calendar-heatmap";
import { Gamification } from "@/components/gamification";
import { generateAIInsights } from "@/lib/ai-insights";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { renderFormattedResponse } from "@/lib/text-formatter";

export default function InsightsPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<"week" | "month" | "year">("month");
  const [selectedMood, setSelectedMood] = useState<MoodType | "all">("all");
  const [insights, setInsights] = useState<string[]>([]);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  // IMPORTANT: This API key will be bundled with your client-side JavaScript
  // and will be visible to anyone inspecting your site's code or network traffic.
  const deepSeekApiKey = process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY;

  // --- Effects -----------------------------------------------------------------
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setIsGeneratingInsights(true);
      try {
        const { start, end } = getDateRangeForPeriod(period);
        const expenseData = await getExpensesByDateRange(start, end);
        setExpenses(expenseData);

        if (!deepSeekApiKey) {
          console.warn(
            "DeepSeek API Key is not configured. AI insights will be limited."
          );
          setInsights([
            "Kunci API untuk wawasan AI tidak dikonfigurasi. Fitur ini mungkin tidak berfungsi.",
          ]);
        } else {
          const initialInsights = await generateAIInsights(deepSeekApiKey);
          setInsights(initialInsights);
        }
      } catch (error) {
        console.error("Failed to load data:", error);
        setInsights(["Gagal memuat wawasan. Periksa koneksi Anda."]);
      } finally {
        setIsLoading(false);
        setIsGeneratingInsights(false);
      }
    }

    loadData();
  }, [period, deepSeekApiKey]);

  // --- Handlers ----------------------------------------------------------------
  const handleGenerateInsights = async () => {
    if (!deepSeekApiKey) {
      setInsights([
        "Kunci API untuk wawasan AI tidak dikonfigurasi. Tidak dapat membuat wawasan baru.",
      ]);
      console.warn(
        "DeepSeek API Key is not configured. Cannot generate new AI insights."
      );
      return;
    }
    setIsGeneratingInsights(true);
    try {
      const newInsights = await generateAIInsights(deepSeekApiKey);
      setInsights(newInsights);
    } catch (error) {
      console.error("Failed to generate insights:", error);
      setInsights(["Gagal membuat wawasan baru. Periksa koneksi Anda."]);
    } finally {
      setIsGeneratingInsights(false);
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
        {/* --- Tabs Header ------------------------------------------------------ */}
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

        {/* --- Insights Tab ------------------------------------------------------ */}
        <TabsContent value="insights" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Period Switcher */}
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

            {/* AI Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateInsights}
              disabled={isGeneratingInsights || isLoading || !deepSeekApiKey}
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
              {isGeneratingInsights ? "Menganalisis..." : "Analisis AI"}
            </Button>
          </div>

          {/* AI Insight Cards */}
          <AIInsightCards
            isLoading={isLoading || isGeneratingInsights}
            insights={insights}
          />
        </TabsContent>

        {/* --- Calendar Tab ------------------------------------------------------ */}
        <TabsContent value="calendar" className="space-y-4">
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

        {/* --- Gamification Tab -------------------------------------------------- */}
        <TabsContent value="gamification">
          <Gamification />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// =============================================================================
// AIInsightCards Component
// =============================================================================
function AIInsightCards({
  isLoading,
  insights,
}: {
  isLoading: boolean;
  insights: string[];
}) {
  const icons = [Lightbulb, TrendingUp, AlertTriangle, Brain, Sparkles];

  // --- Loading Skeleton -------------------------------------------------------
  if (isLoading) {
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

  // --- Empty / Error State ----------------------------------------------------
  if (
    insights.length === 0 ||
    insights.some((insight) =>
      ["gagal", "error", "tidak dikonfigurasi"].some((kw) =>
        insight.toLowerCase().includes(kw)
      )
    )
  ) {
    let title = "Belum Ada Wawasan";
    let description =
      "Tambahkan lebih banyak pengeluaran atau coba analisis AI untuk mendapatkan wawasan tentang pola belanjamu.";

    if (insights.length > 0) {
      title = "Informasi Wawasan";
      description = insights.join(" ");
      if (
        insights.some((insight) =>
          insight.toLowerCase().includes("tidak dikonfigurasi")
        )
      ) {
        title = "Konfigurasi Diperlukan";
      }
    }

    return (
      <Card className="border-dashed border-2 border-primary/20">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription className="prose-sm dark:prose-invert">
            {renderFormattedResponse(description)}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // --- Insight Cards ----------------------------------------------------------
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
