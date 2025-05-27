import * as XLSX from 'xlsx-js-style';
import type { CellStyleColor } from 'xlsx-js-style';
import { getIncomesByDateRange } from './income';
import { getExpensesByDateRange } from './db';
import { calculateFinancialHealth } from './financial-health';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import type { Expense } from "@/types/expense";
import type { Income } from "@/types/expense";

// Professional color palette
const COLORS = {
  primary: '1E3A8A',      // Deep Blue
  secondary: '059669',     // Emerald
  accent: 'DC2626',       // Red
  warning: 'D97706',      // Amber
  success: '16A34A',      // Green
  neutral: '6B7280',      // Gray
  light: 'F9FAFB',        // Light Gray
  white: 'FFFFFF',
  text: '1F2937'          // Dark Gray
};

// Enhanced types
interface ExcelCellStyle {
  font?: {
    bold?: boolean;
    sz?: number;
    color?: CellStyleColor;
    name?: string;
    i?: boolean;  // Italic
  };
  alignment?: {
    horizontal?: 'left' | 'center' | 'right';
    vertical?: 'top' | 'middle' | 'bottom';
    wrapText?: boolean;
  };
  fill?: {
    fgColor?: { rgb: string };
    patternType?: string;
  };
  numFmt?: string;
  border?: {
    top?: { style: string; color: { rgb: string } };
    bottom?: { style: string; color: { rgb: string } };
    left?: { style: string; color: { rgb: string } };
    right?: { style: string; color: { rgb: string } };
  };
}

interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number;
  expenseToIncomeRatio: number;
  avgMonthlyIncome: number;
  avgMonthlyExpenses: number;
  financialHealthScore?: {
    score: number;
    status: string;
    metrics: {
      savingsRate: number;
      expenseToIncomeRatio: number;
      emergencyFundMonths: number;
      discretionarySpending: number;
    };
  };
  topExpenseCategories: Array<{ category: string; amount: number; percentage: number }>;
  expensesByMood: Record<string, { amount: number; count: number; percentage: number }>;
  monthlyTrends: Array<{
    month: string;
    income: number;
    expenses: number;
    savings: number;
    savingsRate: number;
  }>;
  quarterlyAnalysis: Array<{
    quarter: string;
    income: number;
    expenses: number;
    savings: number;
    growth: number;
  }>;
  insights: string[];
}

// Professional cell creation functions
function createCell(
  value: string | number | Date | boolean,
  style: ExcelCellStyle = {}
): XLSX.CellObject {
  const defaultStyle: ExcelCellStyle = {
    font: { sz: 10, name: 'Calibri' },
    alignment: { vertical: 'middle' }
  };

  let cellValue = value;
  let cellType: XLSX.ExcelDataType = 's';

  if (typeof value === 'number') {
    cellType = 'n';
  } else if (value instanceof Date) {
    cellType = 'd';
    cellValue = value.toISOString();
  } else if (typeof value === 'boolean') {
    cellType = 'b';
  }

  return {
    v: cellValue,
    t: cellType,
    s: { ...defaultStyle, ...style }
  };
}

function createTitleCell(text: string): XLSX.CellObject {
  return createCell(text, {
    font: { bold: true, sz: 18, color: { rgb: COLORS.primary }, name: 'Calibri' },
    alignment: { horizontal: 'center', vertical: 'middle' },
    fill: { fgColor: { rgb: COLORS.light }, patternType: 'solid' },
    border: {
      bottom: { style: 'thick', color: { rgb: COLORS.primary } }
    }
  });
}

function createHeaderCell(text: string): XLSX.CellObject {
  return createCell(text, {
    font: { bold: true, color: { rgb: COLORS.white }, sz: 11, name: 'Calibri' },
    fill: { fgColor: { rgb: COLORS.primary }, patternType: 'solid' },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: {
      top: { style: 'thin', color: { rgb: COLORS.white } },
      bottom: { style: 'thin', color: { rgb: COLORS.white } },
      left: { style: 'thin', color: { rgb: COLORS.white } },
      right: { style: 'thin', color: { rgb: COLORS.white } }
    }
  });
}

