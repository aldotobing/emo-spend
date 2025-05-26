'use client';

import { useMemo } from 'react';
import { format, subYears, startOfYear, endOfYear, eachMonthOfInterval, isWithinInterval, parseISO } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

type YearOverYearChartProps = {
  expenses: Array<{ date: string; amount: number }>;
  isLoading?: boolean;
};

export function YearOverYearChart({ expenses, isLoading = false }: YearOverYearChartProps) {
  // Process data for the chart
  const { chartData, totalComparison } = useMemo(() => {
    if (!expenses?.length) return { chartData: [], totalComparison: null };

    const now = new Date();
    const currentYear = now.getFullYear();
    const lastYear = currentYear - 1;

    // Create an array of all months in the year
    const months = eachMonthOfInterval({
      start: new Date(currentYear, 0, 1),
      end: new Date(currentYear, 11, 31)
    });

    // Initialize data structure for each month
    const monthlyData = months.map(month => ({
      name: format(month, 'MMM'),
      fullName: format(month, 'MMMM'),
      [currentYear]: 0,
      [lastYear]: 0,
    }));

    let currentYearTotal = 0;
    let lastYearTotal = 0;

    // Process expenses
    expenses.forEach(expense => {
      const date = parseISO(expense.date);
      const year = date.getFullYear();
      const month = date.getMonth();

      // Only process if it's from current or last year
      if (year === currentYear || year === lastYear) {
        const monthData = monthlyData[month];
        if (monthData) {
          monthData[year] = (monthData[year] || 0) + expense.amount;
          
          if (year === currentYear) {
            currentYearTotal += expense.amount;
          } else {
            lastYearTotal += expense.amount;
          }
        }
      }
    });

    // Calculate percentage change
    const percentageChange = lastYearTotal === 0 ? 0 : 
      ((currentYearTotal - lastYearTotal) / lastYearTotal) * 100;

    return {
      chartData: monthlyData,
      totalComparison: {
        currentYear: currentYearTotal,
        lastYear: lastYearTotal,
        percentageChange,
        isIncrease: currentYearTotal > lastYearTotal
      }
    };
  }, [expenses]);

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border/50 rounded-lg shadow-lg p-4 min-w-[200px]">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <p className="font-medium text-foreground">{data.fullName}</p>
          </div>
          <div className="space-y-2">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm text-muted-foreground">{entry.name}</span>
                </div>
                <span className="font-mono font-medium text-foreground">
                  {formatCurrency(entry.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card className="w-full border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-6 w-20" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex items-center justify-center">
            <Skeleton className="h-full w-full rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!expenses?.length) {
    return (
      <Card className="w-full border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <TrendingUp className="w-5 h-5" />
            Year-over-Year Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <TrendingUp className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground font-medium">No expense data available</p>
              <p className="text-sm text-muted-foreground/80">Add some expenses to see your year-over-year comparison</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentYear = new Date().getFullYear();
  const lastYear = currentYear - 1;

  return (
    <Card className="w-full border-border/50 shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <TrendingUp className="w-5 h-5" />
            Year-over-Year Comparison
          </CardTitle>
          {totalComparison && (
            <div className="flex items-center gap-2">
              <Badge 
                variant={totalComparison.isIncrease ? "destructive" : "secondary"}
                className="flex items-center gap-1 font-mono"
              >
                {totalComparison.isIncrease ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {Math.abs(totalComparison.percentageChange).toFixed(1)}%
              </Badge>
            </div>
          )}
        </div>
        {totalComparison && (
          <div className="flex items-center gap-6 text-sm text-muted-foreground mt-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span>{currentYear}: {formatCurrency(totalComparison.currentYear)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-muted-foreground" />
              <span>{lastYear}: {formatCurrency(totalComparison.lastYear)}</span>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{
                top: 20,
                right: 50,
                left: 30,
                bottom: 30,
              }}
            >
              <defs>
                <linearGradient id="currentYearGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="lastYearGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))" 
                strokeOpacity={0.5}
                vertical={false}
              />
              <XAxis 
                dataKey="name" 
                tick={{ 
                  fill: 'hsl(var(--muted-foreground))',
                  fontSize: 12,
                  fontWeight: 500
                }}
                axisLine={false}
                tickLine={false}
                dy={10}
              />
              <YAxis 
                tickFormatter={(value) => formatCurrency(value)}
                tick={{ 
                  fill: 'hsl(var(--muted-foreground))',
                  fontSize: 12,
                  fontWeight: 500
                }}
                axisLine={false}
                tickLine={false}
                dx={-10}
              />
              <Tooltip 
                content={<CustomTooltip />}
                cursor={{ 
                  stroke: 'hsl(var(--border))', 
                  strokeWidth: 1,
                  strokeDasharray: '3 3'
                }}
              />
              <Legend 
                wrapperStyle={{
                  paddingTop: '20px',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
                iconType="circle"
              />
              <Line
                type="monotone"
                dataKey={currentYear.toString()}
                name={`${currentYear} Spending`}
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                dot={{ 
                  fill: 'hsl(var(--primary))', 
                  strokeWidth: 2, 
                  stroke: 'hsl(var(--background))',
                  r: 4 
                }}
                activeDot={{ 
                  r: 6, 
                  fill: 'hsl(var(--primary))',
                  stroke: 'hsl(var(--background))',
                  strokeWidth: 2
                }}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey={lastYear.toString()}
                name={`${lastYear} Spending`}
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={2}
                strokeDasharray="8 4"
                dot={{ 
                  fill: 'hsl(var(--muted-foreground))', 
                  strokeWidth: 2, 
                  stroke: 'hsl(var(--background))',
                  r: 3 
                }}
                activeDot={{ 
                  r: 5, 
                  fill: 'hsl(var(--muted-foreground))',
                  stroke: 'hsl(var(--background))',
                  strokeWidth: 2
                }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}