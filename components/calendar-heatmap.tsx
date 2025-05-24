"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getExpenses } from "@/lib/db";
import type { Expense } from "@/types/expense";
import { getMood } from "@/data/moods";
import {
  eachDayOfInterval,
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  addMonths,
  isToday,
  isSameMonth,
} from "date-fns";
import { id } from "date-fns/locale";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar as CalendarIcon, TrendingUp, TrendingDown } from "lucide-react";

interface CalendarHeatmapProps {
  selectedMood?: string;
  expenses: Expense[];
  isLoading: boolean;
}

export function CalendarHeatmap({ selectedMood, expenses: propExpenses, isLoading: propIsLoading }: CalendarHeatmapProps) {
  const [expenses, setExpenses] = useState<Expense[]>(propExpenses || []);
  const [isLoading, setIsLoading] = useState(propIsLoading);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [monthSummary, setMonthSummary] = useState<{
    totalSpent: number;
    highestDay: { date: Date; amount: number } | null;
    lowestDay: { date: Date; amount: number } | null;
    avgPerDay: number;
    daysWithExpenses: number;
  }>({ totalSpent: 0, highestDay: null, lowestDay: null, avgPerDay: 0, daysWithExpenses: 0 });

  useEffect(() => {
    if (propExpenses && propExpenses.length > 0) {
      // If expenses are provided as props, use them instead of fetching
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      
      // Filter expenses for the current month
      const filteredExpenses = propExpenses.filter((expense) => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= start && expenseDate <= end;
      });
      
      setExpenses(filteredExpenses);
      setIsLoading(false);
    } else {
      // Otherwise fetch expenses
      async function loadExpenses() {
        setIsLoading(true);
        try {
          const start = startOfMonth(currentMonth);
          const end = endOfMonth(currentMonth);
          const allExpenses = await getExpenses();

          // Filter expenses for the current month
          const filteredExpenses = allExpenses.filter((expense) => {
            const expenseDate = new Date(expense.date);
            return expenseDate >= start && expenseDate <= end;
          });

          setExpenses(filteredExpenses);
        } catch (error) {
          console.error("Failed to load expenses:", error);
        } finally {
          setIsLoading(false);
        }
      }

      loadExpenses();
    }
  }, [currentMonth, propExpenses, propIsLoading]);

  // Generate days for the current month
  const days = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth),
    });
  }, [currentMonth]);

  // Group expenses by day
  const expensesByDay = useMemo(() => days.map((day) => {
    const dayExpenses = expenses.filter((expense) => {
      const expenseDate = new Date(expense.date);
      return (
        expenseDate.getDate() === day.getDate() &&
        expenseDate.getMonth() === day.getMonth() &&
        expenseDate.getFullYear() === day.getFullYear() &&
        (selectedMood ? expense.mood === selectedMood : true)
      );
    });

    const totalAmount = dayExpenses.reduce(
      (sum, expense) => sum + expense.amount,
      0
    );

    // Count expenses by category
    const categoryCounts: Record<string, { count: number; amount: number }> = {};
    dayExpenses.forEach((expense) => {
      if (!categoryCounts[expense.category]) {
        categoryCounts[expense.category] = { count: 0, amount: 0 };
      }
      categoryCounts[expense.category].count += 1;
      categoryCounts[expense.category].amount += expense.amount;
    });

    // Get the dominant mood for the day
    let dominantMood = null;
    if (dayExpenses.length > 0) {
      const moodCounts: Record<string, number> = {};
      dayExpenses.forEach((expense) => {
        moodCounts[expense.mood] = (moodCounts[expense.mood] || 0) + 1;
      });

      dominantMood = Object.entries(moodCounts).reduce(
        (max, [mood, count]) => (count > max.count ? { mood, count } : max),
        { mood: "", count: 0 }
      ).mood;
    }

    return {
      date: day,
      expenses: dayExpenses,
      totalAmount,
      dominantMood,
      categoryCounts,
      expenseCount: dayExpenses.length
    };
  }), [days, expenses, selectedMood]);

  // Navigate to previous month
  const goToPreviousMonth = () => {
    setCurrentMonth((prevMonth) => subMonths(prevMonth, 1));
  };

  // Navigate to next month
  const goToNextMonth = () => {
    setCurrentMonth((prevMonth) => addMonths(prevMonth, 1));
  };

  // Get intensity level based on amount
  const getIntensityLevel = (amount: number) => {
    if (amount === 0) return 0;
    if (amount < 10000) return 1;
    if (amount < 50000) return 2;
    if (amount < 100000) return 3;
    if (amount < 200000) return 4;
    return 5;
  };
  
  // Calculate month summary
  useEffect(() => {
    if (!isLoading && expensesByDay.length > 0) {
      const daysWithExpenses = expensesByDay.filter(day => day.totalAmount > 0);
      const totalSpent = daysWithExpenses.reduce((sum, day) => sum + day.totalAmount, 0);
      
      let highestDay = daysWithExpenses.length > 0 ? daysWithExpenses[0] : null;
      let lowestDay = daysWithExpenses.length > 0 ? daysWithExpenses[0] : null;
      
      daysWithExpenses.forEach(day => {
        if (day.totalAmount > (highestDay?.totalAmount || 0)) {
          highestDay = day;
        }
        if (day.totalAmount < (lowestDay?.totalAmount || Infinity) && day.totalAmount > 0) {
          lowestDay = day;
        }
      });
      
      setMonthSummary({
        totalSpent,
        highestDay: highestDay ? { date: highestDay.date, amount: highestDay.totalAmount } : null,
        lowestDay: lowestDay ? { date: lowestDay.date, amount: lowestDay.totalAmount } : null,
        avgPerDay: daysWithExpenses.length > 0 ? totalSpent / daysWithExpenses.length : 0,
        daysWithExpenses: daysWithExpenses.length
      });
    }
  }, [isLoading, expensesByDay]);

  // Format currency helper
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Kalender Pengeluaran
          </CardTitle>
          <CardDescription>
            Visualisasi pengeluaran harian berdasarkan mood
          </CardDescription>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={goToPreviousMonth}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            &lt;
          </button>
          <span className="font-medium">
            {format(currentMonth, "MMMM yyyy", { locale: id })}
          </span>
          <button
            onClick={goToNextMonth}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            &gt;
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Month Summary */}
        {!isLoading && (
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Pengeluaran</p>
                  <p className="text-2xl font-bold">{formatCurrency(monthSummary.totalSpent)}</p>
                </div>
                {monthSummary.highestDay && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-4 w-4 text-destructive" /> Pengeluaran Tertinggi
                    </p>
                    <p className="text-xl font-bold">{formatCurrency(monthSummary.highestDay.amount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(monthSummary.highestDay.date, "EEEE, d MMMM", { locale: id })}
                    </p>
                  </div>
                )}
                {monthSummary.lowestDay && monthSummary.daysWithExpenses > 1 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <TrendingDown className="h-4 w-4 text-primary" /> Pengeluaran Terendah
                    </p>
                    <p className="text-xl font-bold">{formatCurrency(monthSummary.lowestDay.amount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(monthSummary.lowestDay.date, "EEEE, d MMMM", { locale: id })}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Rata-rata per Hari</p>
                  <p className="text-xl font-bold">{formatCurrency(monthSummary.avgPerDay)}</p>
                  <p className="text-xs text-muted-foreground">
                    Dari {monthSummary.daysWithExpenses} hari dengan pengeluaran
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {isLoading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((day) => (
              <div key={day} className="text-center text-xs font-medium py-1">
                {day}
              </div>
            ))}

            {/* Add empty cells for days before the first day of the month */}
            {Array.from({ length: days[0].getDay() }).map((_, index) => (
              <div
                key={`empty-start-${index}`}
                className="h-12 rounded-md bg-muted/20"
              />
            ))}

            {/* Calendar days */}
            {expensesByDay.map(({ date, totalAmount, dominantMood, expenseCount, categoryCounts }) => {
              const intensity = getIntensityLevel(totalAmount);
              const mood = dominantMood ? getMood(dominantMood) : null;
              const isCurrentDay = isToday(date);
              const isCurrentMonth = isSameMonth(date, currentMonth);

              // Prepare tooltip content
              const tooltipContent = totalAmount > 0 
                ? (
                  <div className="space-y-2 max-w-[200px]">
                    <p className="font-medium">{format(date, "EEEE, d MMMM yyyy", { locale: id })}</p>
                    <p className="font-bold">{formatCurrency(totalAmount)}</p>
                    <p className="text-xs">{expenseCount} transaksi</p>
                    {Object.entries(categoryCounts).length > 0 && (
                      <div className="space-y-1 mt-1">
                        <p className="text-xs font-medium">Kategori:</p>
                        {Object.entries(categoryCounts).map(([category, data]) => (
                          <div key={category} className="flex justify-between text-xs">
                            <span>{category}</span>
                            <span>{formatCurrency(data.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
                : <p>{format(date, "EEEE, d MMMM yyyy", { locale: id })}<br/>Tidak ada pengeluaran</p>;

              return (
                <TooltipProvider key={date.toISOString()}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={`relative h-14 rounded-md flex flex-col items-center justify-center cursor-pointer hover:ring-1 hover:ring-primary transition-all ${isCurrentDay ? 'ring-2 ring-primary' : ''}`}
                        style={{
                          backgroundColor: mood
                            ? `${mood.color}${intensity * 20}`
                            : isCurrentMonth ? "var(--background)" : "var(--muted)",
                          border: isCurrentDay 
                            ? "1px solid var(--primary)" 
                            : "1px solid var(--border)",
                          opacity: isCurrentMonth ? 1 : 0.7
                        }}
                      >
                        <span className={`text-xs font-medium ${isCurrentDay ? 'text-primary font-bold' : ''}`}>
                          {date.getDate()}
                        </span>
                        {totalAmount > 0 && (
                          <div className="flex flex-col items-center mt-1">
                            <span className="text-[10px] font-medium">
                              {formatCurrency(totalAmount).replace('Rp', '')}
                            </span>
                            {mood && (
                              <span className="text-[10px]">{mood.emoji}</span>
                            )}
                          </div>
                        )}
                        {isCurrentDay && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-b-md"></div>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      {tooltipContent}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}

            {/* Add empty cells for days after the last day of the month */}
            {Array.from({ length: 6 - days[days.length - 1].getDay() }).map(
              (_, index) => (
                <div
                  key={`empty-end-${index}`}
                  className="h-12 rounded-md bg-muted/20"
                />
              )
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
