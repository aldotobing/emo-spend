import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { motion } from "framer-motion";
import type { Expense } from "@/types/expense";
// Ensure categories are correctly imported or defined if used directly
// For this example, I'll assume categories are fetched or passed if needed.
// Original code used: const { categories } = require("@/data/categories");
import { categories } from "@/data/categories";


interface MoodSummary {
  id: string;
  label: string;
  emoji: string;
  total: number;
  count: number;
  percentage: number;
}

interface SummaryCardsProps {
  isLoading: boolean;
  totalSpent: number;
  expensesByMood: MoodSummary[];
  expenses: Expense[];
}

export function SummaryCards({
  isLoading,
  totalSpent,
  expensesByMood,
  expenses,
}: SummaryCardsProps) {
  const topMood = expensesByMood.length > 0
    ? [...expensesByMood].sort((a, b) => b.total - a.total)[0]
    : null;

  const expensesByCategory = categories
    .map((category: any) => {
      const categoryExpenses = expenses.filter(
        (expense) => expense.category === category.id
      );
      const total = categoryExpenses.reduce(
        (sum, expense) => sum + expense.amount,
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

  const topCategory = expensesByCategory.length > 0
    ? [...expensesByCategory].sort((a, b) => b.total - a.total)[0]
    : null;

  const cardData = [
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
              <Link href="/add"> {/* Adjusted Link to /add based on header */}
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
              <Link href="/add"> {/* Adjusted Link */}
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
              <Link href="/add"> {/* Adjusted Link */}
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
              <Link href="/add"> {/* Adjusted Link */}
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
      {cardData.map((card, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.3 }}
          className="h-full"
        >
          <Card className="flex flex-col hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50 bg-card/50 backdrop-blur-sm h-full min-h-[140px] flex justify-between">
            <CardHeader className="flex justify-between items-center pb-1 px-4 pt-3">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex items-center justify-center px-4 pb-3 pt-0">
              {card.content}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}