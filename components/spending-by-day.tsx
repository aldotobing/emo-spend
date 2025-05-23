"use client";

import { useMemo, useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import type { Expense } from "@/types/expense";

const days = [
  { id: 0, name: "Minggu", short: "Min" },
  { id: 1, name: "Senin", short: "Sen" },
  { id: 2, name: "Selasa", short: "Sel" },
  { id: 3, name: "Rabu", short: "Rab" },
  { id: 4, name: "Kamis", short: "Kam" },
  { id: 5, name: "Jumat", short: "Jum" },
  { id: 6, name: "Sabtu", short: "Sab" },
];

interface SpendingByDayProps {
  expenses: Expense[];
}

export function SpendingByDay({ expenses }: SpendingByDayProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const chartData = useMemo(() => {
    if (!expenses?.length) return null;

    try {
      // Initialize day data with all days of the week
      const dayData = days.map(day => ({
        ...day,
        total: 0,
        count: 0,
      }));

      // Process each expense
      expenses.forEach(expense => {
        try {
          const date = parseISO(expense.date);
          if (isNaN(date.getTime())) return;
          
          const dayOfWeek = date.getDay(); // 0 (Sunday) to 6 (Saturday)
          
          // Find the day in our dayData array (should always find a match)
          const dayItem = dayData.find(d => d.id === dayOfWeek);
          if (dayItem) {
            dayItem.total += expense.amount;
            dayItem.count++;
          }
        } catch (error) {
          console.error('Error processing expense:', expense, error);
        }
      });

      // Ensure we have all 7 days, even if they have no expenses
      const completeDayData = days.map(day => {
        const existingDay = dayData.find(d => d.id === day.id);
        return existingDay || { ...day, total: 0, count: 0 };
      });

      // Sort by day of week (0-6)
      const sortedDayData = [...completeDayData].sort((a, b) => a.id - b.id);
      
      // Calculate total for percentages
      const total = sortedDayData.reduce((sum, day) => sum + day.total, 0);
      const avgPerDay = total / 7;

      return { dayData: sortedDayData, total, avgPerDay };
    } catch (error) {
      console.error('Error processing day data:', error);
      return null;
    }
  }, [expenses]);

  if (!mounted) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex space-x-1">
          {[20, 30, 25, 35, 28].map((height, i) => (
            <div 
              key={i} 
              className="w-3 bg-gray-200 rounded animate-pulse"
              style={{ height: `${height}px` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!chartData) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-center">
        <svg className="w-12 h-12 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p className="text-sm text-gray-500">No spending data available</p>
      </div>
    );
  }

  const { dayData, total, avgPerDay } = chartData;
  
  // Calculate max value for percentage scaling (use 1 if all values are 0 to avoid division by zero)
  const maxValue = Math.max(...dayData.map(day => day.total), 1);

  return (
    <div className="h-full flex flex-col overflow-y-auto p-4">
      <div className="space-y-4 min-h-0 flex-1">
        {dayData.map((day, index) => {
          // Calculate percentage based on the max value for better visualization
          const percentage = (day.total / maxValue) * 100;
          const color = `hsl(${(day.id * 50) % 360}, 70%, 60%)`; // Generate consistent colors

          return (
            <div key={day.id} className={`space-y-1 ${index === 0 ? "mt-2" : ""}`}>
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <span className="w-12 text-sm">{day.name}</span>
                </div>
                <div className="text-sm font-medium">
                  {formatCurrency(day.total)} ({percentage.toFixed(0)}%)
                </div>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="h-2 rounded-full"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            </div>
          );
        })}
        <div className="pt-2 text-sm text-muted-foreground text-center">
          Rata-rata: {formatCurrency(avgPerDay)}/hari
        </div>
      </div>
    </div>
  );
}
