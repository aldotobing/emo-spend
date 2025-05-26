'use client';

import { useMemo, useState, useEffect } from 'react';
import { format, parseISO, startOfDay, endOfDay, eachDayOfInterval, isWithinInterval, differenceInDays, addMonths, subMonths, startOfMonth, endOfMonth, isSameMonth, isSameYear } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area } from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { Expense, Income } from '@/types/expense';
import { TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface IncomeExpenseChartProps {
  expenses: Expense[];
  incomes: Income[];
  isLoading?: boolean;
  period: 'day' | 'week' | 'month' | 'year';
}

type ChartDataPoint = {
  date: string;
  dateLabel: string;
  expenses: number;
  income: number;
  net: number;
  dateObj: Date;
};

export function IncomeExpenseChart({ expenses = [], incomes = [], isLoading = false, period }: IncomeExpenseChartProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [animatedIncome, setAnimatedIncome] = useState(0);
  const [animatedExpenses, setAnimatedExpenses] = useState(0);
  const [animatedDifference, setAnimatedDifference] = useState(0);
  
  const handlePrevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  // Calculate the date range based on the current period and date
  const { startDate, endDate, dateRange } = useMemo(() => {
    let start: Date;
    let end: Date;

    switch (period) {
      case 'day':
        start = startOfDay(currentDate);
        end = endOfDay(currentDate);
        break;
      case 'week':
        end = endOfDay(currentDate);
        start = startOfDay(new Date(end));
        start.setDate(start.getDate() - 6);
        break;
      case 'month':
        start = startOfMonth(currentDate);
        end = endOfMonth(currentDate);
        break;
      case 'year':
      default:
        start = startOfDay(new Date(currentDate.getFullYear(), 0, 1));
        end = endOfDay(new Date(currentDate.getFullYear(), 11, 31));
    }
    
    return {
      startDate: start,
      endDate: end,
      dateRange: eachDayOfInterval({ start, end })
    };
  }, [period, currentDate]);

  // Calculate chart data
  const chartData = useMemo<ChartDataPoint[]>(() => {
    return dateRange.map(date => {
      const dayExpenses = expenses.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate >= startOfDay(date) && expDate <= endOfDay(date);
      });
      
      const dayIncomes = incomes.filter(inc => {
        const incDate = new Date(inc.date);
        return incDate >= startOfDay(date) && incDate <= endOfDay(date);
      });
      
      const totalExpenses = dayExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      const totalIncome = dayIncomes.reduce((sum, inc) => sum + inc.amount, 0);
      
      return {
        date: date.toISOString(),
        dateLabel: format(date, period === 'year' ? 'MMM' : 'd'),
        expenses: totalExpenses,
        income: totalIncome,
        net: totalIncome - totalExpenses,
        dateObj: date
      };
    });
  }, [expenses, incomes, dateRange, period]);

  // Calculate summary statistics
  const { totalIncome, totalExpenses, difference, isPositive, hasData } = useMemo(() => {
    const totalIncome = chartData.reduce((sum, day) => sum + (day.income || 0), 0);
    const totalExpenses = chartData.reduce((sum, day) => sum + (day.expenses || 0), 0);
    const difference = totalIncome - totalExpenses;
    const isPositive = difference >= 0;
    const hasData = chartData.some(day => day.income > 0 || day.expenses > 0);
    
    return { totalIncome, totalExpenses, difference, isPositive, hasData };
  }, [chartData]);

  // Animate the summary values
  useEffect(() => {
    if (isLoading) return;
    
    const duration = 800;
    const start = performance.now();
    
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      
      setAnimatedIncome(Math.floor(animatedIncome + (totalIncome - animatedIncome) * eased));
      setAnimatedExpenses(Math.floor(animatedExpenses + (totalExpenses - animatedExpenses) * eased));
      setAnimatedDifference(Math.floor(animatedDifference + (difference - animatedDifference) * eased));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [totalIncome, totalExpenses, difference, isLoading]);

  // Calculate max value for Y-axis
  const maxValue = useMemo(() => {
    const maxAmount = Math.max(
      1000,
      ...chartData.map(d => Math.max(d.income, d.expenses, Math.abs(d.net)))
    );
    return maxAmount * 1.2;
  }, [chartData]);

  // Format the period display
  const getPeriodDisplay = () => {
    switch (period) {
      case 'day':
        return format(currentDate, 'MMM dd, yyyy');
      case 'week':
        return `${format(startDate, 'MMM dd')} - ${format(endDate, 'MMM dd, yyyy')}`;
      case 'month':
        return format(currentDate, 'MMM yyyy');
      case 'year':
        return format(currentDate, 'yyyy');
      default:
        return format(currentDate, 'MMM yyyy');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Summary Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="bg-card/50 backdrop-blur-sm border-border/50 shadow-sm">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-24" />
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* Chart Skeleton */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <div className="flex items-center space-x-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-8" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-sm sm:text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-green-500" />
          Pemasukan vs Pengeluaran
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Income Card */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Income</p>
            <CardTitle className="text-xl sm:text-2xl font-bold text-green-500">
              {formatCurrency(animatedIncome)}
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Expenses Card */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Expenses</p>
            <CardTitle className="text-xl sm:text-2xl font-bold text-red-500">
              {formatCurrency(animatedExpenses)}
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Difference Card */}
        <Card className={`bg-card/50 backdrop-blur-sm border-border/50 shadow-sm ${isPositive ? 'border-green-500/20' : 'border-red-500/20'}`}>
          <CardHeader className="pb-2">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground">Net Difference</p>
            <div className="flex items-center justify-between">
              <CardTitle className={`text-xl sm:text-2xl font-bold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                {isPositive && animatedDifference > 0 ? '+' : ''}{formatCurrency(animatedDifference)}
              </CardTitle>
              {isPositive ? (
                <div className="p-1.5 sm:p-2 rounded-full bg-green-500/10">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                </div>
              ) : (
                <div className="p-1.5 sm:p-2 rounded-full bg-red-500/10">
                  <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
                </div>
              )}
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Chart */}
      <div>
        <div className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base sm:text-lg font-semibold"></CardTitle>
          {/* Date Navigation - Always visible */}
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handlePrevMonth}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm font-medium min-w-[120px] text-center">
              {getPeriodDisplay()}
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleNextMonth}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="h-[300px] relative">
          {!hasData ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <p className="text-muted-foreground text-center">No transaction data available</p>
              <p className="text-muted-foreground text-sm text-center">
                Add some income or expenses for {getPeriodDisplay().toLowerCase()} to see the chart
              </p>
            </div>
          ) : (
            <div className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="netPositiveGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="rgba(34, 197, 94, 0.2)" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="rgba(34, 197, 94, 0.0)" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="netNegativeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="rgba(239, 68, 68, 0.2)" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="rgba(239, 68, 68, 0.0)" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" vertical={false} />
                  <XAxis 
                    dataKey="dateLabel" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    padding={{ left: 10, right: 10 }}
                  />
                  <YAxis 
                    tickFormatter={(value) => formatCurrency(Number(value))}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, maxValue]}
                    width={80}
                  />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        const isPositiveDay = data.net >= 0;
                        return (
                          <div className="bg-background p-2 sm:p-3 border rounded-lg shadow-lg text-xs sm:text-sm">
                            <p className="font-medium text-foreground mb-1 sm:mb-2">
                              {format(new Date(data.date), 'EEEE, MMM d, yyyy')}
                            </p>
                            <div className="space-y-0.5 sm:space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Income:</span>
                                <span className="font-medium text-green-500">+{formatCurrency(data.income)}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Expenses:</span>
                                <span className="font-medium text-red-500">-{formatCurrency(data.expenses)}</span>
                              </div>
                              <div className="pt-1 mt-1 sm:mt-2 border-t border-border/50">
                                <div className="flex justify-between items-center">
                                  <span className="font-medium">Net:</span>
                                  <span className={`font-semibold ${isPositiveDay ? 'text-green-500' : 'text-red-500'}`}>
                                    {isPositiveDay ? '+' : ''}{formatCurrency(data.net)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend 
                    verticalAlign="top"
                    height={36}
                    formatter={(value) => (
                      <span className="text-xs text-muted-foreground">
                        {value}
                      </span>
                    )}
                  />
                  
                  {/* Income Line */}
                  <Line
                    type="monotone"
                    dataKey="income"
                    name="Income"
                    stroke="hsl(142.1 76.2% 36.3%)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, strokeWidth: 0, fill: 'hsl(142.1 76.2% 36.3%)' }}
                  />
                  
                  {/* Expenses Line */}
                  <Line
                    type="monotone"
                    dataKey="expenses"
                    name="Expenses"
                    stroke="hsl(0 84.2% 60.2%)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, strokeWidth: 0, fill: 'hsl(0 84.2% 60.2%)' }}
                  />
                  
                  {/* Net Line */}
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
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}