function createSubHeaderCell(text: string): XLSX.CellObject {
  return createCell(text, {
    font: { bold: true, sz: 14, color: { rgb: COLORS.primary }, name: 'Calibri' },
    alignment: { horizontal: 'left', vertical: 'middle' },
    fill: { fgColor: { rgb: COLORS.light }, patternType: 'solid' },
    border: {
      bottom: { style: 'medium', color: { rgb: COLORS.primary } }
    }
  });
}

function createMetricLabelCell(text: string): XLSX.CellObject {
  return createCell(text, {
    font: { bold: true, sz: 10, color: { rgb: COLORS.text }, name: 'Calibri' },
    alignment: { horizontal: 'left', vertical: 'middle' },
    fill: { fgColor: { rgb: COLORS.light }, patternType: 'solid' }
  });
}

function createPositiveValueCell(value: number, format = '"Rp"#,##0;[Red]"Rp"#,##0'): XLSX.CellObject {
  return createCell(value, {
    numFmt: format,
    font: { bold: true, color: { rgb: value >= 0 ? COLORS.success : COLORS.accent }, sz: 10 },
    alignment: { horizontal: 'right', vertical: 'middle' }
  });
}

function createValueCell(value: number, format = '"Rp"#,##0;[Red]"Rp"#,##0'): XLSX.CellObject {
  return createCell(value, {
    numFmt: format,
    font: { sz: 10, color: { rgb: COLORS.text } },
    alignment: { horizontal: 'right', vertical: 'middle' }
  });
}

// Enhanced financial analysis
async function generateEnhancedFinancialSummary(
  expenses: Expense[],
  incomes: Income[],
  startDate: Date,
  endDate: Date
): Promise<FinancialSummary> {
  const totalIncome = incomes.reduce((sum, income) => sum + parseFloat(income.amount.toString()), 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount.toString()), 0);
  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;
  const expenseToIncomeRatio = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;

  // Calculate monthly averages
  const monthsDiff = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
  const avgMonthlyIncome = totalIncome / monthsDiff;
  const avgMonthlyExpenses = totalExpenses / monthsDiff;

  // Enhanced category analysis
  const categoryTotals = expenses.reduce((acc, expense) => {
    const category = expense.category || 'Uncategorized';
    acc[category] = (acc[category] || 0) + parseFloat(expense.amount.toString());
    return acc;
  }, {} as Record<string, number>);

  const topExpenseCategories = Object.entries(categoryTotals)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: (amount / totalExpenses) * 100
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  // Mood analysis with percentages
  const expensesByMood = expenses.reduce((acc, expense) => {
    const mood = expense.mood || 'Neutral';
    if (!acc[mood]) {
      acc[mood] = { amount: 0, count: 0, percentage: 0 };
    }
    acc[mood].amount += parseFloat(expense.amount.toString());
    acc[mood].count++;
    return acc;
  }, {} as Record<string, { amount: number; count: number; percentage: number }>);

  // Calculate mood percentages
  Object.keys(expensesByMood).forEach(mood => {
    expensesByMood[mood].percentage = (expensesByMood[mood].amount / totalExpenses) * 100;
  });

  // Enhanced monthly trends
  const monthlyTrends = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    
    const monthIncomes = incomes
      .filter(income => {
        const incomeDate = new Date(income.date);
        return incomeDate >= monthStart && incomeDate <= monthEnd;
      })
      .reduce((sum, income) => sum + parseFloat(income.amount.toString()), 0);

    const monthExpenses = expenses
      .filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= monthStart && expenseDate <= monthEnd;
      })
      .reduce((sum, expense) => sum + parseFloat(expense.amount.toString()), 0);

    const monthSavings = monthIncomes - monthExpenses;
    const monthSavingsRate = monthIncomes > 0 ? (monthSavings / monthIncomes) * 100 : 0;

    monthlyTrends.push({
      month: format(monthStart, 'MMM yyyy'),
      income: monthIncomes,
      expenses: monthExpenses,
      savings: monthSavings,
      savingsRate: monthSavingsRate
    });

    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  // Quarterly analysis
  const quarterlyAnalysis = [];
  const quarters = [];
  for (let i = 0; i < monthlyTrends.length; i += 3) {
    const quarterMonths = monthlyTrends.slice(i, i + 3);
    if (quarterMonths.length > 0) {
      const qIncome = quarterMonths.reduce((sum, month) => sum + month.income, 0);
      const qExpenses = quarterMonths.reduce((sum, month) => sum + month.expenses, 0);
      const qSavings = qIncome - qExpenses;
      
      quarters.push({
        quarter: `Q${Math.floor(i / 3) + 1} ${quarterMonths[0].month.split(' ')[1]}`,
        income: qIncome,
        expenses: qExpenses,
        savings: qSavings,
        growth: 0 // Will calculate after all quarters
      });
    }
  }

  // Calculate quarter-over-quarter growth
  for (let i = 1; i < quarters.length; i++) {
    const prevSavings = quarters[i-1].savings;
    const currentSavings = quarters[i].savings;
    quarters[i].growth = prevSavings !== 0 ? ((currentSavings - prevSavings) / Math.abs(prevSavings)) * 100 : 0;
  }

  // Generate insights
  const insights = [];
  
  if (savingsRate > 20) {
    insights.push("🎯 Excellent savings rate! You're saving over 20% of your income.");
  } else if (savingsRate > 10) {
    insights.push("✅ Good savings rate. Consider increasing to 20% for optimal financial health.");
  } else if (savingsRate > 0) {
    insights.push("⚠️ Low savings rate. Aim for at least 10-20% of income.");
  } else {
    insights.push("🚨 Negative savings detected. Review expenses to improve financial position.");
  }

  if (topExpenseCategories.length > 0) {
    const topCategory = topExpenseCategories[0];
    insights.push(`💡 Top spending category: ${topCategory.category} (${topCategory.percentage.toFixed(1)}% of expenses)`);
  }

  const avgMonthlySavings = monthlyTrends.reduce((sum, month) => sum + month.savings, 0) / monthlyTrends.length;
  if (avgMonthlySavings > 0) {
    const yearlyProjection = avgMonthlySavings * 12;
    insights.push(`📈 At current rate, you'll save Rp${yearlyProjection.toFixed(0)} annually.`);
  }

  // Calculate financial health score
  const healthScore = await calculateFinancialHealth('current-user', 3); // Replace with actual user ID

  return {
    totalIncome,
    totalExpenses,
    netSavings,
    savingsRate,
    expenseToIncomeRatio,
    avgMonthlyIncome,
    avgMonthlyExpenses,
    financialHealthScore: {
      score: healthScore.score,
      status: getHealthGrade(healthScore.score),
      metrics: healthScore.metrics
    },
    topExpenseCategories,
    expensesByMood,
    monthlyTrends,
    quarterlyAnalysis: quarters,
    insights
  };
}

