// components/SpendingOverTime.tsx
"use client";

import { useState, useEffect } from "react";
import type { Expense } from "@/types/expense"; // Pastikan path ini benar
import { formatCurrency } from "@/lib/utils"; // Pastikan path ini benar
import {
  format,
  parseISO,
  startOfDay,
  endOfDay,
  eachDayOfInterval,
  isValid,
} from "date-fns";

interface SpendingOverTimeProps {
  expenses: Expense[];
}

export function SpendingOverTime({ expenses }: SpendingOverTimeProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    console.log("[SpendingOverTime useEffect] Component mounted.");
  }, []);

  // Log expenses yang diterima setiap kali komponen dirender ulang (misalnya karena props expenses berubah)
  useEffect(() => {
    console.log(
      "[SpendingOverTime propsEffect] Received expenses:",
      JSON.parse(JSON.stringify(expenses || []))
    );
  }, [expenses]);

  if (!mounted) {
    console.log("[SpendingOverTime] Not mounted yet, rendering loading state.");
    return (
      <div className="h-full flex items-center justify-center">
        Loading chart...
      </div>
    );
  }

  if (!expenses || expenses.length === 0) {
    console.log(
      "[SpendingOverTime] No expenses data provided or expenses array is empty."
    );
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No expense data to display</p>
      </div>
    );
  }

  // 1. Filter out expenses with invalid dates first
  const validDateExpenses = expenses.filter((expense) => {
    try {
      const parsed = parseISO(expense.date);
      if (!isValid(parsed)) {
        console.warn(
          `[SpendingOverTime] Invalid date format for expense ID ${expense.id}: ${expense.date}. Skipping.`
        );
        return false;
      }
      return true;
    } catch (e) {
      console.error(
        `[SpendingOverTime] Error parsing date during pre-filter for expense ID ${expense.id}: ${expense.date}`,
        e
      );
      return false;
    }
  });

  if (validDateExpenses.length === 0) {
    console.log("[SpendingOverTime] No expenses with valid dates found.");
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No valid date data to display</p>
      </div>
    );
  }

  // 2. Sort expenses by date (only valid ones)
  const sortedExpenses = [...validDateExpenses].sort((a, b) => {
    // Asumsi parseISO berhasil karena sudah difilter
    return parseISO(a.date).getTime() - parseISO(b.date).getTime();
  });
  console.log(
    "[SpendingOverTime] Sorted expenses (with valid dates):",
    JSON.parse(JSON.stringify(sortedExpenses))
  );

  // 3. Get date range (from sorted valid expenses)
  // Tidak perlu cek sortedExpenses.length lagi karena sudah dicek di validDateExpenses
  const firstExpenseDateStr = sortedExpenses[0].date;
  const lastExpenseDateStr = sortedExpenses[sortedExpenses.length - 1].date;

  let startDate, endDate;
  try {
    startDate = parseISO(firstExpenseDateStr);
    endDate = parseISO(lastExpenseDateStr);
    if (!isValid(startDate) || !isValid(endDate)) {
      throw new Error("Parsed start or end date is invalid after sorting.");
    }
  } catch (e) {
    console.error(
      "[SpendingOverTime] Critical error parsing start/end date from sorted valid expenses. This should not happen.",
      e,
      { firstExpenseDateStr, lastExpenseDateStr }
    );
    return (
      <div className="h-full flex items-center justify-center text-red-500">
        Error calculating date range.
      </div>
    );
  }
  console.log("[SpendingOverTime] Calculated date range for chart:", {
    startDate,
    endDate,
  });

  // 4. Create array of all days in the range
  let dateRange: Date[] = [];
  try {
    if (isValid(startDate) && isValid(endDate) && startDate <= endDate) {
      dateRange = eachDayOfInterval({ start: startDate, end: endDate });
    } else {
      console.warn(
        "[SpendingOverTime] Invalid start/end date for eachDayOfInterval or start is after end. Start:",
        startDate,
        "End:",
        endDate
      );
    }
  } catch (e) {
    console.error(
      "[SpendingOverTime] Error creating date range with eachDayOfInterval:",
      e,
      { startDate, endDate }
    );
  }

  if (dateRange.length === 0) {
    console.log(
      "[SpendingOverTime] Date range resulted in zero days. Cannot generate daily data."
    );
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">
          Not enough data for a time range
        </p>
      </div>
    );
  }
  console.log(
    "[SpendingOverTime] Generated date range for x-axis (count):",
    dateRange.length
  );
  // console.debug("[SpendingOverTime] Full date range array:", dateRange.map(d => format(d, "yyyy-MM-dd")));

  // 5. Group expenses by day
  const dailyData = dateRange.map((currentDayDate) => {
    const dayStart = startOfDay(currentDayDate);
    const dayEnd = endOfDay(currentDayDate);

    // Filter dari sortedExpenses untuk efisiensi (meskipun filter tetap akan iterasi)
    const dayExpenses = sortedExpenses.filter((expense) => {
      // Asumsi parseISO berhasil karena sudah difilter di awal
      const expenseDate = parseISO(expense.date);
      return expenseDate >= dayStart && expenseDate <= dayEnd;
    });

    const total = dayExpenses.reduce((sum, expense) => sum + expense.amount, 0);

    // Log detail untuk setiap hari
    // console.log(`[SpendingOverTime] Processing day ${format(currentDayDate, "yyyy-MM-dd")}: Found ${dayExpenses.length} expenses, Total: ${total}`);

    return {
      dateLabel: format(currentDayDate, "MMM dd"), // Untuk label di chart
      totalAmount: total,
      expenseCount: dayExpenses.length,
      _debugDate: format(currentDayDate, "yyyy-MM-dd"), // Untuk debugging
    };
  });
  console.log(
    "[SpendingOverTime] Processed dailyData:",
    JSON.parse(JSON.stringify(dailyData))
  );

  // 6. Find max value for scaling the bars
  // Pastikan dailyData tidak kosong sebelum mencari max, dan totalAmount adalah angka
  const validTotals = dailyData.map((d) =>
    typeof d.totalAmount === "number" ? d.totalAmount : 0
  );
  const maxValue = validTotals.length > 0 ? Math.max(0, ...validTotals) : 0;
  console.log("[SpendingOverTime] Max value for Y-axis scaling:", maxValue);

  if (dailyData.length === 0) {
    // Seharusnya sudah ditangani oleh pengecekan dateRange.length
    console.log(
      "[SpendingOverTime] dailyData array is empty after processing."
    );
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No daily data points to display</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col justify-end py-4">
      {" "}
      {/* Tambahkan padding vertikal jika perlu */}
      <div className="flex items-end h-[200px] gap-1 px-2">
        {" "}
        {/* Tambahkan padding horizontal jika perlu */}
        {dailyData.map((day, index) => {
          // Kalkulasi tinggi bar
          const barHeightPercentage =
            maxValue > 0 ? (day.totalAmount / maxValue) * 100 : 0;
          // Beri tinggi minimal agar bar selalu terlihat sedikit, bahkan jika nilainya 0 (untuk visualisasi)
          // Atau set 0 jika memang ingin bar 0 tidak terlihat sama sekali
          const minVisualHeight = day.totalAmount > 0 ? 1 : 0; // min 1% jika ada total, atau 0%
          const displayHeight = Math.max(minVisualHeight, barHeightPercentage);

          // Log untuk setiap bar yang akan dirender
          if (index < 5 || index > dailyData.length - 5) {
            // Log beberapa bar awal dan akhir
            console.log(
              `[SpendingOverTime Rendering Bar] Date: ${day.dateLabel}, ` +
                `Total: ${day.totalAmount}, Count: ${day.expenseCount}, ` +
                `MaxValue: ${maxValue}, BarHeight%: ${barHeightPercentage.toFixed(
                  2
                )}, DisplayHeight%: ${displayHeight.toFixed(2)}`
            );
          }

          return (
            <div
              key={day._debugDate + "-" + index} // Gunakan key yang lebih stabil
              className="flex-1 flex flex-col items-center group relative" // Tambahkan relative untuk tooltip jika ada
              title={`${day.dateLabel}: ${formatCurrency(day.totalAmount)} (${
                day.expenseCount
              } transactions)`}
            >
              <div
                className="w-full bg-primary/20 hover:bg-primary/30 transition-all rounded-t"
                style={{ height: `${displayHeight}%` }}
                aria-label={`Spending on ${day.dateLabel} was ${formatCurrency(
                  day.totalAmount
                )}`}
              >
                {/* Anda bisa menambahkan tooltip di sini jika diperlukan */}
              </div>
              <div className="text-xs mt-1 text-muted-foreground truncate w-full text-center hidden md:block">
                {" "}
                {/* truncate untuk tanggal panjang */}
                {day.dateLabel}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
