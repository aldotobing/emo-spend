'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/currency-formatter";

type DailySpendingData = {
  date: string;
  amount: number;
};

type DailySpendingTrendProps = {
  data: DailySpendingData[];
  isLoading: boolean;
};

export function DailySpendingTrend({ data, isLoading }: DailySpendingTrendProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Spending Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Spending Trend</CardTitle>
      </CardHeader>
      <CardContent className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => value.split('-').slice(1).join('/')}
            />
            <YAxis />
            <Tooltip 
              formatter={(value: number) => [formatCurrency(value), 'Amount']}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="amount"
              stroke="#8884d8"
              activeDot={{ r: 8 }}
              name="Daily Spending"
            />
            <Line
              type="monotone"
              dataKey="average"
              stroke="#82ca9d"
              strokeDasharray="5 5"
              name="7-Day Average"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
