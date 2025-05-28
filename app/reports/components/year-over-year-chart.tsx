'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/currency-formatter";
import { format, subYears, startOfYear, endOfYear } from 'date-fns';

type YearlyExpense = {
  date: string;
  amount: number;
};

type YearOverYearChartProps = {
  expenses: YearlyExpense[];
  isLoading: boolean;
};

// Format the data for year-over-year comparison
const formatYearlyData = (expenses: YearlyExpense[]) => {
  if (!expenses || expenses.length === 0) return [];

  const currentYear = new Date().getFullYear();
  
  // Create a map of year to amount
  const yearMap = new Map<number, number>();
  yearMap.set(currentYear, 0);
  
  // Sum amounts by year
  expenses.forEach(expense => {
    const year = new Date(expense.date).getFullYear();
    if (yearMap.has(year)) {
      yearMap.set(year, (yearMap.get(year) || 0) + expense.amount);
    }
  });
  
  // Convert to array of { year: string, amount: number }
  return Array.from(yearMap.entries()).map(([year, amount]) => ({
    year: year.toString(),
    amount,
  }));
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
        <p className="font-medium">{label}</p>
        <p className="text-sm">
          <span className="text-gray-500">Total: </span>
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

export function YearOverYearChart({ expenses, isLoading }: YearOverYearChartProps) {
  const chartData = formatYearlyData(expenses);
  const maxAmount = Math.max(...chartData.map(item => item.amount), 0);
  const yAxisDomain = [0, maxAmount * 1.1]; // Add 10% padding to the top
  
  // Calculate average for reference line
  const average = chartData.reduce((sum, item) => sum + item.amount, 0) / (chartData.length || 1);

  if (isLoading || !chartData.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Year-over-Year Comparison</CardTitle>
          <p className="text-sm text-muted-foreground">
            Compare your spending across different years
          </p>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Year-over-Year Comparison</CardTitle>
        <p className="text-sm text-muted-foreground">
          Compare your spending across different years
        </p>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{
              top: 5,
              right: 20,
              left: 0,
              bottom: 5,
            }}
            barSize={40}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis 
              dataKey="year" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#666', fontSize: 12 }}
            />
            <YAxis 
              tickFormatter={(value) => formatCurrency(value).replace('Rp', '').replace(/\s/g, '')}
              tickLine={false}
              axisLine={false}
              domain={yAxisDomain}
              width={80}
              tick={{ fill: '#666', fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine 
              y={average} 
              label={({ viewBox }) => (
                <text 
                  x={viewBox.width - 10} 
                  y={viewBox.y - 10} 
                  fill="#666" 
                  textAnchor="end"
                  fontSize={12}
                >
                  Avg: {formatCurrency(average)}
                </text>
              )} 
              stroke="#ff7300" 
              strokeDasharray="3 3" 
            />
            <Bar
              dataKey="amount"
              name="Total Spending"
              fill="#8884d8"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">
          Data shown for {new Date().getFullYear()} and previous years
        </p>
      </CardFooter>
    </Card>
  );
}
