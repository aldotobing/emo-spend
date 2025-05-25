'use client';

import { useMemo } from 'react';
import { format, parseISO, startOfDay, endOfDay, eachDayOfInterval, isWithinInterval } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { Expense, Income } from '@/types/expense';

interface IncomeExpenseChartProps {
  expenses: Expense[];
  incomes: Income[];
  isLoading?: boolean;
  period: 'day' | 'week' | 'month' | 'year';
}

export function IncomeExpenseChart({ expenses = [], incomes = [], isLoading = false, period }: IncomeExpenseChartProps) {
  const chartData = useMemo(() => {
    if (isLoading) return [];

    // If no data, return empty array
    if (!expenses.length && !incomes.length) return [];

    // Get the current date for reference
    const now = new Date();
    let startDate: Date;
    let endDate = endOfDay(now);

    // Set the start date based on the selected period
    switch (period) {
      case 'day':
        startDate = startOfDay(now);
        break;
      case 'week':
        startDate = startOfDay(new Date(now.setDate(now.getDate() - 7)));
        break;
      case 'month':
        startDate = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
        break;
      case 'year':
      default:
        startDate = startOfDay(new Date(now.getFullYear(), 0, 1));
    }
    
    // Generate date range based on period
    const dateRange = eachDayOfInterval({ start: startDate, end: endDate });

    // Group data by date
    return dateRange.map(date => {
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      
      // Filter expenses and incomes for this day
      const dayExpenses = expenses.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate >= dayStart && expDate <= dayEnd;
      });
      
      const dayIncomes = incomes.filter(inc => {
        const incDate = new Date(inc.date);
        return incDate >= dayStart && incDate <= dayEnd;
      });
      
      // Calculate totals
      const totalExpenses = dayExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      const totalIncome = dayIncomes.reduce((sum, inc) => sum + inc.amount, 0);
      const net = totalIncome - totalExpenses;
      
      // Format date for display based on period
      let dateLabel: string;
      switch (period) {
        case 'day':
          dateLabel = format(date, 'HH:mm');
          break;
        case 'week':
          dateLabel = format(date, 'EEE');
          break;
        case 'month':
          dateLabel = format(date, 'MMM dd');
          break;
        case 'year':
        default:
          dateLabel = format(date, 'MMM yyyy');
      }
      
      return {
        date: date.toISOString(),
        dateLabel,
        expenses: totalExpenses,
        income: totalIncome,
        net,
        dateObj: date
      };
    });
  }, [expenses, incomes, period, isLoading]);

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Income vs Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full flex items-center justify-center">
            <Skeleton className="h-full w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!chartData.length || !chartData.some(d => d.income > 0 || d.expenses > 0)) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Income vs Expenses</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex flex-col items-center justify-center gap-2">
          <p className="text-muted-foreground text-center">No transaction data available</p>
          <p className="text-muted-foreground text-sm text-center">Add some income or expenses to see the chart</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate max value for Y-axis with a minimum of 1000 to prevent chart from being too small
  const maxValue = Math.max(
    1000, // Minimum value to ensure chart is readable
    ...chartData.map(d => Math.max(d.income, d.expenses, Math.abs(d.net)))
  ) * 1.2; // Add 20% padding for better visualization

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Income vs Expenses</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
            <XAxis 
              dataKey="dateLabel" 
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickLine={{ stroke: 'hsl(var(--muted))' }}
            />
            <YAxis 
              tickFormatter={(value) => formatCurrency(Number(value))}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickLine={{ stroke: 'hsl(var(--muted))' }}
              domain={[0, maxValue]}
              width={80}
            />
            <Tooltip 
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-background p-4 border rounded-lg shadow-lg">
                      <p className="font-medium">{format(new Date(data.date), 'PPP')}</p>
                      <p className="text-green-500">
                        Income: {formatCurrency(data.income)}
                      </p>
                      <p className="text-red-500">
                        Expenses: {formatCurrency(data.expenses)}
                      </p>
                      <p className={data.net >= 0 ? 'text-green-500' : 'text-red-500'}>
                        Net: {formatCurrency(data.net)}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="income"
              name="Income"
              stroke="hsl(142.1 76.2% 36.3%)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="expenses"
              name="Expenses"
              stroke="hsl(0 84.2% 60.2%)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="net"
              name="Net"
              stroke="hsl(221.2 83.2% 53.3%)"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
