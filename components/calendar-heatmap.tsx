"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getExpenses } from "@/lib/db"
import type { Expense } from "@/types/expense"
import { getMood } from "@/data/moods"
import { eachDayOfInterval, format, startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns"

interface CalendarHeatmapProps {
  selectedMood?: string
}

export function CalendarHeatmap({ selectedMood }: CalendarHeatmapProps) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  useEffect(() => {
    async function loadExpenses() {
      setIsLoading(true)
      try {
        const start = startOfMonth(currentMonth)
        const end = endOfMonth(currentMonth)
        const allExpenses = await getExpenses()

        // Filter expenses for the current month
        const filteredExpenses = allExpenses.filter((expense) => {
          const expenseDate = new Date(expense.date)
          return expenseDate >= start && expenseDate <= end
        })

        setExpenses(filteredExpenses)
      } catch (error) {
        console.error("Failed to load expenses:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadExpenses()
  }, [currentMonth])

  // Generate days for the current month
  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  })

  // Group expenses by day
  const expensesByDay = days.map((day) => {
    const dayExpenses = expenses.filter((expense) => {
      const expenseDate = new Date(expense.date)
      return (
        expenseDate.getDate() === day.getDate() &&
        expenseDate.getMonth() === day.getMonth() &&
        expenseDate.getFullYear() === day.getFullYear() &&
        (selectedMood ? expense.mood === selectedMood : true)
      )
    })

    const totalAmount = dayExpenses.reduce((sum, expense) => sum + expense.amount, 0)

    // Get the dominant mood for the day
    let dominantMood = null
    if (dayExpenses.length > 0) {
      const moodCounts: Record<string, number> = {}
      dayExpenses.forEach((expense) => {
        moodCounts[expense.mood] = (moodCounts[expense.mood] || 0) + 1
      })

      dominantMood = Object.entries(moodCounts).reduce(
        (max, [mood, count]) => (count > max.count ? { mood, count } : max),
        { mood: "", count: 0 },
      ).mood
    }

    return {
      date: day,
      expenses: dayExpenses,
      totalAmount,
      dominantMood,
    }
  })

  // Navigate to previous month
  const goToPreviousMonth = () => {
    setCurrentMonth((prevMonth) => subMonths(prevMonth, 1))
  }

  // Navigate to next month
  const goToNextMonth = () => {
    setCurrentMonth((prevMonth) => addMonths(prevMonth, 1))
  }

  // Get intensity level based on amount
  const getIntensityLevel = (amount: number) => {
    if (amount === 0) return 0
    if (amount < 10) return 1
    if (amount < 50) return 2
    if (amount < 100) return 3
    if (amount < 200) return 4
    return 5
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Spending Calendar</CardTitle>
        <div className="flex items-center space-x-2">
          <button
            onClick={goToPreviousMonth}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            &lt;
          </button>
          <span className="font-medium">{format(currentMonth, "MMMM yyyy")}</span>
          <button
            onClick={goToNextMonth}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            &gt;
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-center text-xs font-medium py-1">
                {day}
              </div>
            ))}

            {/* Add empty cells for days before the first day of the month */}
            {Array.from({ length: days[0].getDay() }).map((_, index) => (
              <div key={`empty-start-${index}`} className="h-12 rounded-md bg-muted/20" />
            ))}

            {/* Calendar days */}
            {expensesByDay.map(({ date, totalAmount, dominantMood }) => {
              const intensity = getIntensityLevel(totalAmount)
              const mood = dominantMood ? getMood(dominantMood) : null

              return (
                <div
                  key={date.toISOString()}
                  className="relative h-12 rounded-md flex flex-col items-center justify-center cursor-pointer hover:ring-1 hover:ring-primary transition-all"
                  style={{
                    backgroundColor: mood ? `${mood.color}${intensity * 20}` : "var(--background)",
                    border: "1px solid var(--border)",
                  }}
                  title={`${format(date, "MMM d")}: ${totalAmount > 0 ? `$${totalAmount.toFixed(2)}` : "No expenses"}`}
                >
                  <span className="text-xs font-medium">{date.getDate()}</span>
                  {totalAmount > 0 && (
                    <div className="flex items-center mt-1">
                      <span className="text-[10px]">${totalAmount.toFixed(0)}</span>
                      {mood && <span className="text-[10px] ml-1">{mood.emoji}</span>}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Add empty cells for days after the last day of the month */}
            {Array.from({ length: 6 - days[days.length - 1].getDay() }).map((_, index) => (
              <div key={`empty-end-${index}`} className="h-12 rounded-md bg-muted/20" />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