// Create executive summary worksheet
function createExecutiveSummaryWorksheet(summary: FinancialSummary, startDate: Date, endDate: Date) {
  const ws: XLSX.WorkSheet = {};
  const rows: any[][] = [];

  // Report Header
  rows.push([createTitleCell('FINANCIAL ANALYSIS REPORT')]);
  rows.push([createCell(`Analysis Period: ${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}`, {
    font: { sz: 12, color: { rgb: COLORS.neutral }, i: true },
    alignment: { horizontal: 'center' }
  })]);
  rows.push([createCell(`Generated on: ${format(new Date(), 'MMMM dd, yyyy')}`, {
    font: { sz: 10, color: { rgb: COLORS.neutral } },
    alignment: { horizontal: 'center' }
  })]);
  rows.push([{ v: '', t: 's' }]); // Empty row

  // Key Performance Indicators
  rows.push([createSubHeaderCell('KEY PERFORMANCE INDICATORS')]);
  rows.push([{ v: '', t: 's' }]); // Empty row
  
  const kpiData = [
    ['Total Income', summary.totalIncome, '$'],
    ['Total Expenses', summary.totalExpenses, '$'],
    ['Net Savings', summary.netSavings, '$'],
    ['Savings Rate', summary.savingsRate, '%'],
    ['Expense Ratio', summary.expenseToIncomeRatio, '%'],
    ['Avg Monthly Income', summary.avgMonthlyIncome, '$'],
    ['Avg Monthly Expenses', summary.avgMonthlyExpenses, '$'],
    ['Financial Health Score', summary.financialHealthScore?.score, ''],
  ];

  kpiData.forEach(([label, value, unit]) => {
    rows.push([
      createMetricLabelCell(label as string),
      unit === '$' ? createPositiveValueCell(value as number) : 
                    createPositiveValueCell((value as number) / (unit === '%' ? 100 : 1), unit === '%' ? '0.00%' : '#,##0.00')
    ]);
  });

  rows.push([{ v: '', t: 's' }]); // Empty row

  // Top Expense Categories
  rows.push([createSubHeaderCell('TOP EXPENSE CATEGORIES')]);
  rows.push([{ v: '', t: 's' }]); // Empty row
  rows.push([
    createHeaderCell('Category'),
    createHeaderCell('Amount'),
    createHeaderCell('% of Total')
  ]);

  summary.topExpenseCategories.forEach(category => {
    rows.push([
      createCell(category.category),
      createValueCell(category.amount),
      createValueCell(category.percentage / 100, '0.0%')
    ]);
  });

  rows.push([{ v: '', t: 's' }]); // Empty row

  // Insights Section
  rows.push([createSubHeaderCell('KEY INSIGHTS & RECOMMENDATIONS')]);
  rows.push([{ v: '', t: 's' }]); // Empty row
  
  summary.insights.forEach(insight => {
    rows.push([createCell(insight, {
      font: { sz: 10, color: { rgb: COLORS.text } },
      alignment: { horizontal: 'left', wrapText: true }
    })]);
  });

  // Add data to worksheet
  XLSX.utils.sheet_add_aoa(ws, rows);
  
  // Set column widths and row heights
  ws['!cols'] = [{ wch: 35 }, { wch: 20 }, { wch: 15 }];
  ws['!rows'] = [
    { hpt: 30 }, // Title row
    { hpt: 20 }, // Date row
    { hpt: 15 }, // Generated row
    { hpt: 10 }, // Empty
    { hpt: 25 }, // KPI header
  ];
  
  // Merge cells for title
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }, // Title
    { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } }, // Date range
    { s: { r: 2, c: 0 }, e: { r: 2, c: 2 } }  // Generated date
  ];
  
  return ws;
}

