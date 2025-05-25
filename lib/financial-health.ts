import { getIncomesByDateRange } from './income';
import { getExpensesByDateRange } from '@/lib/db';
import type { Expense, Income } from '@/types/expense';

export interface FinancialHealthScore {
  score: number; // 0-100
  status: 'Excellent' | 'Good' | 'Fair' | 'Needs Improvement' | 'Poor';
  summary: string;
  recommendations: string[];
  metrics: {
    savingsRate: number;
    expenseToIncomeRatio: number;
    emergencyFundMonths: number;
    discretionarySpending: number;
  };
}

export async function calculateFinancialHealth(
  userId: string,
  months: number = 3
): Promise<FinancialHealthScore> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  // Get transactions for the period
  const [incomes, expenses] = await Promise.all([
    getIncomesByDateRange(startDate.toISOString(), endDate.toISOString()),
    getExpensesByDateRange(startDate.toISOString(), endDate.toISOString()),
  ]);

  // Calculate totals
  const totalIncome = incomes.reduce((sum: number, income: Income) => sum + income.amount, 0);
  const totalExpenses = expenses.reduce((sum: number, expense: Expense) => sum + expense.amount, 0);
  const savings = totalIncome - totalExpenses;
  
  // Calculate metrics
  const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;
  const expenseToIncomeRatio = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;
  
  // Calculate emergency fund (assuming monthly expenses)
  const monthlyExpenses = totalExpenses / months;
  const emergencyFundMonths = monthlyExpenses > 0 ? savings / monthlyExpenses : 0;
  
  // Calculate discretionary spending (non-essential expenses)
  const essentialCategories = ['Housing', 'Utilities', 'Groceries', 'Transportation', 'Insurance'];
  const discretionaryExpenses = expenses
    .filter((expense: Expense) => !essentialCategories.includes(expense.category))
    .reduce((sum: number, exp: Expense) => sum + exp.amount, 0);
  
  const discretionarySpending = totalExpenses > 0 
    ? (discretionaryExpenses / totalExpenses) * 100 
    : 0;

  // Calculate score (0-100)
  let score = 0;
  
  // Savings rate (max 30 points)
  score += Math.min(savingsRate * 0.6, 30);
  
  // Expense to income ratio (max 30 points)
  if (expenseToIncomeRatio <= 50) score += 30;
  else if (expenseToIncomeRatio <= 70) score += 20;
  else if (expenseToIncomeRatio <= 90) score += 10;
  
  // Emergency fund (max 30 points)
  if (emergencyFundMonths >= 6) score += 30;
  else if (emergencyFundMonths >= 3) score += 20;
  else if (emergencyFundMonths >= 1) score += 10;
  
  // Discretionary spending (max 10 points)
  if (discretionarySpending <= 30) score += 10;
  else if (discretionarySpending <= 50) score += 5;

  // Determine status
  let status: FinancialHealthScore['status'];
  let summary = '';
  
  if (score >= 80) {
    status = 'Excellent';
    summary = 'Your finances are in great shape! Keep up the good work.';
  } else if (score >= 65) {
    status = 'Good';
    summary = 'Your finances are healthy, but there\'s room for improvement.';
  } else if (score >= 50) {
    status = 'Fair';
    summary = 'Your finances need some attention. Consider the recommendations below.';
  } else if (score >= 30) {
    status = 'Needs Improvement';
    summary = 'Your financial health needs attention. Consider making some changes.';
  } else {
    status = 'Poor';
    summary = 'Your financial health needs immediate attention. Please review the recommendations.';
  }

  // Generate recommendations
  const recommendations: string[] = [];
  
  if (savingsRate < 20) {
    recommendations.push('Aim to save at least 20% of your income each month.');
  }
  
  if (emergencyFundMonths < 3) {
    recommendations.push(`Build an emergency fund to cover ${3 - Math.ceil(emergencyFundMonths)} more months of expenses.`);
  }
  
  if (discretionarySpending > 30) {
    recommendations.push('Consider reducing discretionary spending to improve your savings rate.');
  }
  
  if (expenseToIncomeRatio > 70) {
    recommendations.push('Your expenses are high relative to your income. Look for ways to reduce fixed costs.');
  }

  return {
    score: Math.round(score),
    status,
    summary,
    recommendations,
    metrics: {
      savingsRate: parseFloat(savingsRate.toFixed(1)),
      expenseToIncomeRatio: parseFloat(expenseToIncomeRatio.toFixed(1)),
      emergencyFundMonths: parseFloat(emergencyFundMonths.toFixed(1)),
      discretionarySpending: parseFloat(discretionarySpending.toFixed(1)),
    },
  };
}
