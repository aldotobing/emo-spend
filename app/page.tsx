// app/page.tsx or pages/dashboard.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { MoodType } from "@/types/expense";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { useSync } from "@/hooks/use-sync";
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
import { formatCurrency, getDateRangeForPeriod } from "@/lib/utils";
import { getIncomesByDateRange } from "@/lib/income";
import { moods } from "@/data/moods";
import type { Expense, Income } from "@/types/expense";
import { ExpenseList } from "@/components/expense-list";
import { SpendingByMoodChart } from "@/components/spending-by-mood-chart";
import { SpendingByCategory } from "@/components/spending-by-category";
import { SpendingOverTime } from "@/components/spending-over-time";
import { SpendingByDay } from "@/components/spending-by-day";
import { Gamification } from "@/components/gamification";
import { IncomeExpenseChart } from "@/components/income-expense-chart";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarIcon, TrendingUp, HeartPulse } from "lucide-react";
import { EnhancedCalendar } from "@/components/enhanced-calendar";
import { FinancialHealthCard } from "@/components/financial-health-card";
import { FinancialHealthButton } from "@/components/financial-health-button";
import { calculateFinancialHealth, type FinancialHealthScore } from "@/lib/financial-health";
import { useUser } from "@/hooks";

export default function Dashboard() {
  // State for data loading and management
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isHealthLoading, setIsHealthLoading] = useState(true);
  const [financialHealth, setFinancialHealth] = useState<FinancialHealthScore | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [animatedTotal, setAnimatedTotal] = useState(0);
  
  // Period and filter state
  const [period, setPeriod] = useState<"day" | "week" | "month" | "year">("month");
  const [selectedMood, setSelectedMood] = useState<MoodType | "all">("all");
  
  // Hooks
  const { user } = useUser();
  const { sync } = useSync();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { start, end } = getDateRangeForPeriod(period);
      
      // Fetch both expenses and incomes in parallel
      const [expensesData, incomesData] = await Promise.all([
        getExpensesByDateRange(start, end),
        getIncomesByDateRange(start, end)
      ]);
      
      setExpenses(expensesData);
      setIncomes(incomesData);

      // Trigger a sync when data is loaded (in case there are pending changes)
      await sync({ silent: true });
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [period, sync]);

  // Calculate financial health when expenses or incomes change
  useEffect(() => {
    const calculateHealth = async () => {
      if (!user?.id) {
        // If user is not logged in, reset financial health
        setFinancialHealth(null);
        return;
      }
      
      setIsHealthLoading(true);
      try {
        const health = await calculateFinancialHealth(user.id, 3);
        setFinancialHealth(health);
      } catch (error) {
        console.error('Error calculating financial health:', error);
        setFinancialHealth(null);
      } finally {
        setIsHealthLoading(false);
      }
    };

    calculateHealth();
  }, [user?.id, expenses, incomes]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle period change with sync
  const handlePeriodChange = (newPeriod: typeof period) => {
    setPeriod(newPeriod);
    // Trigger a sync when changing periods to ensure we have the latest data
    sync({ silent: true });
  };

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

    const handleDataChange = async () => {
      if (!mounted) return;
      try {
        // Trigger a sync when data changes
        await sync({ silent: true });
        const { start, end } = getDateRangeForPeriod(period);
        
        // Fetch both expenses and incomes
        const [expensesData, incomesData] = await Promise.all([
          getExpensesByDateRange(start, end),
          getIncomesByDateRange(start, end)
        ]);
        
        if (mounted) {
          setExpenses(expensesData);
          setIncomes(incomesData);
        }
        
        // Calculate financial health score
        try {
          setIsHealthLoading(true);
          const healthData = await calculateFinancialHealth('current-user', 3); // 3 months lookback
          setFinancialHealth(healthData);
        } catch (error) {
          console.error("Error calculating financial health:", error);
        } finally {
          setIsHealthLoading(false);
        }
      } catch (error) {
        console.error("Error fetching data after change:", error);
      }
    };

    // Subscribe to changes in both expenses and incomes
    const unsubscribeExpenses = db.expenses.hook(
      "creating",
      handleDataChange as any
    ) as unknown as (() => void) | undefined;
      
    const unsubscribeIncomes = db.incomes?.hook(
      "creating",
      handleDataChange as any
    ) as unknown as (() => void) | undefined;

    // Initial fetch
    handleDataChange();

    return () => {
      mounted = false;
      if (typeof unsubscribeExpenses === "function") {
        unsubscribeExpenses();
      }
      if (typeof unsubscribeIncomes === "function") {
        unsubscribeIncomes();
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
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 h-10 px-4 rounded-xl border-border/50 bg-background/50 backdrop-blur-sm"
                onClick={() => setShowCalendar(!showCalendar)}
              >
                <CalendarIcon className="h-4 w-4" />
                {showCalendar ? "Hide Calendar" : "Show Calendar"}
              </Button>
              <div className="h-8 w-px bg-border mx-1"></div>
              <div className="flex items-center">
                {isHealthLoading ? (
                  <div className="h-8 w-8 rounded-full bg-muted animate-pulse"></div>
                ) : financialHealth ? (
                  <FinancialHealthButton financialHealth={financialHealth} />
                ) : null}
              </div>
            </div>
            <Link href="/add">
              <Button size="sm" className="h-10 px-4 gap-2">
                <PlusCircle className="h-4 w-4" />
                Add
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
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                {financialHealth && (
                  <FinancialHealthButton 
                    financialHealth={financialHealth} 
                    className="h-8 w-8 text-xs"
                  />
                )}
                <div className="relative group">
                  <Button
                    variant="outline"
                    size="icon"
                    className={`h-9 w-9 p-0 rounded-full flex items-center justify-center transition-all duration-200 ${showCalendar ? 'bg-accent/50 border-primary/50' : 'bg-background/80 hover:bg-accent/30'}`}
                    onClick={() => setShowCalendar(!showCalendar)}
                  >
                    <motion.div
                      animate={showCalendar ? { rotate: 90 } : { rotate: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <CalendarIcon className={`h-4 w-4 ${showCalendar ? 'text-primary' : 'text-muted-foreground'}`} />
                    </motion.div>
                    <span className="sr-only">Calendar</span>
                  </Button>
                  <div className="absolute right-0 mt-1 w-24 px-2 py-1 bg-foreground text-background text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                    {showCalendar ? 'Hide calendar' : 'Show calendar'}
                    <div className="absolute -top-1 right-2 w-2 h-2 bg-foreground transform rotate-45"></div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="px-4 sm:px-6 lg:px-8">
          {/* Calendar */}
          <AnimatePresence>
            {showCalendar && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: "auto", marginBottom: "1.5rem" }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden mb-6"
              >
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold">Calendar</h2>
                        <div className="flex items-center space-x-2">
                          <select
                            value={selectedMood}
                            onChange={(e) => setSelectedMood(e.target.value as MoodType)}
                            className="text-sm rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                          >
                            <option value="all">All Moods</option>
                            {moods.map((mood) => (
                              <option key={mood.id} value={mood.id}>
                                {mood.emoji} {mood.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <EnhancedCalendar
                        expenses={expenses}
                        isLoading={isLoading}
                        selectedMood={
                          selectedMood === "all" ? undefined : selectedMood
                        }
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
              <TabsList className="grid w-full grid-cols-4 h-10 sm:h-12 rounded-md p-1">
                {periods.map((p) => (
                  <TabsTrigger
                    key={p}
                    value={p}
                    onClick={() => handlePeriodChange(p)}
                    className="capitalize h-8 sm:h-10 w-full text-xs font-medium sm:text-base flex items-center justify-center rounded-sm min-h-[32px] sm:min-h-[40px]"
                  >
                    {p}
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
                        <div className="space-y-6">
                          <SummaryCards
                            isLoading={isLoading}
                            totalSpent={animatedTotal}
                            expensesByMood={expensesByMood}
                            expenses={expenses}
                          />

                          <DashboardCharts
                            isLoading={isLoading}
                            expenses={expenses}
                            incomes={incomes}
                            period={period}
                          />

                          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
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
  // Get top mood, but only if there are expenses with mood data
  const topMood = expensesByMood.length > 0 
    ? [...expensesByMood].sort((a, b) => b.total - a.total)[0] 
    : null;

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

  // Get top category, but only if there are expenses with category data
  const topCategory = expensesByCategory.length > 0 
    ? [...expensesByCategory].sort((a, b) => b.total - a.total)[0]
    : null;

  const cards = [
    {
      title: "Total Pengeluaran",
      content: isLoading ? (
        <Skeleton className="h-8 w-[120px]" />
      ) : expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center w-full space-y-2 py-2">
          <span className="text-2xl">💰</span>
          <div className="text-center">
            <div className="text-xs sm:text-sm text-muted-foreground">
              No expenses yet
            </div>
            <Button 
              variant="link" 
              size="sm" 
              className="h-auto p-0 text-xs text-blue-600 hover:underline"
              asChild
            >
              <Link href="/add-expense">
                Add your first expense
              </Link>
            </Button>
          </div>
        </div>
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
      ) : expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center w-full space-y-2 py-2">
          <span className="text-2xl">📊</span>
          <div className="text-center">
            <div className="text-xs sm:text-sm text-muted-foreground">
              No transactions yet
            </div>
            <Button 
              variant="link" 
              size="sm" 
              className="h-auto p-0 text-xs text-blue-600 hover:underline"
              asChild
            >
              <Link href="/add-expense">
                Add your first expense
              </Link>
            </Button>
          </div>
        </div>
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
      ) : !topMood || expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center w-full space-y-2 py-2">
          <span className="text-2xl">😐</span>
          <div className="text-center">
            <div className="text-xs sm:text-sm text-muted-foreground">
              {expenses.length === 0 ? 'No expenses yet' : 'No mood data'}
            </div>
            <Button 
              variant="link" 
              size="sm" 
              className="h-auto p-0 text-xs text-blue-600 hover:underline"
              asChild
            >
              <Link href="/add-expense">
                {expenses.length === 0 ? 'Add your first expense' : 'Add more expenses'}
              </Link>
            </Button>
          </div>
        </div>
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
            {topMood.emoji}
          </motion.span>
          <div>
            <div className="font-bold text-xs sm:text-sm lg:text-base">
              {topMood.label}
            </div>
            <div className="text-xs sm:text-xs lg:text-sm text-muted-foreground">
              {formatCurrency(topMood.total)} ({topMood.percentage.toFixed(0)}%)
            </div>
          </div>
        </motion.div>
      ),
    },
    {
      title: "Kategori Teratas",
      content: isLoading ? (
        <Skeleton className="h-8 w-[120px]" />
      ) : !topCategory || expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center w-full space-y-2 py-2">
          <span className="text-2xl">🏷️</span>
          <div className="text-center">
            <div className="text-xs sm:text-sm text-muted-foreground">
              {expenses.length === 0 ? 'No expenses yet' : 'No category data'}
            </div>
            <Button 
              variant="link" 
              size="sm" 
              className="h-auto p-0 text-xs text-blue-600 hover:underline"
              asChild
            >
              <Link href="/add-expense">
                {expenses.length === 0 ? 'Add your first expense' : 'Categorize expenses'}
              </Link>
            </Button>
          </div>
        </div>
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
            {topCategory.icon}
          </motion.span>
          <div>
            <div className="font-bold text-xs sm:text-sm lg:text-base">
              {topCategory.name}
            </div>
            <div className="text-xs sm:text-xs lg:text-sm text-muted-foreground">
              {formatCurrency(topCategory.total)} ({topCategory.percentage.toFixed(0)}%)
            </div>
          </div>
        </motion.div>
      ),
    },
  ];

  return (
    <div className="grid gap-3 xs:gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
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
            <CardContent className="pt-0 px-3 sm:px-4 pb-3 sm:pb-4">
              {card.content}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

interface DashboardChartsProps {
  isLoading: boolean;
  expenses: Expense[];
  incomes: Income[];
  period: 'day' | 'week' | 'month' | 'year';
}

function DashboardCharts({
  isLoading,
  expenses = [],
  incomes = [],
  period,
}: DashboardChartsProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        {/* Income vs Expense Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="h-full"
        >
          <div className="h-full">
            <IncomeExpenseChart 
              expenses={expenses} 
              incomes={incomes} 
              period={period} 
              isLoading={isLoading}
            />
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending by Mood */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="h-full"
        >
          <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-sm sm:text-base">
                Pengeluaran berdasarkan Mood
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] sm:h-[350px]">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Skeleton className="h-[250px] sm:h-[300px] w-full" />
                </div>
              ) : (
                <SpendingByMoodChart expenses={expenses} />
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Spending by Category */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="h-full"
        >
          <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-sm sm:text-base">
                Pengeluaran berdasarkan Kategori
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] sm:h-[350px]">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Skeleton className="h-[250px] sm:h-[300px] w-full" />
                </div>
              ) : (
                <SpendingByCategory expenses={expenses} />
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
      const { deleteExpense } = await import("@/lib/db");
      const success = await deleteExpense(id);
      if (success && onExpenseDeleted) {
        onExpenseDeleted();
      }
      return success;
    } catch (error) {
      console.error("Error deleting expense:", error);
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
          <ExpenseList expenses={recent} onDelete={handleDeleteExpense} />
        )}
      </CardContent>
    </Card>
  );
}