// Create detailed expenses worksheet
function createDetailedExpensesWorksheet(expenses: Expense[]) {
  const ws: XLSX.WorkSheet = {};
  const rows: any[][] = [];

  // Header
  rows.push([createTitleCell('DETAILED EXPENSE ANALYSIS')]);
  rows.push([{ v: '', t: 's' }]); // Empty row

  // Table headers
  rows.push([
    createHeaderCell('Date'),
    createHeaderCell('Description'),
    createHeaderCell('Category'),
    createHeaderCell('Amount'),
    createHeaderCell('Mood'),
    createHeaderCell('Payment Method')
  ]);

  // Sort expenses by date (newest first)
  const sortedExpenses = [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Data rows with alternating colors
  sortedExpenses.forEach((expense, index) => {
    const isEvenRow = index % 2 === 0;
    const rowStyle = {
      fill: { fgColor: { rgb: isEvenRow ? COLORS.white : COLORS.light }, patternType: 'solid' }
    };

    rows.push([
      createCell(new Date(expense.date), { 
        numFmt: 'mm/dd/yyyy',
        ...rowStyle
      }),
      createCell(expense.notes || '', {
        alignment: { horizontal: 'left', wrapText: true },
        ...rowStyle
      }),
      createCell(expense.category || 'Uncategorized', rowStyle),
      createCell(parseFloat(expense.amount.toString()), { 
        numFmt: '"Rp"#,##0',
        font: { color: { rgb: COLORS.accent } },
        ...rowStyle
      }),
      createCell(expense.mood || 'Neutral', rowStyle),
      createCell('Card', rowStyle) // Assuming default payment method
    ]);
  });

  // Add total row
  const totalExpenses = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount.toString()), 0);
  rows.push([
    createCell('TOTAL', { font: { bold: true, sz: 11 } }),
    createCell(''),
    createCell(''),
    createCell(totalExpenses, { 
      numFmt: '"Rp"#,##0',
      font: { bold: true, color: { rgb: COLORS.accent } },
      border: { top: { style: 'thick', color: { rgb: COLORS.primary } } }
    }),
    createCell(''),
    createCell('')
  ]);

  // Add data to worksheet
  XLSX.utils.sheet_add_aoa(ws, rows);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 12 }, // Date
    { wch: 40 }, // Description
    { wch: 20 }, // Category
    { wch: 15 }, // Amount
    { wch: 15 }, // Mood
    { wch: 18 }  // Payment Method
  ];

  // Merge title cell
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }
  ];
  
  return ws;
}

