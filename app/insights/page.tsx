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
import { generateAIInsights } from "@/lib/ai-insights"; // Direct import
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

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
  }, [period, deepSeekApiKey]); // Add deepSeekApiKey to dependency array if its availability might change (unlikely for env var)

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Wawasan Emosional</h1>
        <p className="text-muted-foreground">
          Pahami pola pengeluaranmu berdasarkan suasana hati
        </p>
      </div>

      <Tabs defaultValue="insights" className="space-y-4">
        <TabsList>
          <TabsTrigger value="insights">
            <Lightbulb className="h-4 w-4 mr-2" />
            Wawasan
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <Calendar className="h-4 w-4 mr-2" />
            Tampilan Kalender
          </TabsTrigger>
          <TabsTrigger value="gamification">
            <Sparkles className="h-4 w-4 mr-2" />
            Pencapaian
          </TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-4">
          <div className="flex justify-between items-center">
            <Tabs
              defaultValue={period}
              onValueChange={(value) =>
                setPeriod(value as "week" | "month" | "year")
              }
              className="w-auto"
            >
              <TabsList>
                <TabsTrigger value="week">Minggu Ini</TabsTrigger>
                <TabsTrigger value="month">Bulan Ini</TabsTrigger>
                <TabsTrigger value="year">Tahun Ini</TabsTrigger>
              </TabsList>
            </Tabs>

            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateInsights}
              disabled={isGeneratingInsights || isLoading || !deepSeekApiKey}
              className="flex items-center gap-2"
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

          <AIInsightCards
            isLoading={isLoading || isGeneratingInsights}
            insights={insights}
          />
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Kalender Pengeluaran</h2>
            <Select
              value={selectedMood}
              onValueChange={(value) =>
                setSelectedMood(value as MoodType | "all")
              }
            >
              <SelectTrigger className="w-[180px]">
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
          {/* Assuming CalendarHeatmap might also use expenses and loading state */}
          <CalendarHeatmap
            selectedMood={selectedMood === "all" ? undefined : selectedMood}
            expenses={expenses}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="gamification">
          <Gamification />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AIInsightCards({
  isLoading,
  insights,
}: {
  isLoading: boolean;
  insights: string[];
}) {
  const icons = [Lightbulb, TrendingUp, AlertTriangle, Brain, Sparkles];

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (
    insights.length === 0 ||
    insights.some(
      (insight) =>
        insight.toLowerCase().includes("gagal") ||
        insight.toLowerCase().includes("error") ||
        insight.toLowerCase().includes("tidak dikonfigurasi")
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
        description =
          "Kunci API untuk layanan AI tidak dikonfigurasi. Silakan periksa pengaturan aplikasi.";
      }
    }
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {insights.map((insight, index) => {
        const Icon = icons[index % icons.length];
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="h-full border-primary/10 hover:border-primary/30 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Wawasan AI</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p>{insight}</p>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
