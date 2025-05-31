'use client';

import { useState, useCallback, useEffect } from "react";
import { MoodType } from "@/types/expense";
import { useSync } from "@/hooks/use-sync";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { getExpensesByDateRange } from "@/lib/db";
import { getDateRangeForPeriod } from "@/lib/utils";
import { getIncomesByDateRange } from "@/lib/income";
import { moods } from "@/data/moods";
import type { Expense, Income } from "@/types/expense";
import { Gamification } from "@/components/gamification";
import { AnimatePresence, motion } from "framer-motion";
import { calculateFinancialHealth, type FinancialHealthScore } from "@/lib/financial-health";
import { useUser } from "@/hooks";

// Import the new modular components
import { DashboardHeader } from "@/app/components/dashboard/dashboard-header";
import { CalendarSection } from "@/app/components/dashboard/calendar-section";
import { PeriodSelectorTabs } from "@/app/components/dashboard/period-selector-tabs";
import { SummaryCards } from "@/app/components/dashboard/summary-cards";
import { DashboardCharts } from "@/app/components/dashboard/dashboard-charts";
import { RecentExpenses } from "@/app/components/dashboard/recent-expenses";

export default function Dashboard() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isHealthLoading, setIsHealthLoading] = useState(true);
  const [financialHealth, setFinancialHealth] = useState<FinancialHealthScore | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [animatedTotal, setAnimatedTotal] = useState(0);
  const [period, setPeriod] = useState<"day" | "week" | "month" | "year">("month");
  const [selectedMood, setSelectedMood] = useState<MoodType | "all">("all");

  const { user } = useUser();
  const { sync } = useSync();

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const { start, end } = getDateRangeForPeriod(period);
      
      // Get local data for immediate UI update
      const [expensesData, incomesData] = await Promise.all([
        getExpensesByDateRange(start, end),
        getIncomesByDateRange(start, end)
      ]);
      
      setExpenses(expensesData);
      setIncomes(incomesData);
      
      // Sync in background
      sync({ silent: true }).catch(error => {
        console.error("Background sync failed:", error);
      });
      
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [period, sync, user?.id]);

  useEffect(() => {
    const calculateHealth = async () => {
      if (!user?.id) {
        setFinancialHealth(null);
        setIsHealthLoading(false);
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate total spent
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Animate total when it changes
  useEffect(() => {
    if (isLoading) return;
    
    const duration = 800;
    const start = performance.now();
    const from = animatedTotal;
    const to = totalSpent;
    
    if (from === to) return;
    
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setAnimatedTotal(Math.floor(from + (to - from) * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    
    requestAnimationFrame(animate);
  }, [totalSpent, isLoading]);

  // Calculate expenses by mood for summary cards
  const expensesByMoodForSummary = moods.map((m) => {
    const filtered = expenses.filter((e) => e.mood === m.id);
    const total = filtered.reduce((s, e) => s + e.amount, 0);
    return {
      ...m,
      total,
      count: filtered.length,
      percentage: totalSpent ? (total / totalSpent) * 100 : 0,
    };
  });

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod as "day" | "week" | "month" | "year");
  };

  const handleExpenseDeleted = () => {
    fetchData();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="space-y-6 pb-32 sm:pb-6">
        <DashboardHeader
          showCalendar={showCalendar}
          onToggleCalendar={() => setShowCalendar(!showCalendar)}
          financialHealth={financialHealth}
          isHealthLoading={isHealthLoading}
        />

        <div className="px-4 sm:px-6 lg:px-8">
          <CalendarSection
            showCalendar={showCalendar}
            selectedMood={selectedMood}
            onMoodChange={setSelectedMood}
            expenses={expenses}
            isLoading={isLoading}
          />

          <Tabs
            defaultValue={period}
            value={period}
            onValueChange={handlePeriodChange}
            className="space-y-6"
          >
            <PeriodSelectorTabs
              periods={["day", "week", "month", "year"]}
              currentPeriod={period}
              onPeriodChange={handlePeriodChange}
            />

            <AnimatePresence mode="wait" initial={false}>
              <TabsContent key={period} value={period} forceMount asChild>
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
                      expensesByMood={expensesByMoodForSummary}
                      expenses={expenses}
                    />

                    <DashboardCharts
                      isLoading={isLoading}
                      expenses={expenses}
                      incomes={incomes}
                      period={period}
                    />

                    <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="h-full"
                      >
                        <RecentExpenses
                          isLoading={isLoading}
                          expenses={expenses}
                          onExpenseDeleted={handleExpenseDeleted}
                        />
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="h-full"
                      >
                        <Gamification
                          className="h-full min-h-[300px]"
                          expenses={expenses}
                          isLoading={isLoading}
                        />
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              </TabsContent>
            </AnimatePresence>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
