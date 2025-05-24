import * as XLSX from 'xlsx';
import { getExpenses } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { getCategory } from "@/data/categories";
import { getMood } from "@/data/moods";
import type { Expense } from "@/types/expense";

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
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths - adjusted for new order
  const columnWidths = [
    { wch: 15 }, // Date
    { wch: 15 }, // Category
    { wch: 15 }, // Mood
    { wch: 25 }, // Mood Reason
    { wch: 30 }, // Notes
    { wch: 15 }, // Amount
  ];
  ws['!cols'] = columnWidths;

  // Apply styling
  // Title styling
  const titleCell = XLSX.utils.encode_cell({ r: 0, c: 0 });
  if (!ws[titleCell].s) ws[titleCell].s = {};
  ws[titleCell].s = {
    font: { bold: true, sz: 16 },
    alignment: { horizontal: "left" }
  };

  // Generation date styling
  const genDateCell = XLSX.utils.encode_cell({ r: 1, c: 0 });
  if (!ws[genDateCell].s) ws[genDateCell].s = {};
  ws[genDateCell].s = {
    font: { italic: true },
    alignment: { horizontal: "left" }
  };

  // Header styling (grey background, bold font)
  const headerRowIndex = 3; // Title + Generated Date + Empty row
  const headerRange = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
    const cellRef = XLSX.utils.encode_cell({ r: headerRowIndex, c: C });
    if (!ws[cellRef]) continue;
    
    // Create cell object if it doesn't exist
    if (!ws[cellRef].s) ws[cellRef].s = {};
    
    // Apply header styling - darker grey background
    ws[cellRef].s = {
      fill: { fgColor: { rgb: "BFBFBF" }, patternType: "solid" },
      font: { bold: true, sz: 11 },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" }
      }
    };
  }

  // Add borders to all data cells
  for (let R = headerRowIndex + 1; R < headerRowIndex + rows.length + 1; ++R) {
    for (let C = 0; C <= headerRange.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellRef]) continue;
      
      // Create cell object if it doesn't exist
      if (!ws[cellRef].s) ws[cellRef].s = {};
      
      // Apply cell borders
      ws[cellRef].s.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" }
      };

      // Format amount cells (last column) as Indonesian currency
      if (C === 5) { // Amount column (last column)
        ws[cellRef].z = '"Rp"#,##0'; // Indonesian Rupiah format
      }
    }
  }

  // Total row styling
  const totalRowIndex = headerRowIndex + rows.length; // Header row + data rows
  const totalTextCell = XLSX.utils.encode_cell({ r: totalRowIndex, c: 4 }); // "Total" text cell
  const totalAmountCell = XLSX.utils.encode_cell({ r: totalRowIndex, c: 5 }); // Amount cell
  
  // Style the "Total" text cell
  if (!ws[totalTextCell].s) ws[totalTextCell].s = {};
  ws[totalTextCell].s = {
    font: { bold: true, sz: 11 },
    alignment: { horizontal: "right" },
    fill: { fgColor: { rgb: "E6E6E6" }, patternType: "solid" },
    border: {
      top: { style: "thin" },
      bottom: { style: "double" },
      left: { style: "thin" },
      right: { style: "thin" }
    }
  };
  
  // Style the total amount cell
  if (!ws[totalAmountCell].s) ws[totalAmountCell].s = {};
  ws[totalAmountCell].s = {
    font: { bold: true, sz: 11 },
    fill: { fgColor: { rgb: "E6E6E6" }, patternType: "solid" },
    border: {
      top: { style: "thin" },
      bottom: { style: "double" },
      left: { style: "thin" },
      right: { style: "thin" }
    }
  };
  ws[totalAmountCell].z = '"Rp"#,##0'; // Indonesian Rupiah format

  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(wb, ws, "Expense Report");

  // Generate Excel file as a blob
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
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