// Create income analysis worksheet
function createIncomeAnalysisWorksheet(incomes: Income[]) {
  const ws: XLSX.WorkSheet = {};
  const rows: any[][] = [];

  // Header
  rows.push([createTitleCell('INCOME ANALYSIS')]);
  rows.push([{ v: '', t: 's' }]); // Empty row

  // Table headers
  rows.push([
    createHeaderCell('Date'),
    createHeaderCell('Description'),
    createHeaderCell('Source'),
    createHeaderCell('Amount'),
    createHeaderCell('Type')
  ]);

  // Sort incomes by date (newest first)
  const sortedIncomes = [...incomes].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Data rows
  sortedIncomes.forEach((income, index) => {
    const isEvenRow = index % 2 === 0;
    const rowStyle = {
      fill: { fgColor: { rgb: isEvenRow ? COLORS.white : COLORS.light }, patternType: 'solid' }
    };

    rows.push([
      createCell(new Date(income.date), { 
        numFmt: 'mm/dd/yyyy',
        ...rowStyle
      }),
      createCell(income.description || '', {
        alignment: { horizontal: 'left', wrapText: true },
        ...rowStyle
      }),
      createCell(income.source || 'Other', rowStyle),
      createCell(parseFloat(income.amount.toString()), { 
        numFmt: '"Rp"#,##0',
        font: { color: { rgb: COLORS.success } },
        ...rowStyle
      }),
      createCell('Regular', rowStyle) // Assuming default type
    ]);
  });

  // Add total row
  const totalIncome = incomes.reduce((sum, income) => sum + parseFloat(income.amount.toString()), 0);
  rows.push([
    createCell('TOTAL', { font: { bold: true, sz: 11 } }),
    createCell(''),
    createCell(''),
    createCell(totalIncome, { 
      numFmt: '"Rp"#,##0',
      font: { bold: true, color: { rgb: COLORS.success } },
      border: { top: { style: 'thick', color: { rgb: COLORS.primary } } }
    }),
    createCell('')
  ]);

  // Add data to worksheet
  XLSX.utils.sheet_add_aoa(ws, rows);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 12 }, // Date
    { wch: 40 }, // Description
    { wch: 20 }, // Source
    { wch: 15 }, // Amount
    { wch: 15 }  // Type
  ];

  // Merge title cell
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }
  ];
  
  return ws;
}

