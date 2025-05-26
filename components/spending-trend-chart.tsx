'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

type SpendingTrendChartProps = {
  trendData: Array<{ month: string; amount: number }>;
  isLoading?: boolean;
};

export function SpendingTrendChart({ trendData, isLoading = false }: SpendingTrendChartProps) {
  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border/50 rounded-lg shadow-lg p-4 min-w-[200px]">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <p className="font-medium text-foreground">Bulan: {label}</p>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: data.color }}
              />
              <span className="text-sm text-muted-foreground">Pengeluaran</span>
            </div>
            <span className="font-mono font-medium text-foreground">
              {new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              }).format(data.value)}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card className="w-full border-border/50 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-60" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full rounded-lg" />
        </CardContent>
        <CardFooter>
          <div className="flex justify-between w-full">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </CardFooter>
      </Card>
    );
  }

  // Format date range for the footer in Indonesian locale
  const dateRange = trendData.length > 0 
    ? `${trendData[0].month} - ${trendData[trendData.length - 1].month}`
    : 'Tidak ada data';

  // Calculate total spending and average
  const totalSpending = trendData.reduce((sum, item) => sum + item.amount, 0);
  const averageSpending = trendData.length > 0 ? totalSpending / trendData.length : 0;
  
  const formattedTotal = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(totalSpending);

  const formattedAverage = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(averageSpending);

  // Calculate trend (simple comparison of first half vs second half)
  const midPoint = Math.floor(trendData.length / 2);
  const firstHalfAvg = trendData.slice(0, midPoint).reduce((sum, item) => sum + item.amount, 0) / midPoint;
  const secondHalfAvg = trendData.slice(midPoint).reduce((sum, item) => sum + item.amount, 0) / (trendData.length - midPoint);
  const trendPercentage = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;
  const isIncreasing = trendPercentage > 5; // Consider significant if > 5%
  const isDecreasing = trendPercentage < -5;

  return (
    <Card className="w-full border-border/50 shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <TrendingUp className="w-5 h-5" />
              Grafik Pengeluaran
            </CardTitle>
            <CardDescription>Ringkasan pengeluaran 12 bulan terakhir</CardDescription>
          </div>
          {trendData.length > 0 && (
            <div className="flex items-center gap-2">
              {isIncreasing && (
                <Badge variant="destructive" className="flex items-center gap-1 font-mono">
                  <TrendingUp className="w-3 h-3" />
                  +{Math.abs(trendPercentage).toFixed(1)}%
                </Badge>
              )}
              {isDecreasing && (
                <Badge variant="secondary" className="flex items-center gap-1 font-mono">
                  <TrendingUp className="w-3 h-3 rotate-180" />
                  -{Math.abs(trendPercentage).toFixed(1)}%
                </Badge>
              )}
              {!isIncreasing && !isDecreasing && (
                <Badge variant="outline" className="flex items-center gap-1 font-mono">
                  Stabil
                </Badge>
              )}
            </div>
          )}
        </div>
        {trendData.length > 0 && (
          <div className="flex items-center gap-6 text-sm text-muted-foreground mt-2">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              <span>Rata-rata: {formattedAverage}</span>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={trendData}
              margin={{
                top: 20,
                right: 50,
                left: 30,
                bottom: 30,
              }}
            >
              <defs>
                <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))"
                strokeOpacity={0.5}
                vertical={false}
              />
              <XAxis 
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: 'hsl(var(--muted-foreground))',
                  fontSize: 12,
                  fontWeight: 500
                }}
                dy={10}
              />
              <YAxis 
                tickFormatter={(value) => {
                  return new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  }).format(value).replace('IDR', '').trim();
                }}
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: 'hsl(var(--muted-foreground))',
                  fontSize: 12,
                  fontWeight: 500
                }}
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
              <Line 
                type="monotone" 
                dataKey="amount"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                dot={{
                  r: 4,
                  stroke: 'hsl(var(--primary))',
                  strokeWidth: 2,
                  fill: 'hsl(var(--background))',
                  fillOpacity: 1,
                }}
                activeDot={{
                  r: 6,
                  stroke: 'hsl(var(--primary))',
                  strokeWidth: 2,
                  fill: 'hsl(var(--background))',
                  className: 'shadow-md'
                }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground flex justify-between items-center pt-4 border-t border-border/50">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          <span>Periode: {dateRange}</span>
        </div>
        <div className="flex items-center gap-2 font-mono font-medium">
          <DollarSign className="w-4 h-4" />
          <span>Total: {formattedTotal}</span>
        </div>
      </CardFooter>
    </Card>
  );
}