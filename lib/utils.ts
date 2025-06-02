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

export function formatDate(dateString: string, includeTime: boolean = false): string {
  try {
    // Create date object from the ISO string
    let date = new Date(dateString);
    
    // If the date is invalid, try to parse it as a local date string
    if (isNaN(date.getTime())) {
      // Try to parse as local date string (YYYY-MM-DD)
      const parts = dateString.split('-');
      if (parts.length === 3) {
        // Create date in local timezone
        date = new Date(
          parseInt(parts[0]),
          parseInt(parts[1]) - 1, // months are 0-indexed
          parseInt(parts[2])
        );
      }
      
      // If still invalid, return placeholder
      if (isNaN(date.getTime())) {
        console.warn('Invalid date string:', dateString);
        return 'Tanggal tidak valid';
      }
    }
    
    // Always use the user's local timezone
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
    
    if (includeTime) {
      // For time display, include hours and minutes
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.hour12 = false; // Use 24-hour format
      
      // Only include timezone if it's a full datetime
      if (dateString.includes('T')) {
        options.timeZoneName = 'short';
      }
    }
    
    // Format the date according to Indonesian locale
    return new Intl.DateTimeFormat('id-ID', options).format(date);
  } catch (error) {
    console.error('Error formatting date:', error, 'Input:', dateString);
    // Fallback to simple string representation
    return new Date(dateString).toLocaleString('id-ID');
  }
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

  // Format as YYYY-MM-DD strings for consistent date handling
  const formatDate = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  return {
    start: formatDate(start),
    end: formatDate(now)
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
