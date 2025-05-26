import * as XLSX from 'xlsx-js-style';
import type { CellStyleColor } from 'xlsx-js-style';

// Define a type for our cell style that includes the properties we need
type ExcelCellStyle = {
  font?: {
    bold?: boolean;
    sz?: number;
    italic?: boolean;
    color?: CellStyleColor;
    name?: string;
    strike?: boolean;
    underline?: boolean;
    vertAlign?: 'superscript' | 'subscript';
  };
  alignment?: {
    horizontal?: 'left' | 'center' | 'right' | 'justify' | 'fill' | 'centerContinuous' | 'distributed';
    vertical?: 'top' | 'middle' | 'bottom' | 'distributed' | 'justify';
    wrapText?: boolean;
    textRotation?: number;
  };
  border?: {
    top?: { style?: string; color?: CellStyleColor };
    bottom?: { style?: string; color?: CellStyleColor };
    left?: { style?: string; color?: CellStyleColor };
    right?: { style?: string; color?: CellStyleColor };
  };
  fill?: {
    fgColor?: { rgb: string };
    patternType?: string;
  };
  numFmt?: string;
};

import { getExpenses, getExpensesByDateRange } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { getCategory } from "@/data/categories";
import { getMood } from "@/data/moods";
import type { Expense } from "@/types/expense";

// Use the ExcelCellStyle type we defined at the top of the file
type CellStyle = ExcelCellStyle;

// Define a type for worksheet cell with our custom style
type WorksheetCell = {
  v: any;
  t: string;
  s: ExcelCellStyle;
};

/**
 * Exports expenses to an Excel file with proper formatting
 * @param startDate Optional start date for filtering expenses (inclusive)
 * @param endDate Optional end date for filtering expenses (inclusive)
 */
