"use client";

import { useState, useEffect } from "react";
import type { Expense } from "@/types/expense";
import { categories } from "@/data/categories";
import { formatCurrency } from "@/lib/utils";

interface SpendingByCategoryProps {
  expenses: Expense[];
}

export function SpendingByCategory({ expenses }: SpendingByCategoryProps) {
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

  // Group expenses by category
  const expensesByCategory = categories
    .map((category) => {
      const categoryExpenses = expenses.filter(
        (expense) => expense.category === category.id
      );
      const total = categoryExpenses.reduce(
        (sum, expense) => sum + expense.amount,
        0
      );
      return {
        id: category.id,
        name: category.name,
        icon: category.icon,
        value: total,
      };
    })
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  // Generate colors for categories
  const COLORS = [
    "hsl(339, 100%, 70%)", // Light Red
    "hsl(210, 100%, 70%)", // Light Blue
    "hsl(48, 100%, 70%)", // Light Yellow
    "hsl(180, 100%, 70%)", // Light Cyan
    "hsl(270, 100%, 70%)", // Light Purple
    "hsl(30, 100%, 70%)", // Light Orange
    "hsl(120, 100%, 70%)", // Light Green
    "hsl(200, 100%, 70%)", // Light Sky Blue
    "hsl(280, 100%, 70%)", // Light Violet
    "hsl(330, 100%, 70%)", // Light Pink
  ];

  if (expensesByCategory.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-center">
        <svg className="w-12 h-12 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p className="text-sm text-gray-500">No spending data available</p>
      </div>
    );
  }

  // Calculate total for percentages
  const total = expensesByCategory.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="h-full flex flex-col justify-center overflow-auto p-4 pt-6">
      <div className="space-y-4">
        {expensesByCategory.map((item, index) => {
          const percentage = (item.value / total) * 100;
          const color = COLORS[index % COLORS.length];

          return (
            <div
              key={item.id}
              className={`space-y-1 ${index === 0 ? "mt-4" : ""}`}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <span className="mr-2">{item.icon}</span>
                  <span>{item.name}</span>
                </div>
                <div className="text-sm font-medium">
                  {formatCurrency(item.value)} ({percentage.toFixed(0)}%)
                </div>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="h-2 rounded-full"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: color,
                  }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
