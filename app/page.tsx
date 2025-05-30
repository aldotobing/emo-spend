"use client";

import { useEffect, useState, useCallback } from "react";
import { MoodType } from "@/types/expense";
import { useSync } from "@/hooks/use-sync";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { getDb, getExpensesByDateRange } from "@/lib/db";
import { getDateRangeForPeriod } from "@/lib/utils";
import { getIncomesByDateRange } from "@/lib/income";
import { moods } from "@/data/moods"; // Used in CalendarSection, but passed as prop
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
    setIsLoading(true);
    try {
      const { start, end } = getDateRangeForPeriod(period);
      
      // First, get local data for immediate UI update
      const [expensesData, incomesData] = await Promise.all([
        getExpensesByDateRange(start, end),
        getIncomesByDateRange(start, end)
      ]);
      
      setExpenses(expensesData);
      setIncomes(incomesData);
      
      // Then trigger sync in the background without awaiting it
      // This prevents blocking the UI and potential redirects
      sync({ silent: true }).catch(error => {
        console.error("Background sync failed:", error);
      });
      
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [period, sync]);

  useEffect(() => {
    const calculateHealth = async () => {
      if (!user?.id) {
        setFinancialHealth(null);
        setIsHealthLoading(false); // Ensure loading state is updated
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
  }, [user?.id, expenses, incomes]); // expenses, incomes added as deps for recalculation

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePeriodChange = (newPeriod: typeof period) => {
    setPeriod(newPeriod);
    // No need to call fetchData directly, useEffect on period will handle it.
    // sync({ silent: true }); // Sync is called in fetchData
  };

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Calculate expensesByMood for SummaryCards
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalSpent, isLoading]); // animatedTotal removed from deps to prevent re-triggering

  const periods: (typeof period)[] = ["day", "week", "month", "year"];

  // This useEffect handles live updates from IndexedDB
  useEffect(() => {
    const db = getDb();
    let mounted = true;
    let debounceTimer: NodeJS.Timeout;

    const debouncedFetchData = () => {
      if (!mounted) return;
      
      // Clear any pending debounce
      if (debounceTimer) clearTimeout(debounceTimer);
      
      // Debounce to prevent too many rapid updates
      debounceTimer = setTimeout(() => {
        if (!mounted) return;
        fetchData();
      }, 1500); // Increased to 1500ms for better debouncing
    };

    // Simple handler for database changes
    const handleDbChange = (primKey: any, obj: any) => {
      if (!mounted || !obj) return;
      
      // Skip if this is a sync operation to prevent loops
      if (obj.synced === true) return;
      
      debouncedFetchData();
    };

    // Type assertions to handle Dexie's hook types
    type DexieHook = (event: string, handler: (key: any, obj: any) => void) => (() => void) | undefined;
    
    // Subscribe to changes with type assertions
    const unsubExpensesCreate = (db.expenses?.hook as DexieHook)?.('creating', handleDbChange);
    const unsubExpensesUpdate = (db.expenses?.hook as DexieHook)?.('updating', handleDbChange);
    const unsubExpensesDelete = (db.expenses?.hook as DexieHook)?.('deleting', handleDbChange);
    
    const unsubIncomesCreate = (db.incomes?.hook as DexieHook)?.('creating', handleDbChange);
    const unsubIncomesUpdate = (db.incomes?.hook as DexieHook)?.('updating', handleDbChange);
    const unsubIncomesDelete = (db.incomes?.hook as DexieHook)?.('deleting', handleDbChange);


    return () => {
      mounted = false;
      unsubExpensesCreate?.();
      unsubExpensesUpdate?.();
      unsubExpensesDelete?.();

      unsubIncomesCreate?.();
      unsubIncomesUpdate?.();
      unsubIncomesDelete?.();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData]); // fetchData is memoized by useCallback

  const handleExpenseDeleted = () => {
    // Data will be refetched due to the DB hook, or we can call fetchData here explicitly
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
            defaultValue={period} // Control current tab via state
            value={period} // Ensure Tabs component reflects the state
            onValueChange={(v) => handlePeriodChange(v as typeof period)}
            className="space-y-6"
          >
            <PeriodSelectorTabs
              periods={periods}
              currentPeriod={period}
              onPeriodChange={handlePeriodChange}
            />

            <AnimatePresence mode="wait" initial={false}>
              {/* Render only the content for the current period */}
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
                          className="h-full min-h-[300px]" // Ensure Gamification takes full height
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