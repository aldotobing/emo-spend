"use client";

import { useState, useEffect } from "react";
import { MonthlyCategoryData } from "./components/monthly-category-spending";
import { format, subMonths, startOfMonth, endOfMonth, isBefore, isAfter, isSameDay, startOfYear, subYears } from "date-fns";
import { Calendar as CalendarIcon, Download, FileSpreadsheet, BarChart2, PieChart, TrendingUp, BarChart, Table } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { exportExpensesToExcel, downloadExcel } from "@/lib/excel-export";
import { Calendar } from "@/components/ui/calendar";
import { getExpenses, getExpensesByDateRange } from "@/lib/db";
import { YearOverYearChart } from "./components/year-over-year-chart";
import { SpendingTrendChart } from "./components/spending-trend-chart";
import { CategorySpendingChart } from "./components/category-spending-chart";
import { MonthlyCategorySpending } from "./components/monthly-category-spending";
import { DailySpendingTrend } from "./components/daily-spending-trend";
import { ExpensesTable } from "./components/expenses-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Default date range: current month
const today = new Date();
const defaultStartDate = startOfMonth(today);
const defaultEndDate = endOfMonth(today);

type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
};

export default function ReportsPage() {

  const [isExporting, setIsExporting] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: defaultStartDate,
    to: defaultEndDate,
  });
  const [oldestExpenseDate, setOldestExpenseDate] = useState<Date | null>(null);
  const [isLoadingDates, setIsLoadingDates] = useState(true);
  const [yearlyExpenses, setYearlyExpenses] = useState<Array<{ date: string; amount: number }>>([]);
  const [isLoadingYearlyData, setIsLoadingYearlyData] = useState(true);
  const [trendData, setTrendData] = useState<Array<{ date: string; amount: number }>>([]);
  const [categorySpending, setCategorySpending] = useState<Array<{ name: string; value: number; color: string }>>([]);
  const [monthlyCategoryData, setMonthlyCategoryData] = useState<MonthlyCategoryData[]>([]);
  const [dailySpending, setDailySpending] = useState<Array<{ date: string; amount: number }>>([]);
  const [recentExpenses, setRecentExpenses] = useState<Array<any>>([]);
  const [isLoadingCharts, setIsLoadingCharts] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);

  // Load the oldest expense date on component mount
  useEffect(() => {
    const loadOldestExpenseDate = async () => {
      try {
        const expenses = await getExpenses();
        if (expenses.length > 0) {
          const dates = expenses.map(e => new Date(e.date).getTime());
          const oldestDate = new Date(Math.min(...dates));
          setOldestExpenseDate(oldestDate);
        }
      } catch (error) {
        console.error('Error loading oldest expense date:', error);
        // Fallback to current year start if there's an error
        setOldestExpenseDate(startOfYear(new Date()));
      } finally {
        setIsLoadingDates(false);
      }
    };

    loadOldestExpenseDate();
  }, []);

  useEffect(() => {
    loadChartData();
  }, []);

  // Load expenses for the current and previous year for the Year-over-Year chart
  const loadYearlyExpenses = async () => {
    try {
      setIsLoadingYearlyData(true);
      const now = new Date();
      const currentYear = now.getFullYear();
      const startDate = new Date(currentYear - 1, 0, 1).toISOString().split('T')[0];
      const endDate = new Date(currentYear, 11, 31).toISOString().split('T')[0];
      
      const expenses = await getExpensesByDateRange(startDate, endDate);
      setYearlyExpenses(expenses);
    } catch (error) {
      console.error('Error loading yearly expenses:', error);
      toast.error("Error", {
        description: "Failed to load yearly expense data"
      });
    } finally {
      setIsLoadingYearlyData(false);
    }
  };

  // Load all chart data
  const loadChartData = async () => {
    try {
      setIsLoadingCharts(true);
      const startDate = format(defaultStartDate, 'yyyy-MM-dd');
      const endDate = format(defaultEndDate, 'yyyy-MM-dd');
      
      // Load all expenses for the period
      const expenses = await getExpensesByDateRange(startDate, endDate);
      
      // Process data for monthly trend chart
      const monthlyData = new Map();
      const months = [];
      const now = new Date();
      const twelveMonthsAgo = subMonths(now, 12);
      let current = startOfMonth(twelveMonthsAgo);
      while (current <= now) {
        const monthKey = format(current, 'MMM yyyy');
        monthlyData.set(monthKey, 0);
        months.push(monthKey);
        current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
      }
      
      // Process data for category spending
      const categoryMap = new Map();
      const monthlyCategoryMap = new Map();
      const dailySpendingMap = new Map();
      
      // Initialize category data
      const allCategories = [...new Set(expenses.map(e => e.category))];
      setCategories(allCategories);
      
      // Process each expense
      expenses.forEach(expense => {
        const date = new Date(expense.date);
        const monthKey = format(date, 'MMM yyyy');
        const dateKey = format(date, 'yyyy-MM-dd');
        
        // Update monthly total
        monthlyData.set(monthKey, (monthlyData.get(monthKey) || 0) + expense.amount);
        
        // Update category total
        categoryMap.set(
          expense.category, 
          (categoryMap.get(expense.category) || 0) + expense.amount
        );
        
        // Update monthly category data
        if (!monthlyCategoryMap.has(monthKey)) {
          monthlyCategoryMap.set(monthKey, { month: monthKey });
          allCategories.forEach(cat => {
            monthlyCategoryMap.get(monthKey)[cat] = 0;
          });
        }
        monthlyCategoryMap.get(monthKey)[expense.category] += expense.amount;
        
        // Update daily spending
        dailySpendingMap.set(
          dateKey,
          (dailySpendingMap.get(dateKey) || 0) + expense.amount
        );
      });
      
      // Set trend data
      setTrendData(months.map(month => ({
        date: month,  // Changed from month to date to match DataPoint type
        amount: monthlyData.get(month) || 0
      })));
      
      // Set category spending data
      setCategorySpending(
        Array.from(categoryMap.entries()).map(([name, value], index) => ({
          name,
          value,
          color: `hsl(${(index * 60) % 360}, 70%, 50%)`
        }))
      );
      
      // Set monthly category data
      setMonthlyCategoryData(Array.from(monthlyCategoryMap.values()));
      
      // Set daily spending data with 7-day moving average
      const dailyData = Array.from(dailySpendingMap.entries())
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      // Calculate 7-day moving average
      const dailyWithAverage = dailyData.map((day, i, arr) => {
        const start = Math.max(0, i - 6);
        const week = arr.slice(start, i + 1);
        const average = week.reduce((sum, d) => sum + d.amount, 0) / week.length;
        return { ...day, average };
      });
      
      setDailySpending(dailyWithAverage);
      
      // Set recent expenses (last 10)
      const sortedExpenses = [...expenses]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10);
      setRecentExpenses(sortedExpenses);
      
    } catch (error) {
      console.error('Error loading chart data:', error);
      toast.error("Error", {
        description: "Failed to load chart data"
      });
    } finally {
      setIsLoadingCharts(false);
    }
  };

  const handleDateRangeSelect = (newDateRange: { from?: Date; to?: Date } | undefined) => {
    if (newDateRange?.from && newDateRange?.to) {
      setDateRange({
        from: newDateRange.from,
        to: newDateRange.to,
      });
    } else if (newDateRange?.from) {
      setDateRange({
        from: newDateRange.from,
        to: newDateRange.from,
      });
    }
  };

  const handleQuickRange = (range: 'thisMonth' | 'lastMonth' | 'last30Days' | 'allTime') => {
    const today = new Date();
    let from: Date;
    let to: Date;

    switch (range) {
      case 'thisMonth':
        from = startOfMonth(today);
        to = endOfMonth(today);
        break;
      case 'lastMonth':
        const lastMonth = subMonths(today, 1);
        from = startOfMonth(lastMonth);
        to = endOfMonth(lastMonth);
        break;
      case 'last30Days':
        from = subMonths(today, 1);
        to = today;
        break;
      case 'allTime':
      default:
        // Use the oldest expense date if available, otherwise use the start of the current year
        from = oldestExpenseDate || startOfYear(today);
        to = today;
        break;
    }

    setDateRange({ from, to });
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const excelBlob = await exportExpensesToExcel(dateRange.from, dateRange.to);
      const dateRangeText = dateRange.from && dateRange.to 
        ? `${format(dateRange.from, 'yyyy-MM-dd')}_to_${format(dateRange.to, 'yyyy-MM-dd')}`
        : 'all_time';
      
      downloadExcel(excelBlob, `EmoSpend-Report_${dateRangeText}.xlsx`);
      
      toast.success("Export successful", {
        description: "Your expense data has been exported to Excel."
      });
    } catch (error) {
      console.error('Export error:', error);
      toast.error("Export failed", {
        description: "Failed to export data. Please try again."
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-6xl">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Generate and export your financial reports
          </p>
        </div>

        <Tabs defaultValue="export" className="w-full space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export Data
            </TabsTrigger>
            <TabsTrigger value="insights">
              <BarChart2 className="mr-2 h-4 w-4" />
              Data Viz
            </TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg md:text-xl">Export Reports</CardTitle>
                </div>
                <CardDescription className="text-sm">
                  Generate and download your financial data in Excel format
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Date Range Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-medium text-sm md:text-base">Select Date Range</h3>
                  </div>
                  
                  {/* Date Picker */}
                  <div className="w-full">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="date"
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal h-10 md:h-11",
                            !dateRange && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                          <span className="truncate">
                            {dateRange?.from ? (
                              dateRange.to ? (
                                <>
                                  {format(dateRange.from, "MMM dd, y")} - {format(dateRange.to, "MMM dd, y")}
                                </>
                              ) : (
                                format(dateRange.from, "MMM dd, y")
                              )
                            ) : (
                              "Pick a date range"
                            )}
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          initialFocus
                          mode="range"
                          defaultMonth={dateRange?.from}
                          selected={dateRange}
                          onSelect={handleDateRangeSelect}
                          numberOfMonths={window.innerWidth < 768 ? 1 : 2}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Quick Range Buttons */}
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Quick select:</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleQuickRange('thisMonth')}
                        disabled={isLoadingDates}
                        className={cn(
                          "text-xs h-8",
                          dateRange?.from && dateRange?.to &&
                          isSameDay(dateRange.from, startOfMonth(new Date())) &&
                          isSameDay(dateRange.to, endOfMonth(new Date())) 
                            ? "bg-accent border-primary" : ""
                        )}
                      >
                        This Month
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleQuickRange('lastMonth')}
                        disabled={isLoadingDates}
                        className="text-xs h-8"
                      >
                        Last Month
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleQuickRange('last30Days')}
                        disabled={isLoadingDates}
                        className="text-xs h-8"
                      >
                        Last 30 Days
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleQuickRange('allTime')}
                        disabled={isLoadingDates}
                        className="text-xs h-8"
                      >
                        All Time
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Export Section */}
                <div className="border-t pt-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Download className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-medium text-sm md:text-base">Export to Excel</h3>
                    </div>
                    
                    <div className="bg-muted/30 rounded-lg p-3 md:p-4">
                      <p className="text-xs md:text-sm text-muted-foreground mb-3">
                        Export your expense data as a formatted Excel report
                        {dateRange?.from && dateRange.to && (
                          <>
                            <br className="md:hidden" />
                            <span className="font-medium text-foreground">
                              {' '}from {format(dateRange.from, 'MMM d, yyyy')} to {format(dateRange.to, 'MMM d, yyyy')}
                            </span>
                          </>
                        )}
                      </p>
                      
                      <Button
                        onClick={handleExportExcel}
                        disabled={isExporting || !dateRange?.from || !dateRange?.to}
                        className="w-full md:w-auto"
                        size="default"
                      >
                        {isExporting ? (
                          <>
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Exporting...
                          </>
                        ) : (
                          <>
                            <FileSpreadsheet className="mr-2 h-4 w-4" />
                            Export to Excel
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
<div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
              {/* Category Spending Pie Chart */}
              <CategorySpendingChart 
                data={categorySpending}
                isLoading={isLoadingCharts}
              />
              
              {/* Daily Spending Trend */}
              <DailySpendingTrend 
                data={dailySpending}
                isLoading={isLoadingCharts}
              />
            </div>
            
            {/* Monthly Category Spending */}
            <MonthlyCategorySpending 
              data={monthlyCategoryData}
              categories={categories}
              isLoading={isLoadingCharts}
            />
            
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
              {/* Year-over-Year Card */}
              <YearOverYearChart 
                expenses={yearlyExpenses} 
                isLoading={isLoadingYearlyData} 
              />

              {/* Trend Analysis Card */}
              <SpendingTrendChart 
                trendData={trendData} 
                isLoading={isLoadingCharts} 
              />
            </div>
            
            {/* Recent Transactions Table */}
            <ExpensesTable 
              expenses={recentExpenses}
              isLoading={isLoadingCharts}
            />
          </TabsContent>
        </Tabs>

        {/* Help Text for Mobile */}
        <div className="md:hidden">
          <Card className="border-dashed">
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground text-center">
                💡 Tip: Use landscape mode for better chart viewing experience
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}