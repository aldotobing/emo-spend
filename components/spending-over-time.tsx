"use client";

import { useState, useEffect, useMemo } from "react";
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
  const [animated, setAnimated] = useState(false);

  // Stabilize data processing with useMemo
  const chartData = useMemo(() => {
    if (!expenses?.length) return null;

    try {
      // Process expenses safely
      const validExpenses = expenses
        .map(expense => {
          try {
            const parsedDate = parseISO(expense.date);
            return isNaN(parsedDate.getTime()) ? null : { ...expense, parsedDate };
          } catch {
            return null;
          }
        })
        .filter((exp): exp is Expense & { parsedDate: Date } => exp !== null)
        .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());

      if (!validExpenses.length) return null;

      const startDate = startOfDay(validExpenses[0].parsedDate);
      const endDate = endOfDay(validExpenses[validExpenses.length - 1].parsedDate);
      const dateRange = eachDayOfInterval({ start: startDate, end: endDate });

      const dailyData = dateRange.map((date) => {
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);
        const dayExpenses = validExpenses.filter(exp => 
          exp.parsedDate >= dayStart && exp.parsedDate <= dayEnd
        );
        
        return {
          date: format(date, "MMM dd"),
          shortDate: format(date, "M/d"),
          dayName: format(date, "EEE"),
          total: dayExpenses.reduce((sum, exp) => sum + exp.amount, 0),
          count: dayExpenses.length
        };
      });

      const totals = dailyData.map(d => d.total);
      const maxValue = Math.max(...totals, 1);
      const totalSpending = totals.reduce((sum, val) => sum + val, 0);
      const avgSpending = totalSpending / dailyData.length;

      return { dailyData, maxValue, totalSpending, avgSpending };
    } catch (error) {
      console.error('Error processing chart data:', error);
      return null;
    }
  }, [expenses]);

  useEffect(() => {
    setMounted(true);
    // Trigger animation after component mounts
    const timer = setTimeout(() => {
      setAnimated(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) {
    return (
      <div className="h-full w-full flex items-center justify-center">
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

  const { dailyData, maxValue, totalSpending, avgSpending } = chartData;

  return (
    <div className="h-full w-full flex flex-col">
      {/* Stats Header - Compact for mobile with fade-in animation */}
      <div className={`flex-shrink-0 mb-3 sm:mb-4 transition-all duration-500 ${
        animated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Total</div>
            <div className="text-sm sm:text-base font-semibold text-primary truncate">
              {formatCurrency(totalSpending)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Rata-rata</div>
            <div className="text-sm sm:text-base font-semibold truncate">
              {formatCurrency(avgSpending)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Tertinggi</div>
            <div className="text-sm sm:text-base font-semibold text-destructive truncate">
              {formatCurrency(maxValue)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Hari</div>
            <div className="text-sm sm:text-base font-semibold">
              {dailyData.length}
            </div>
          </div>
        </div>
      </div>

      {/* Chart Area - Takes remaining height */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Bars Container - Fixed height and flex issues */}
        <div className="flex-1 flex items-end justify-center px-1 sm:px-2 mb-2 relative min-h-[120px]">
          <div className="flex items-end justify-center gap-px sm:gap-1 w-full max-w-full overflow-hidden h-full">
            {dailyData.map((day, index) => {
              // Ensure minimum height for bars with data and better calculation
              const heightPercent = maxValue > 0 
                ? Math.max((day.total / maxValue) * 100, day.total > 0 ? 5 : 2) 
                : 2;
              
              const isHighest = day.total === maxValue && day.total > 0;
              const isAboveAvg = day.total > avgSpending;
              
              return (
                <div
                  key={index}
                  className="flex flex-col items-center justify-end group relative h-full"
                  style={{ 
                    flex: '1 1 0%',
                    minWidth: dailyData.length > 20 ? '3px' : '6px',
                    maxWidth: dailyData.length > 20 ? '12px' : '24px'
                  }}
                >
                  {/* Bar with animated height */}
                  <div
                    className={`w-full transition-all duration-700 ease-out ${
                      dailyData.length > 20 ? 'rounded-t-sm' : 'rounded-t'
                    } ${
                      day.total === 0 
                        ? 'bg-gray-200' 
                        : isHighest 
                        ? 'bg-red-500 hover:bg-red-600' 
                        : isAboveAvg 
                        ? 'bg-orange-500 hover:bg-orange-600'
                        : 'bg-blue-500 hover:bg-blue-600'
                    }`}
                    style={{ 
                      height: animated ? `${heightPercent}%` : '0%',
                      minHeight: animated && day.total > 0 ? '8px' : '2px',
                      transitionDelay: `${index * 50}ms`
                    }}
                    title={`${day.date}: ${formatCurrency(day.total)}${day.count > 0 ? ` (${day.count} transaksi)` : ''}`}
                  />
                  
                  {/* Tooltip for desktop */}
                  <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 hidden sm:block">
                    <div className="bg-black text-white border rounded-md shadow-md px-2 py-1 text-xs whitespace-nowrap">
                      <div className="font-medium">{day.date}</div>
                      <div>{formatCurrency(day.total)}</div>
                      {day.count > 0 && (
                        <div className="text-gray-300">{day.count} transaksi</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Date Labels - Only for shorter periods */}
        {dailyData.length <= 15 && (
          <div className="flex-shrink-0">
            <div className="flex justify-center gap-px sm:gap-1 px-1 sm:px-2">
              {dailyData.map((day, index) => (
                <div
                  key={index}
                  className="text-center"
                  style={{ 
                    flex: '1 1 0%',
                    minWidth: '3px',
                    maxWidth: dailyData.length > 10 ? '12px' : '24px'
                  }}
                >
                  <div className="text-xs text-muted-foreground">
                    <div className="hidden sm:block text-xs">{day.dayName}</div>
                    <div className="text-xs font-medium">{day.shortDate}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex-shrink-0 mt-2 sm:mt-3">
          <div className="flex justify-center gap-3 sm:gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-sm"></div>
              <span className="text-muted-foreground">Tertinggi</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-orange-500 rounded-sm"></div>
              <span className="text-muted-foreground">Di atas rata-rata</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-sm"></div>
              <span className="text-muted-foreground">Normal</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}