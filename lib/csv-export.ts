import { getExpenses } from "@/lib/db"
import { formatDate } from "@/lib/utils"
import { getCategory } from "@/data/categories"
import { getMood } from "@/data/moods"
import type { Expense } from "@/types/expense"

export async function exportExpensesToCSV(): Promise<string> {
  // Get all expenses
  const expenses = await getExpenses()

  // Sort by date (newest first)
  expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // Create CSV header
  const header = ["Date", "Amount", "Category", "Mood", "Mood Reason", "Notes"]

  // Create CSV rows
  const rows = expenses.map((expense: Expense) => {
    const category = getCategory(expense.category)
    const mood = getMood(expense.mood)

    return [
      formatDate(expense.date),
      expense.amount.toString(),
      category?.name || "",
      mood.label,
      expense.moodReason || "",
      expense.notes || "",
    ]
  })

  // Combine header and rows
  const csvContent = [
    header.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")),
  ].join("\n")

  return csvContent
}

export function downloadCSV(csvContent: string, filename: string): void {
  // Create a blob
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })

  // Create a download link
  const link = document.createElement("a")

  // Create a URL for the blob
  const url = URL.createObjectURL(blob)

  // Set link properties
  link.setAttribute("href", url)
  link.setAttribute("download", filename)
  link.style.visibility = "hidden"

  // Add to document
  document.body.appendChild(link)

  // Click the link
  link.click()

  // Clean up
  document.body.removeChild(link)
}
