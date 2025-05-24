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
  // Create dates in local time
  const now = new Date();
  const start = new Date();
  
  // Set to start of day in local time
  start.setHours(0, 0, 0, 0);
  now.setHours(23, 59, 59, 999);

  switch (period) {
    case "day":
      // Already set to start of today
      break;
    case "week":
      // Set to start of the week (Sunday)
      start.setDate(now.getDate() - now.getDay());
      break;
    case "month":
      // Set to first day of current month
      start.setDate(1);
      break;
    case "year":
      // Set to first day of the year
      start.setMonth(0, 1);
      break;
  }

  // Convert to ISO string for database query
  return {
    start: start.toISOString().split('T')[0] + 'T00:00:00.000Z',
    end: now.toISOString()
  };
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
