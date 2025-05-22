// app/page.tsx or pages/dashboard.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getExpensesByDateRange } from "@/lib/db";
import type { Expense } from "@/types/expense";
import { formatCurrency, getDateRangeForPeriod } from "@/lib/utils";
import { moods } from "@/data/moods";
import { ExpenseList } from "@/components/expense-list";
import { SpendingByMoodChart } from "@/components/spending-by-mood-chart";
import { SpendingByCategory } from "@/components/spending-by-category";
import { SpendingOverTime } from "@/components/spending-over-time";
import { Gamification } from "@/components/gamification";
import { AnimatePresence, motion } from "framer-motion";

export default function Dashboard() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<"day" | "week" | "month" | "year">(
    "month"
  );
  const [animatedTotal, setAnimatedTotal] = useState(0);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const { start, end } = getDateRangeForPeriod(period);
        const data = await getExpensesByDateRange(start, end);
        setExpenses(data);
      } catch (err) {
        console.error("Error fetching expenses:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [period]);

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const expensesByMood = moods.map((m) => {
    const filtered = expenses.filter((e) => e.mood === m.id);
    const total = filtered.reduce((s, e) => s + e.amount, 0);
    return {
      ...m,
      total,
      count: filtered.length,
      percentage: totalSpent ? (total / totalSpent) * 100 : 0,
    };
  });

  useEffect(() => {
    if (isLoading) return;
    const duration = 800;
    const start = performance.now();
    const from = animatedTotal;
    const to = totalSpent;
    if (from === to) return;
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedTotal(Math.floor(from + (to - from) * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [totalSpent, isLoading]);

  const periods: (typeof period)[] = ["day", "week", "month", "year"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Content with proper spacing for bottom nav */}
      <div className="space-y-6 pb-32 sm:pb-6">
        {/* Desktop header */}
        <div className="hidden sm:flex justify-between items-center sticky top-0 z-40 bg-background/80 backdrop-blur-md py-4 border-b border-border/50">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Dashboard
          </h1>
          <Link href="/add">
            <Button className="shadow-lg hover:shadow-xl transition-all duration-200">
              <PlusCircle className="mr-2 h-4 w-4" />
              Tambah Pengeluaran
            </Button>
          </Link>
        </div>

        {/* Mobile header with enhanced styling */}
        <div className="sm:hidden px-4 pt-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-between"
          >
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              Dashboard
            </h1>
            {/* Optional: Add a notification or menu icon here */}
          </motion.div>
        </div>

        <div className="px-4 sm:px-6 lg:px-8">
          <Tabs
            defaultValue="month"
            onValueChange={(v) => setPeriod(v as any)}
            className="space-y-6"
          >
            {/* Enhanced mobile-responsive tabs */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {/* MODIFIED: Added h-10 for consistent height */}
              <TabsList className="flex sm:grid sm:grid-cols-4 gap-1 rounded-2xl bg-muted/30 p-1.5 w-full backdrop-blur-sm border border-border/50 min-h-[42px] sm:h-10">
                {" "}
                {periods.map((p, index) => (
                  <TabsTrigger
                    key={p}
                    value={p}
                    // MODIFIED: Added px-3 py-1.5 for better padding/touch targets
                    className="text-xs sm:text-sm font-medium rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-border/20 transition-all duration-300 relative overflow-hidden px-3 py-1.5"
                  >
                    <motion.span
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="relative z-10"
                    >
                      {p === "day"
                        ? "Hari"
                        : p === "week"
                        ? "Minggu"
                        : p === "month"
                        ? "Bulan"
                        : "Tahun"}
                    </motion.span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </motion.div>

            <AnimatePresence mode="wait" initial={false}>
              {periods.map(
                (p) =>
                  p === period && (
                    <TabsContent key={p} value={p} forceMount asChild>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="space-y-6"
                      >
                        <SummaryCards
                          isLoading={isLoading}
                          totalSpent={animatedTotal}
                          expensesByMood={expensesByMood}
                        />
                        <DashboardCharts
                          isLoading={isLoading}
                          expenses={expenses}
                        />
                        <div className="grid gap-6 lg:grid-cols-3">
                          <div className="lg:col-span-2">
                            <RecentExpenses
                              isLoading={isLoading}
                              expenses={expenses}
                            />
                          </div>
                          <div className="lg:col-span-1">
                            <Gamification className="h-full" />
                          </div>
                        </div>
                      </motion.div>
                    </TabsContent>
                  )
              )}
            </AnimatePresence>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function SummaryCards({
  isLoading,
  totalSpent,
  expensesByMood,
}: {
  isLoading: boolean;
  totalSpent: number;
  expensesByMood: any[];
}) {
  const topMood = [...expensesByMood].sort((a, b) => b.total - a.total)[0];

  const cards = [
    {
      title: "Total Pengeluaran",
      content: isLoading ? (
        <Skeleton className="h-8 w-[120px]" />
      ) : (
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="text-2xl sm:text-3xl font-bold tabular-nums bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent"
        >
          {formatCurrency(totalSpent)}
        </motion.div>
      ),
    },
    {
      title: "Mood Teratas",
      content: isLoading ? (
        <Skeleton className="h-8 w-[120px]" />
      ) : (
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-center"
        >
          <motion.span
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
            className="text-2xl mr-3"
          >
            {topMood?.emoji}
          </motion.span>
          <div>
            <div className="font-bold text-sm sm:text-base">
              {topMood?.label}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatCurrency(topMood?.total)} ({topMood?.percentage.toFixed(0)}
              %)
            </div>
          </div>
        </motion.div>
      ),
    },
    {
      title: "Transaksi",
      content: isLoading ? (
        <Skeleton className="h-8 w-[60px]" />
      ) : (
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            delay: 0.2,
            type: "spring",
            stiffness: 200,
            damping: 15,
          }}
          className="text-2xl sm:text-3xl font-bold tabular-nums text-blue-600"
        >
          {expensesByMood.reduce((sum, m) => sum + m.count, 0)}
        </motion.div>
      ),
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex justify-between items-center pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">{card.content}</CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

function DashboardCharts({
  isLoading,
  expenses,
}: {
  isLoading: boolean;
  expenses: Expense[];
}) {
  const chartConfigs = [
    {
      title: "Pengeluaran berdasarkan Mood",
      Comp: <SpendingByMoodChart expenses={expenses} />,
    },
    {
      title: "Pengeluaran berdasarkan Kategori",
      Comp: <SpendingByCategory expenses={expenses} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {chartConfigs.map(({ title, Comp }, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-sm sm:text-base">{title}</CardTitle>
              </CardHeader>
              <CardContent className="h-[250px] sm:h-[300px]">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    >
                      <Skeleton className="h-[200px] sm:h-[250px] w-full rounded-full" />
                    </motion.div>
                  </div>
                ) : (
                  Comp
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-sm sm:text-base">
              Pengeluaran Seiring Waktu
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[250px] sm:h-[300px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Skeleton className="h-[200px] sm:h-[250px] w-full" />
              </div>
            ) : (
              <SpendingOverTime expenses={expenses} />
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

function RecentExpenses({
  isLoading,
  expenses,
}: {
  isLoading: boolean;
  expenses: Expense[];
}) {
  const recent = [...expenses]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-sm sm:text-base">
          Pengeluaran Terbaru
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <ExpenseList expenses={recent} />
        )}
      </CardContent>
    </Card>
  );
}