// Create trends and forecasting worksheet
function createTrendsAnalysisWorksheet(summary: FinancialSummary) {
  const ws: XLSX.WorkSheet = {};
  const rows: any[][] = [];

  // Header
  rows.push([createTitleCell('TRENDS & FORECASTING ANALYSIS')]);
  rows.push([{ v: '', t: 's' }]); // Empty row

  // Monthly Trends Section
  rows.push([createSubHeaderCell('MONTHLY TRENDS')]);
  rows.push([{ v: '', t: 's' }]); // Empty row
  
  rows.push([
    createHeaderCell('Month'),
    createHeaderCell('Income'),
    createHeaderCell('Expenses'),
    createHeaderCell('Net Savings'),
    createHeaderCell('Savings Rate'),
    createHeaderCell('Trend')
  ]);

  summary.monthlyTrends.forEach((trend, index) => {
    const prevTrend = index > 0 ? summary.monthlyTrends[index - 1] : null;
    const trendDirection = prevTrend ? 
      (trend.savings > prevTrend.savings ? '↗️ Up' : 
       trend.savings < prevTrend.savings ? '↘️ Down' : '➡️ Flat') : '➡️ Base';

    rows.push([
      createCell(trend.month),
      createValueCell(trend.income, '"Rp"#,##0'),
      createValueCell(trend.expenses, '"Rp"#,##0'),
      createPositiveValueCell(trend.savings, '"Rp"#,##0'),
      createPositiveValueCell(trend.savingsRate / 100, '0.0%'),
      createCell(trendDirection)
    ]);
  });

  rows.push([{ v: '', t: 's' }]); // Empty row

  // Quarterly Analysis Section
  if (summary.quarterlyAnalysis.length > 0) {
    rows.push([createSubHeaderCell('QUARTERLY PERFORMANCE')]);
    rows.push([{ v: '', t: 's' }]); // Empty row
    
    rows.push([
      createHeaderCell('Quarter'),
      createHeaderCell('Income'),
      createHeaderCell('Expenses'),
      createHeaderCell('Net Savings'),
      createHeaderCell('QoQ Growth')
    ]);

    summary.quarterlyAnalysis.forEach(quarter => {
      rows.push([
        createCell(quarter.quarter),
        createValueCell(quarter.income, '"Rp"#,##0'),
        createValueCell(quarter.expenses, '"Rp"#,##0'),
        createPositiveValueCell(quarter.savings, '"Rp"#,##0'),
        createPositiveValueCell(quarter.growth / 100, '0.0%')
      ]);
    });
  }

  // Add data to worksheet
  XLSX.utils.sheet_add_aoa(ws, rows);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 15 }, // Month/Quarter
    { wch: 15 }, // Income
    { wch: 15 }, // Expenses
    { wch: 15 }, // Savings
    { wch: 15 }, // Rate/Growth
    { wch: 12 }  // Trend
  ];

  // Merge title cell
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }
  ];
  
  return ws;
}