export async function exportExpensesToExcel(
  startDate?: Date,
  endDate?: Date
): Promise<Blob> {
  // Get expenses based on date range if provided
  let expenses;
  if (startDate && endDate) {
    // Use the date range filter
    expenses = await getExpensesByDateRange(
      startDate.toISOString(),
      endDate.toISOString()
    );
  } else {
    // Get all expenses if no date range is provided
    expenses = await getExpenses();
    // Sort by date (oldest first - ascending)
    expenses.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  // Get current date for report generation timestamp
  const generationDate = new Date();
  const formattedGenerationDate = generationDate.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Format date range for display
  let dateRangeText = 'All Time';
  if (startDate && endDate) {
    const formatDate = (date: Date) => date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    dateRangeText = `${formatDate(startDate)} - ${formatDate(endDate)}`;
  }

  // Create title rows
  const titleRow = ["Spent Report"];
  const dateRangeRow = [`Date Range: ${dateRangeText}`];
  const generatedDateRow = [`Generated: ${formattedGenerationDate}`];
  const emptyRow = [""];

  // Define styles
  const headerStyle: ExcelCellStyle = {
    font: { bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '4F46E5' }, patternType: 'solid' },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: {
      top: { style: 'thin', color: { rgb: '3B3B3B' } },
      bottom: { style: 'thin', color: { rgb: '3B3B3B' } },
      left: { style: 'thin', color: { rgb: '3B3B3B' } },
      right: { style: 'thin', color: { rgb: '3B3B3B' } }
    }
  };

  const amountStyle: ExcelCellStyle = {
    numFmt: '#,##0.00',
    alignment: { horizontal: 'right' }
  };

  const dateStyle: ExcelCellStyle = {
    numFmt: 'yyyy-mm-dd',
    alignment: { horizontal: 'left' }
  };

  // Create worksheet data with headers
  const header = [
    { v: "Date", t: 's', s: headerStyle },
    { v: "Category", t: 's', s: headerStyle },
    { v: "Mood", t: 's', s: headerStyle },
    { v: "Mood Reason", t: 's', s: headerStyle },
    { v: "Notes", t: 's', s: headerStyle },
    { 
      v: "Amount", 
      t: 's', 
      s: { 
        ...headerStyle, 
        alignment: { 
          horizontal: 'right', 
          vertical: 'middle' 
        } 
      } 
    }
  ] as const;
  
  // Create rows with data and apply styles
  const rows = expenses.map((expense: Expense) => {
    const category = getCategory(expense.category);
    const mood = getMood(expense.mood);
    const categoryName = category?.name || 'Uncategorized';
    const moodLabel = mood?.label || 'Neutral';
    const amount = parseFloat(expense.amount.toString());
    const isNegative = amount < 0;

    // Create row with styled cells
    return [
      { v: new Date(expense.date), t: 'd', s: dateStyle },
      { 
        v: categoryName, 
        t: 's', 
        s: { 
          fill: { 
            fgColor: { 
              rgb: category && 'color' in category ? 
                (category as any).color : 'F3F4F6' 
            }, 
            patternType: 'solid' 
          },
          border: {
            top: { style: 'thin', color: { rgb: 'E5E7EB' } },
            bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
            left: { style: 'thin', color: { rgb: 'E5E7EB' } },
            right: { style: 'thin', color: { rgb: 'E5E7EB' } }
          }
        } 
      },
      { 
        v: moodLabel, 
        t: 's',
        s: { 
          font: { italic: true },
          border: {
            top: { style: 'thin', color: { rgb: 'E5E7EB' } },
            bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
            left: { style: 'thin', color: { rgb: 'E5E7EB' } },
            right: { style: 'thin', color: { rgb: 'E5E7EB' } }
          }
        } 
      },
      { 
        v: expense.moodReason || "-", 
        t: 's',
        s: { 
          border: {
            top: { style: 'thin', color: { rgb: 'E5E7EB' } },
            bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
            left: { style: 'thin', color: { rgb: 'E5E7EB' } },
            right: { style: 'thin', color: { rgb: 'E5E7EB' } }
          }
        } 
      },
      { 
        v: expense.notes || "-", 
        t: 's',
        s: { 
          border: {
            top: { style: 'thin', color: { rgb: 'E5E7EB' } },
            bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
            left: { style: 'thin', color: { rgb: 'E5E7EB' } },
            right: { style: 'thin', color: { rgb: 'E5E7EB' } }
          }
        } 
      },
      { 
        v: amount, 
        t: 'n', 
        s: { 
          ...amountStyle,
          font: { 
            color: { rgb: isNegative ? 'DC2626' : '10B981' },
            bold: isNegative
          },
          border: {
            top: { style: 'thin', color: { rgb: 'E5E7EB' } },
            bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
            left: { style: 'thin', color: { rgb: 'E5E7EB' } },
            right: { style: 'thin', color: { rgb: 'E5E7EB' } }
          }
        } 
      },
    ];
  });

  // Calculate total amount
  const totalAmount = expenses.reduce((sum: number, expense: Expense) => sum + expense.amount, 0);
  const isNegativeTotal = totalAmount < 0;

  // Add total row with proper typing
  const totalRow: any[] = [
    { 
      v: "TOTAL", 
      t: 's', 
      s: { 
        font: { bold: true, color: { rgb: '1F2937' } },
        fill: { fgColor: { rgb: 'F3F4F6' }, patternType: 'solid' },
        border: {
          top: { style: 'medium', color: { rgb: '9CA3AF' } },
          bottom: { style: 'double', color: { rgb: '9CA3AF' } },
          left: { style: 'thin', color: { rgb: 'E5E7EB' } },
          right: { style: 'thin', color: { rgb: 'E5E7EB' } }
        },
        alignment: { horizontal: 'right' }
      } 
    },
    { v: "", t: 's', s: { fill: { fgColor: { rgb: 'F3F4F6' }, patternType: 'solid' } } },
    { v: "", t: 's', s: { fill: { fgColor: { rgb: 'F3F4F6' }, patternType: 'solid' } } },
    { v: "", t: 's', s: { fill: { fgColor: { rgb: 'F3F4F6' }, patternType: 'solid' } } },
    { 
      v: "", 
      t: 's', 
      s: { 
        fill: { fgColor: { rgb: 'F3F4F6' }, patternType: 'solid' },
        border: {
          right: { style: 'thin', color: { rgb: 'E5E7EB' } }
        }
      } 
    },
    { 
      v: totalAmount, 
      t: 'n', 
      s: { 
        font: { 
          bold: true, 
          color: { rgb: isNegativeTotal ? 'DC2626' : '10B981' },
          size: 12
        },
        fill: { fgColor: { rgb: 'F3F4F6' }, patternType: 'solid' },
        numFmt: '#,##0.00',
        alignment: { horizontal: 'right' },
        border: {
          top: { style: 'medium', color: { rgb: '9CA3AF' } },
          bottom: { style: 'double', color: { rgb: '9CA3AF' } },
          left: { style: 'thin', color: { rgb: 'E5E7EB' } },
          right: { style: 'thin', color: { rgb: 'E5E7EB' } }
        }
      } 
    }
  ];
  
  rows.push(totalRow);

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  
  // Default cell style
  const defaultCellStyle: ExcelCellStyle = {
    font: { sz: 11 },
    border: {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    }
  };

  // Prepare data with styles
  const wsDataWithStyles: WorksheetCell[][] = [header as any, ...rows].map(row => 
    row.map((cell: WorksheetCell) => ({
      v: cell.v,
      t: typeof cell.v === 'number' ? 'n' : 's',
      s: { ...defaultCellStyle, ...cell.s }
    } as WorksheetCell))
  );

  // Create worksheet with data
  const ws = XLSX.utils.aoa_to_sheet([header as any, ...rows]);

  // Set column widths
  const colWidths = [
    { wch: 12 }, // Date
    { wch: 18 }, // Category
    { wch: 14 }, // Mood
    { wch: 28 }, // Mood Reason
    { wch: 40 }, // Notes
    { wch: 16 }, // Amount
  ];
  ws['!cols'] = colWidths;

  // Freeze header row
  ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomRight' };
  
  // Add filter to header row
  ws['!autofilter'] = { ref: 'A1:F1' };
  
  // Add conditional formatting for negative numbers (red) and positive numbers (green)
  if (ws['!ref']) {
    const range = XLSX.utils.decode_range(ws['!ref']);
    const lastRow = range.e.r;
    const amountCol = 5; // Column F (0-based index)
    
    // Apply number format to amount column
    for (let i = 1; i <= lastRow; i++) {
      const cellAddress = XLSX.utils.encode_cell({ r: i, c: amountCol });
      if (!ws[cellAddress]) continue;
      
      // Skip header and total rows
      if (i === 0 || i === lastRow) continue;
      
      const cell = ws[cellAddress] as XLSX.CellObject;
      if (!cell.s) cell.s = {};
      
      // Apply conditional number format
      if (typeof cell.v === 'number') {
        cell.s.numFmt = cell.v < 0 ? '#,##0.00;[Red]-#,##0.00' : '#,##0.00;[Green]#,##0.00';
      }
    }
  }

  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Expense Report');

  // Generate Excel file as a blob
  const excelBuffer = XLSX.write(wb, { 
    bookType: 'xlsx', 
    type: 'array',
    bookSST: false,
    cellStyles: true,
    compression: true
  });
  
  return new Blob([excelBuffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
}

/**
 * Downloads the Excel file to the user's device
 */
export function downloadExcel(blob: Blob, filename: string): void {
  // Create a URL for the blob
  const url = URL.createObjectURL(blob);

  // Create a download link
  const link = document.createElement("a");
  
  // Set link properties
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  // Add to document
  document.body.appendChild(link);

  // Click the link
  link.click();

  // Clean up
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}