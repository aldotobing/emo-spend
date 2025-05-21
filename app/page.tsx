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
// UBAH IMPOR DI SINI
import * as db from "@/lib/db";
import type { Expense } from "@/types/expense";
import { formatCurrency, getDateRangeForPeriod } from "@/lib/utils";
import { moods } from "@/data/moods";
import { ExpenseList } from "@/components/expense-list";
import { SpendingByMoodChart } from "@/components/spending-by-mood-chart";
import { SpendingByCategory } from "@/components/spending-by-category";
import { SpendingOverTime } from "@/components/spending-over-time";
import { Gamification } from "@/components/gamification";

export default function Dashboard() {
  console.log(
    "--- [Dashboard Component] --- Dashboard component rendering/rendered."
  );
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<"day" | "week" | "month" | "year">(
    "month"
  );

  useEffect(() => {
    console.log(
      "--- [Dashboard useEffect] --- useEffect for period triggered. Period:",
      period
    );
    async function loadExpenses() {
      console.log(
        "--- [Dashboard loadExpenses] --- loadExpenses function started."
      );
      setIsLoading(true);
      try {
        const { start, end } = getDateRangeForPeriod(period);
        console.log("--- [Dashboard loadExpenses] --- Date range:", {
          start,
          end,
        });

        // LOGGING DAN PEMANGGILAN YANG DIMODIFIKASI
        console.log(
          "--- [Dashboard loadExpenses] --- Imported 'db' object:",
          db
        );
        console.log(
          "--- [Dashboard loadExpenses] --- Keys in 'db' object:",
          db ? Object.keys(db) : "db is null/undefined"
        );
        console.log(
          "--- [Dashboard loadExpenses] --- typeof db.getExpensesByDateRange:",
          db ? typeof db.getExpensesByDateRange : "db is null/undefined"
        );

        if (db && typeof db.getExpensesByDateRange === "function") {
          console.log(
            "--- [Dashboard loadExpenses] --- Attempting to call db.getExpensesByDateRange()..."
          );
          const data = await db.getExpensesByDateRange(start, end);
          console.log(
            "--- [Dashboard loadExpenses] --- db.getExpensesByDateRange() call finished. Received data items:",
            data ? data.length : "null/undefined"
          );
          setExpenses(data || []); // Pastikan tidak set null/undefined ke state
        } else {
          console.error(
            "--- [Dashboard loadExpenses ERROR] --- db.getExpensesByDateRange is NOT a function or db object is problematic!"
          );
          setExpenses([]); // Set ke array kosong jika error
        }
      } catch (error) {
        console.error(
          "--- [Dashboard loadExpenses ERROR] --- Failed to load expenses:",
          error
        );
        setExpenses([]); // Set ke array kosong jika error
      } finally {
        setIsLoading(false);
        console.log(
          "--- [Dashboard loadExpenses] --- loadExpenses function finished."
        );
      }
    }

    loadExpenses();
  }, [period]);

  // ... sisa komponen Dashboard (totalSpent, expensesByMood, JSX) tetap sama ...
  const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  const expensesByMood = moods.map((mood) => {
    const moodExpenses = expenses.filter((expense) => expense.mood === mood.id);
    const total = moodExpenses.reduce(
      (sum, expense) => sum + expense.amount,
      0
    );
    return {
      id: mood.id,
      label: mood.label,
      emoji: mood.emoji,
      color: mood.color,
      total,
      count: moodExpenses.length,
      percentage: totalSpent > 0 ? (total / totalSpent) * 100 : 0,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <Link href="/add">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Tambah Pengeluaran
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="month" className="space-y-4">
        <TabsList>
          <TabsTrigger value="day" onClick={() => setPeriod("day")}>
            Hari Ini
          </TabsTrigger>
          <TabsTrigger value="week" onClick={() => setPeriod("week")}>
            Minggu Ini
          </TabsTrigger>
          <TabsTrigger value="month" onClick={() => setPeriod("month")}>
            Bulan Ini
          </TabsTrigger>
          <TabsTrigger value="year" onClick={() => setPeriod("year")}>
            Tahun Ini
          </TabsTrigger>
        </TabsList>

        {/* Konten Tabs dirender berdasarkan periode, jadi seharusnya tidak ada duplikasi JSX masif */}
        <TabsContent value={period} className="space-y-4">
          <SummaryCards
            isLoading={isLoading}
            totalSpent={totalSpent}
            expensesByMood={expensesByMood}
          />
          <DashboardCharts isLoading={isLoading} expenses={expenses} />
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <RecentExpenses isLoading={isLoading} expenses={expenses} />
            </div>
            <Gamification className="h-full" />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ... (komponen helper SummaryCards, DashboardCharts, RecentExpenses tetap sama)
// ... (Definisi komponen-komponen ini tidak saya sertakan lagi untuk keringkasan, asumsikan tidak berubah)
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
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Pengeluaran
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-[120px]" />
          ) : (
            <div className="text-2xl font-bold">
              {formatCurrency(totalSpent)}
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Mood Teratas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-[120px]" />
          ) : (
            <div className="flex items-center">
              <span className="text-2xl mr-2">{topMood?.emoji}</span>
              <div>
                <div className="font-bold">{topMood?.label}</div>
                <div className="text-xs text-muted-foreground">
                  {formatCurrency(topMood?.total)} (
                  {topMood?.percentage.toFixed(0)}%)
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Transaksi</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-[60px]" />
          ) : (
            <div className="text-2xl font-bold">
              {expensesByMood.reduce((sum, mood) => sum + mood.count, 0)}
            </div>
          )}
        </CardContent>
      </Card>
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
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Pengeluaran berdasarkan Mood</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Skeleton className="h-[250px] w-full" />
            </div>
          ) : (
            <SpendingByMoodChart expenses={expenses} />
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Pengeluaran berdasarkan Kategori</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Skeleton className="h-[250px] w-full" />
            </div>
          ) : (
            <SpendingByCategory expenses={expenses} />
          )}
        </CardContent>
      </Card>
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Pengeluaran Seiring Waktu</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Skeleton className="h-[250px] w-full" />
            </div>
          ) : (
            <SpendingOverTime expenses={expenses} />
          )}
        </CardContent>
      </Card>
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
  const recentExpenses = [...expenses]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Pengeluaran Terbaru</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array(3)
              .fill(0)
              .map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
          </div>
        ) : recentExpenses.length > 0 ? (
          <ExpenseList expenses={recentExpenses} />
        ) : (
          <div className="text-center py-6">
            <p className="text-muted-foreground">
              Belum ada pengeluaran yang dicatat.
            </p>
            <Link href="/add">
              <Button variant="link">Tambahkan pengeluaran pertamamu</Button>
            </Link>
          </div>
        )}
      </CardContent>
      {recentExpenses.length > 0 && (
        <CardFooter>
          <Link href="/expenses">
            <Button variant="outline" className="w-full">
              Lihat Semua Pengeluaran
            </Button>
          </Link>
        </CardFooter>
      )}
    </Card>
  );
}
