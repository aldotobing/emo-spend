"use client"

import { useState, useEffect } from "react"
import type { Expense } from "@/types/expense"
import { moods } from "@/data/moods"
import { formatCurrency } from "@/lib/utils"

interface SpendingByMoodChartProps {
  expenses: Expense[]
}

export function SpendingByMoodChart({ expenses }: SpendingByMoodChartProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="h-full flex items-center justify-center">Loading chart...</div>
  }

  // Group expenses by mood
  const expensesByMood = moods
    .map((mood) => {
      const moodExpenses = expenses.filter((expense) => expense.mood === mood.id)
      const total = moodExpenses.reduce((sum, expense) => sum + expense.amount, 0)
      return {
        id: mood.id,
        name: mood.label,
        emoji: mood.emoji,
        value: total,
        color: mood.color,
      }
    })
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)

  if (expensesByMood.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No data to display</p>
      </div>
    )
  }

  // Calculate total for percentages
  const total = expensesByMood.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="h-full flex flex-col justify-center">
      <div className="space-y-4">
        {expensesByMood.map((item) => {
          const percentage = (item.value / total) * 100

          return (
            <div key={item.id} className="space-y-1">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <span className="mr-2">{item.emoji}</span>
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
                    backgroundColor: item.color,
                  }}
                ></div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
