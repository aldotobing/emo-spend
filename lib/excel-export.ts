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

import { getExpenses } from "@/lib/db";
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
 */
export async function exportExpensesToExcel(): Promise<Blob> {
  // Get all expenses
  const expenses = await getExpenses();

  // Sort by date (oldest first - ascending)
  expenses.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Get current date for report generation timestamp
  const generationDate = new Date();
  const formattedGenerationDate = generationDate.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Create title rows
  const titleRow = ["Spent Report"];
  const generatedDateRow = [`Generated Date : ${formattedGenerationDate}`];
  const emptyRow = [""];

  // Create worksheet data - moved Amount to the end after Notes
  const header = ["Date", "Category", "Mood", "Mood Reason", "Notes", "Amount"];
  
  // Create rows with data - moved Amount to the end
  const rows = expenses.map((expense: Expense) => {
    const category = getCategory(expense.category);
    const mood = getMood(expense.mood);

    return [
      formatDate(expense.date),
      category.name,
      mood.label,
      expense.moodReason || "",
      expense.notes || "",
      parseFloat(expense.amount.toString()), // Convert to number for Excel
    ];
  });

  // Calculate total amount
  const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  
  // Add a total row with Amount at the end
  const totalRow = ["", "", "", "", "Total", totalAmount];
  
  // Combine all data
  const wsData = [
    titleRow,
    generatedDateRow,
    emptyRow,
    header,
    ...rows,
    totalRow
  ];

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
  const wsDataWithStyles: WorksheetCell[][] = wsData.map((row, rowIndex) => 
    row.map((cell, colIndex) => ({
      v: cell,
      t: typeof cell === 'number' ? 'n' : 's',
      s: { ...defaultCellStyle }
    }))
  );

  // Title styling - override the default style for the title cell
  const titleCell = wsDataWithStyles[0][0];
  titleCell.s = {
    font: {
      bold: true,
      sz: 16,
      name: 'Arial'
    },
    alignment: {
      horizontal: 'left',
      vertical: 'middle'
    },
    border: {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    }
  };

  // Generation date styling
  const generationDateCell = wsDataWithStyles[1][0];
  generationDateCell.s = {
    font: { italic: true },
    alignment: { horizontal: 'left' },
    border: {
      top: { style: 'none', color: { rgb: '00000000' } },
      bottom: { style: 'none', color: { rgb: '00000000' } },
      left: { style: 'none', color: { rgb: '00000000' } },
      right: { style: 'none', color: { rgb: '00000000' } }
    }
  };

  // Header row styling
  const headerRowIndex = 3; // Title + Generated Date + Empty row
  wsDataWithStyles[headerRowIndex].forEach(cell => {
    cell.s = {
      fill: { fgColor: { rgb: 'BFBFBF' }, patternType: 'solid' },
      font: { bold: true, sz: 11 },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      }
    };
  });

  // Amount column formatting (last column)
  for (let i = headerRowIndex + 1; i < wsDataWithStyles.length - 1; i++) {
    const amountCell = wsDataWithStyles[i][5];
    if (amountCell) {
      amountCell.s = {
        ...amountCell.s,
        numFmt: '"Rp"#,##0.00'
      };
    }
  }

  // Total row styling
  const totalRowIndex = wsDataWithStyles.length - 1;
  
  // Style the "Total" text cell (column E)
  wsDataWithStyles[totalRowIndex][4].s = {
    font: { bold: true, sz: 11 },
    alignment: { horizontal: 'right' },
    fill: { fgColor: { rgb: 'E6E6E6' }, patternType: 'solid' },
    border: {
      top: { style: 'thin' },
      bottom: { style: 'double' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    }
  };
  
  // Style the total amount cell (column F)
  wsDataWithStyles[totalRowIndex][5].s = {
    font: { bold: true, sz: 11 },
    fill: { fgColor: { rgb: 'E6E6E6' }, patternType: 'solid' },
    border: {
      top: { style: 'thin' },
      bottom: { style: 'double' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    },
    numFmt: '"Rp"#,##0.00'
  };

  // Create worksheet from styled data
  const ws = XLSX.utils.aoa_to_sheet(wsDataWithStyles.map(row => 
    row.map(cell => cell.v)
  ));

  // Apply styles to worksheet
  wsDataWithStyles.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
      if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
      ws[cellRef].s = cell.s;
    });
  });

  // Set column widths
  ws['!cols'] = [
    { wch: 15 }, // Date
    { wch: 15 }, // Category
    { wch: 15 }, // Mood
    { wch: 25 }, // Mood Reason
    { wch: 30 }, // Notes
    { wch: 15 }, // Amount
  ];

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