// app/page.tsx or pages/dashboard.tsx
"use client";

import { useEffect, useState } from "react";
import { MoodType } from "@/types/expense";
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
import { getDb, getExpensesByDateRange } from "@/lib/db";
import type { Expense } from "@/types/expense";
import { formatCurrency, getDateRangeForPeriod } from "@/lib/utils";
import { moods } from "@/data/moods";
import { ExpenseList } from "@/components/expense-list";
import { SpendingByMoodChart } from "@/components/spending-by-mood-chart";
import { SpendingByCategory } from "@/components/spending-by-category";
import { SpendingOverTime } from "@/components/spending-over-time";
import { SpendingByDay } from "@/components/spending-by-day";
import { Gamification } from "@/components/gamification";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarIcon } from "lucide-react";
import { EnhancedCalendar } from "@/components/enhanced-calendar";

export default function Dashboard() {
  // State for expenses and loading
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // State for period selection
  const [period, setPeriod] = useState<"day" | "week" | "month" | "year">("month");
  
  // State for animated total
  const [animatedTotal, setAnimatedTotal] = useState(0);
  
  // State for calendar visibility
  const [showCalendar, setShowCalendar] = useState(false);
  
  // State for mood filter
  const [selectedMood, setSelectedMood] = useState<MoodType | "all">("all");

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

  useEffect(() => {
    const db = getDb();
    let mounted = true;

    const handleExpenseChange = async () => {
      if (!mounted) return;
      try {
        const { start, end } = getDateRangeForPeriod(period);
        const data = await getExpensesByDateRange(start, end);
        if (mounted) {
          setExpenses(data);
        }
      } catch (error) {
        console.error('Error fetching expenses after change:', error);
      }
    };

    // Subscribe to changes
    const unsubscribe = db.expenses.hook('creating', handleExpenseChange as any) as unknown as (() => void) | undefined;

    // Initial fetch
    handleExpenseChange();

    return () => {
      mounted = false;
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [period]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Content with proper spacing for bottom nav */}
      <div className="space-y-6 pb-32 sm:pb-6">
        {/* Desktop header */}
        <div className="hidden sm:flex justify-between items-center sticky top-0 z-40 bg-background/80 backdrop-blur-md py-4 border-b border-border/50 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Dashboard
          </h1>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 h-10 px-4 rounded-xl border-border/50 bg-background/50 backdrop-blur-sm"
              onClick={() => setShowCalendar(!showCalendar)}
            >
              <CalendarIcon className="h-4 w-4" />
              {showCalendar ? 'Hide Calendar' : 'Show Calendar'}
            </Button>
            <Link href="/add">
              <Button className="shadow-lg hover:shadow-xl transition-all duration-200">
                <PlusCircle className="mr-2 h-4 w-4" />
                Tambah Pengeluaran
              </Button>
            </Link>
          </div>
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
            <Button
              variant="ghost"
              size="sm"
              className="h-10 px-3 rounded-lg gap-2"
              onClick={() => setShowCalendar(!showCalendar)}
            >
              <CalendarIcon className="h-5 w-5" />
              <span className="text-sm font-medium">
                Calendar
              </span>
            </Button>
          </motion.div>
        </div>

        <div className="px-4 sm:px-6 lg:px-8">

          {/* Calendar */}
          <AnimatePresence>
            {showCalendar && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: '1.5rem' }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden mb-6"
              >
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium">Calendar View</h3>
                        <select
                          value={selectedMood}
                          onChange={(e) => setSelectedMood(e.target.value as MoodType | "all")}
                          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value="all">All Moods</option>
                          {moods.map((mood) => (
                            <option key={mood.id} value={mood.id}>
                              {mood.emoji} {mood.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <EnhancedCalendar 
                        expenses={expenses} 
                        isLoading={isLoading}
                        selectedMood={selectedMood === "all" ? undefined : selectedMood}
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

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
              className="w-full"
            >
              <TabsList className="flex sm:grid sm:grid-cols-4 gap-1 rounded-2xl bg-muted/30 p-1.5 w-full backdrop-blur-sm border border-border/50 min-h-[42px] h-10">
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
                          expenses={expenses}
                        />
                        <DashboardCharts
                          isLoading={isLoading}
                          expenses={expenses}
                        />
                        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 w-full">
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="w-full"
                          >
                            <RecentExpenses
                              isLoading={isLoading}
                              expenses={expenses}
                              onExpenseDeleted={async () => {
                                // Refresh the dashboard data when an expense is deleted
                                const { start, end } = getDateRangeForPeriod(period);
                                const data = await getExpensesByDateRange(start, end);
                                setExpenses(data);
                              }}
                            />
                          </motion.div>
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="w-full"
                          >
                            <Gamification 
                              className="h-full" 
                              expenses={expenses}
                              isLoading={isLoading}
                            />
                          </motion.div>
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
  expenses,
}: {
  isLoading: boolean;
  totalSpent: number;
  expensesByMood: any[];
  expenses: any[];
}) {
  const topMood = [...expensesByMood].sort((a, b) => b.total - a.total)[0];

  // Calculate expenses by category
  const { categories } = require("@/data/categories");
  const expensesByCategory = categories
    .map((category: any) => {
      const categoryExpenses = expenses.filter(
        (expense: any) => expense.category === category.id
      );
      const total = categoryExpenses.reduce(
        (sum: number, expense: any) => sum + expense.amount,
        0
      );
      return {
        ...category,
        total,
        count: categoryExpenses.length,
        percentage: totalSpent ? (total / totalSpent) * 100 : 0,
      };
    })
    .filter((item: any) => item.total > 0);

  const topCategory = [...expensesByCategory].sort((a, b) => b.total - a.total)[0];

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
          className="text-xl sm:text-2xl lg:text-3xl font-bold tabular-nums bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent flex justify-center w-full"
        >
          {formatCurrency(totalSpent)}
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
          className="text-xl sm:text-2xl lg:text-3xl font-bold tabular-nums text-blue-600 flex justify-center w-full"
        >
          {expensesByMood.reduce((sum, m) => sum + m.count, 0)}
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
          className="flex items-center justify-center w-full"
        >
          <motion.span
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
            className="text-2xl mr-3"
          >
            {topMood?.emoji}
          </motion.span>
          <div>
            <div className="font-bold text-xs sm:text-sm lg:text-base">
              {topMood?.label}
            </div>
            <div className="text-xs sm:text-xs lg:text-sm text-muted-foreground">
              {formatCurrency(topMood?.total)} ({topMood?.percentage.toFixed(0)}
              %)
            </div>
          </div>
        </motion.div>
      ),
    },
    {
      title: "Kategori Teratas",
      content: isLoading ? (
        <Skeleton className="h-8 w-[120px]" />
      ) : (
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="flex items-center justify-center w-full"
        >
          <motion.span
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            className="text-2xl mr-3"
          >
            {topCategory?.icon}
          </motion.span>
          <div>
            <div className="font-bold text-xs sm:text-sm lg:text-base">
              {topCategory?.name}
            </div>
            <div className="text-xs sm:text-xs lg:text-sm text-muted-foreground">
              {formatCurrency(topCategory?.total)} ({topCategory?.percentage.toFixed(0)}
              %)
            </div>
          </div>
        </motion.div>
      ),
    },
  ];

  return (
    <div className="grid gap-3 xs:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.3 }}
          className="h-full"
        >
          <Card className="flex flex-col hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex justify-between items-center pb-2 xs:pb-3 px-3 sm:px-4 pt-3 sm:pt-4">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-3 sm:px-4 pb-3 sm:pb-4">{card.content}</CardContent>
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
            <Card className="flex flex-col hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50 bg-card/50 backdrop-blur-sm">
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
      <div className="grid gap-6 lg:grid-cols-2">
        {chartConfigs.map(({ title, Comp }, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="flex flex-col hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50 bg-card/50 backdrop-blur-sm">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="h-full"
        >
          <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-sm sm:text-base">
                Rata-rata Pengeluaran Harian
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[250px] sm:h-[300px]">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Skeleton className="h-[200px] sm:h-[250px] w-full" />
                </div>
              ) : (
                <SpendingByDay expenses={expenses} />
              )}
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="h-full"
        >
          <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50 bg-card/50 backdrop-blur-sm">
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
    </div>
  );
}

function RecentExpenses({
  isLoading,
  expenses,
  onExpenseDeleted,
}: {
  isLoading: boolean;
  expenses: Expense[];
  onExpenseDeleted?: () => void;
}) {
  const recent = [...expenses]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const handleDeleteExpense = async (id: string) => {
    try {
      const { deleteExpense } = await import('@/lib/db');
      const success = await deleteExpense(id);
      if (success && onExpenseDeleted) {
        onExpenseDeleted();
      }
      return success;
    } catch (error) {
      console.error('Error deleting expense:', error);
      return false;
    }
  };

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
          <ExpenseList 
            expenses={recent} 
            onDelete={handleDeleteExpense} 
          />
        )}
      </CardContent>
    </Card>
  );
}