// Main export function with enhanced features
export async function exportExpensesToExcel(
  startDate = new Date(0),
  endDate = new Date()
): Promise<Blob> {
  try {
    const startDateStr = startDate.toISOString();
    const endDateStr = endDate.toISOString();
    
    const [expenses, incomes] = await Promise.all([
      getExpensesByDateRange(startDateStr, endDateStr),
      getIncomesByDateRange(startDateStr, endDateStr)
    ]);

    // Generate enhanced financial summary
    const summary = await generateEnhancedFinancialSummary(expenses, incomes, startDate, endDate);

    // Create workbook with professional styling
    const wb = XLSX.utils.book_new();
    
    // Set workbook properties
    wb.Props = {
      Title: "Financial Analysis Report",
      Subject: "Personal Finance Analysis",
      Author: "Financial Analysis System",
      CreatedDate: new Date()
    };

    // Add worksheets in logical order for maximum impact
    XLSX.utils.book_append_sheet(wb, createExecutiveSummaryWorksheet(summary, startDate, endDate), '📊 Executive Summary');
    XLSX.utils.book_append_sheet(wb, createDashboardWorksheet(summary, startDate, endDate), '📈 Dashboard');
    XLSX.utils.book_append_sheet(wb, createTrendsAnalysisWorksheet(summary), '📉 Trends & Forecasting');
    XLSX.utils.book_append_sheet(wb, createBudgetComparisonWorksheet(summary, expenses), '🎯 Budget Analysis');
    XLSX.utils.book_append_sheet(wb, createDetailedExpensesWorksheet(expenses), '💳 Detailed Expenses');
    XLSX.utils.book_append_sheet(wb, createIncomeAnalysisWorksheet(incomes), '💰 Income Analysis');

    // Generate Excel file with enhanced options
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
    
  } catch (error) {
    console.error('Error generating professional Excel report:', error);
    throw new Error(`Failed to generate Excel report: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Enhanced download helper with better filename
export function downloadExcel(blob: Blob, customFilename?: string): void {
  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm');
  const filename = customFilename || `Financial_Analysis_Report_${timestamp}.xlsx`;
  
  const url = URL.createObjectURL(blob);
  
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Show success message (optional)
    console.log(`✅ Financial report downloaded successfully: ${filename}`);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Utility function to generate report for different periods
export function generateQuickReport(period: 'month' | 'quarter' | 'year' | 'ytd'): Promise<Blob> {
  const now = new Date();
  let startDate: Date;
  
  switch (period) {
    case 'month':
      startDate = startOfMonth(now);
      break;
    case 'quarter':
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      startDate = new Date(now.getFullYear(), quarterStartMonth, 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    case 'ytd':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      startDate = subMonths(now, 12);
  }
  
  return exportExpensesToExcel(startDate, now);
}

// Create comprehensive dashboard worksheet
function createDashboardWorksheet(summary: FinancialSummary, startDate: Date, endDate: Date) {
  const ws: XLSX.WorkSheet = {};
  const rows: any[][] = [];

  // Header
  rows.push([createTitleCell('FINANCIAL DASHBOARD')]);
  rows.push([{ v: '', t: 's' }]);

  // Financial Health Score
  if (summary.financialHealthScore) {
    rows.push([createSubHeaderCell('FINANCIAL HEALTH SCORE')]);
    rows.push([{ v: '', t: 's' }]);
    
    const healthGrade = getHealthGrade(summary.financialHealthScore.score);
    const healthColor = getHealthScoreColor(summary.financialHealthScore.score);
    
    rows.push([
      createMetricLabelCell('Overall Score'),
      { v: '', t: 's' },
      createCell(summary.financialHealthScore.score, {
        font: { bold: true, sz: 24, color: { rgb: healthColor } },
        alignment: { horizontal: 'center' }
      }),
      { v: '', t: 's' },
      createCell(`Grade: ${healthGrade}`, {
        font: { bold: true, color: { rgb: healthColor } },
        alignment: { horizontal: 'center' }
      })
    ]);
    
    rows.push([{ v: '', t: 's' }]);
    
    // Metrics breakdown
    rows.push([
      createMetricLabelCell('Savings Rate'),
      { v: '', t: 's' },
      createCell(`${summary.financialHealthScore.metrics.savingsRate}%`)
    ]);
    
    rows.push([
      createMetricLabelCell('Expense Ratio'),
      { v: '', t: 's' },
      createCell(`${summary.financialHealthScore.metrics.expenseToIncomeRatio}%`)
    ]);
    
    rows.push([
      createMetricLabelCell('Emergency Fund'),
      { v: '', t: 's' },
      createCell(`${summary.financialHealthScore.metrics.emergencyFundMonths} months`)
    ]);
    
    rows.push([
      createMetricLabelCell('Discretionary'),
      { v: '', t: 's' },
      createCell(`${summary.financialHealthScore.metrics.discretionarySpending}%`)
    ]);
    
    rows.push([{ v: '', t: 's' }]);
  }

  // Monthly Performance Chart Data
  rows.push([createSubHeaderCell('MONTHLY PERFORMANCE CHART DATA')]);
  rows.push([{ v: '', t: 's' }]);
  
  rows.push([
    createHeaderCell('Month'),
    createHeaderCell('Income'),
    createHeaderCell('Expenses'),
    createHeaderCell('Savings'),
    createHeaderCell('Cumulative Savings')
  ]);

  let cumulativeSavings = 0;
  summary.monthlyTrends.forEach(trend => {
    cumulativeSavings += trend.savings;
    rows.push([
      createCell(trend.month),
      createValueCell(trend.income, '"Rp"#,##0'),
      createValueCell(trend.expenses, '"Rp"#,##0'),
      createPositiveValueCell(trend.savings, '"Rp"#,##0'),
      createValueCell(cumulativeSavings, '"Rp"#,##0')
    ]);
  });

  rows.push([{ v: '', t: 's' }]);

  // Mood vs Spending Analysis
  rows.push([createSubHeaderCell('EMOTIONAL SPENDING ANALYSIS')]);
  rows.push([{ v: '', t: 's' }]);
  
  rows.push([
    createHeaderCell('Mood'),
    createHeaderCell('Amount Spent'),
    createHeaderCell('# of Transactions'),
    createHeaderCell('Avg per Transaction'),
    createHeaderCell('% of Total')
  ]);

  Object.entries(summary.expensesByMood)
    .sort(([,a], [,b]) => b.amount - a.amount)
    .forEach(([mood, data]) => {
      const avgPerTransaction = data.count > 0 ? data.amount / data.count : 0;
      rows.push([
        createCell(mood),
        createValueCell(data.amount, '"Rp"#,##0'),
        createCell(data.count),
        createValueCell(avgPerTransaction, '"Rp"#,##0'),
        createValueCell(data.percentage / 100, '0.0%')
      ]);
    });

  // Add data to worksheet
  XLSX.utils.sheet_add_aoa(ws, rows);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 20 }, // Main column
    { wch: 5 },  // Spacer
    { wch: 25 }, // Right column
    { wch: 15 }, // Data column
    { wch: 18 }  // Data column
  ];

  // Merge title cell
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }
  ];
  
  return ws;
}

// Helper function for health grade
function getHealthGrade(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

// Helper function for health score colors
function getHealthScoreColor(score: number): string {
  if (score >= 80) return COLORS.success;
  if (score >= 65) return COLORS.secondary;
  if (score >= 50) return COLORS.warning;
  return COLORS.accent;
}

// Create budget vs actual comparison worksheet
function createBudgetComparisonWorksheet(summary: FinancialSummary, expenses: Expense[]) {
  const ws: XLSX.WorkSheet = {};
  const rows: any[][] = [];

  // Header
  rows.push([createTitleCell('BUDGET VS ACTUAL COMPARISON')]);
  rows.push([{ v: '', t: 's' }]);

  // Note about budget setup
  rows.push([createCell('Note: Set up category budgets in your app for detailed comparison', {
    font: { sz: 10, color: { rgb: COLORS.neutral }, i: true },
    alignment: { horizontal: 'center' }
  })]);
  rows.push([{ v: '', t: 's' }]);

  // Sample budget comparison (you can customize this based on your app's budget feature)
  const sampleBudgets = {
    'Food': 800,
    'Transportation': 400,
    'Entertainment': 300,
    'Shopping': 500,
    'Bills': 1200,
    'Healthcare': 200
  };

  rows.push([createSubHeaderCell('CATEGORY BUDGET ANALYSIS')]);
  rows.push([{ v: '', t: 's' }]);
  
  rows.push([
    createHeaderCell('Category'),
    createHeaderCell('Budget'),
    createHeaderCell('Actual'),
    createHeaderCell('Variance'),
    createHeaderCell('% Used'),
    createHeaderCell('Status')
  ]);

  summary.topExpenseCategories.forEach(category => {
    const budget = sampleBudgets[category.category as keyof typeof sampleBudgets] || 0;
    const actual = category.amount;
    const variance = budget - actual;
    const percentUsed = budget > 0 ? (actual / budget) * 100 : 0;
    const status = percentUsed > 100 ? '🔴 Over' : percentUsed > 80 ? '🟡 Warning' : '🟢 On Track';

    rows.push([
      createCell(category.category),
      createValueCell(budget, '"Rp"#,##0'),
      createValueCell(actual, '"Rp"#,##0'),
      createPositiveValueCell(variance, '"Rp"#,##0'),
      createCell(percentUsed / 100, { numFmt: '0%' }),
      createCell(status)
    ]);
  });

  rows.push([{ v: '', t: 's' }]);

  // Spending recommendations
  rows.push([createSubHeaderCell('BUDGET RECOMMENDATIONS')]);
  rows.push([{ v: '', t: 's' }]);
  
  const recommendations = [
    '🎯 Review categories exceeding 80% of budget allocation',
    '💡 Consider increasing budgets for consistently over-spent categories',
    '📊 Track spending weekly to stay within monthly budgets',
    '🔄 Reallocate unused budget from under-spent categories',
    '📱 Set up spending alerts for real-time budget monitoring'
  ];

  recommendations.forEach(rec => {
    rows.push([createCell(rec, {
      font: { sz: 10 },
      alignment: { horizontal: 'left', wrapText: true }
    })]);
  });

  // Add data to worksheet
  XLSX.utils.sheet_add_aoa(ws, rows);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 20 }, // Category
    { wch: 12 }, // Budget
    { wch: 12 }, // Actual
    { wch: 12 }, // Variance
    { wch: 10 }, // % Used
    { wch: 15 }  // Status
  ];

  // Merge cells
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }, // Title
    { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } }  // Note
  ];
  
  return ws;
}