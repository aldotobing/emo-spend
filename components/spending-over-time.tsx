"use client";

import { useState, useEffect } from "react";
import type { Expense } from "@/types/expense";
import { formatCurrency } from "@/lib/utils";
import {
  format,
  parseISO,
  startOfDay,
  endOfDay,
  eachDayOfInterval,
} from "date-fns";

interface SpendingOverTimeProps {
  expenses: Expense[];
}

export function SpendingOverTime({ expenses }: SpendingOverTimeProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-full flex items-center justify-center">
        Loading chart...
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No data to display</p>
      </div>
    );
  }

  // Sort expenses by date
  const sortedExpenses = [...expenses].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Get date range
  const startDate = parseISO(sortedExpenses[0].date);
  const endDate = parseISO(sortedExpenses[sortedExpenses.length - 1].date);

  // Create array of all days in the range
  const dateRange = eachDayOfInterval({ start: startDate, end: endDate });

  // Group expenses by day
  const dailyData = dateRange.map((date) => {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    const dayExpenses = expenses.filter((expense) => {
      const expenseDate = parseISO(expense.date);
      return expenseDate >= dayStart && expenseDate <= dayEnd;
    });

    const total = dayExpenses.reduce((sum, expense) => sum + expense.amount, 0);

    return {
      date: format(date, "MMM dd"),
      total,
    };
  });

  // Find max value for scaling
  const maxValue = Math.max(...dailyData.map((d) => d.total));

  return (
    <div className="h-full flex flex-col justify-end">
      <div className="flex items-end h-[200px] gap-1">
        {dailyData.map((day, index) => {
          const height = day.total > 0 ? (day.total / maxValue) * 100 : 0;

          return (
            <div
              key={index}
              className="flex-1 flex flex-col items-center group"
              title={`${day.date}: ${formatCurrency(day.total)}`}
            >
              <div
                className="w-full bg-primary/20 hover:bg-primary/30 transition-all rounded-t"
                style={{ height: `${height}%` }}
              ></div>
              <div className="text-xs mt-1 text-muted-foreground hidden md:block">
                {day.date}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
