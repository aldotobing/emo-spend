import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat("id-ID", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date)
}

export function getDateRangeForPeriod(period: "day" | "week" | "month" | "year"): { start: string; end: string } {
  const now = new Date()
  const start = new Date()

  switch (period) {
    case "day":
      start.setHours(0, 0, 0, 0)
      break
    case "week":
      start.setDate(now.getDate() - now.getDay())
      start.setHours(0, 0, 0, 0)
      break
    case "month":
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      break
    case "year":
      start.setMonth(0, 1)
      start.setHours(0, 0, 0, 0)
      break
  }

  return {
    start: start.toISOString(),
    end: now.toISOString(),
  }
}

export function generateInsights(expenses: any[]): string[] {
  if (expenses.length === 0) return []

  const insights = [
    "Kamu cenderung lebih banyak belanja ketika merasa stres di hari Senin.",
    "Pengeluaran saat bahagia paling banyak untuk makanan dan hiburan.",
    "Kamu telah mengurangi pengeluaran karena bosan sebesar 15% bulan ini.",
    "Pertimbangkan untuk membuat anggaran khusus untuk pengeluaran saat stres.",
    "Pengeluaran terbesar terjadi ketika kamu merasa kesepian.",
  ]

  // In a real app, we would analyze the data to generate real insights
  return insights.slice(0, 3)
}
