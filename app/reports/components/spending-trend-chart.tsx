'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format } from 'date-fns';
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/currency-formatter";

type DataPoint = {
  date: string;
  amount: number;
};

type SpendingTrendChartProps = {
  trendData: DataPoint[];
  isLoading: boolean;
};

// Format the data for the chart
const formatChartData = (data: DataPoint[]) => {
  if (!data || data.length === 0) return { chartData: [], average: 0 };
  
  // Sort data by date to ensure proper ordering
  const sortedData = [...data].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Format date as 'MMM yyyy' (e.g., 'Jan 2023')
  const formatDate = (date: Date) => format(date, 'MMM yyyy');

  // Calculate average for reference line
  const total = sortedData.reduce((sum, item) => sum + item.amount, 0);
  const average = total / sortedData.length;

  return {
    chartData: sortedData.map(item => ({
      date: formatDate(new Date(item.date)),
      amount: item.amount,
    })),
    average
  };
};

export function SpendingTrendChart({ trendData, isLoading }: SpendingTrendChartProps) {
  const { chartData, average } = formatChartData(trendData);
  const maxAmount = Math.max(...chartData.map(item => item.amount), 0);
  const yAxisDomain = [0, maxAmount * 1.1]; // Add 10% padding to the top
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-sm">
            <span className="text-gray-500">Amount: </span>
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };
  
  const CustomizedAxisTick = (props: any) => {
    const { x, y, payload } = props;
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={16}
          textAnchor="middle"
          fill="#666"
          fontSize={12}
        >
          {payload.value}
        </text>
      </g>
    );
  };
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Spending Trend</CardTitle>
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
        <CardTitle>Spending Trend</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              tick={<CustomizedAxisTick />}
              tickLine={false}
              axisLine={{ stroke: '#e0e0e0' }}
              padding={{ left: 10, right: 10 }}
            />
            <YAxis 
              tickFormatter={(value) => formatCurrency(value).replace('Rp', '').replace(/\s/g, '')}
              tickLine={false}
              axisLine={false}
              domain={yAxisDomain}
              width={80}
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
            <Line
              type="monotone"
              dataKey="amount"
              name="Spending"
              stroke="#8884d8"
              strokeWidth={2}
              dot={chartData.length < 30} // Only show dots if not too many points
              activeDot={{ r: 4, strokeWidth: 0 }}
              isAnimationActive={chartData.length < 100} // Disable animation for large datasets
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
