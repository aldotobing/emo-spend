"use client";

import { useState, useEffect } from "react";
import { format, subMonths, startOfMonth, endOfMonth, isBefore, isAfter, isSameDay, startOfYear, subYears } from "date-fns";
import { Calendar as CalendarIcon, Download, FileSpreadsheet, BarChart2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { exportExpensesToExcel, downloadExcel } from "@/lib/excel-export";
import { Calendar } from "@/components/ui/calendar";
import { getExpenses, getExpensesByDateRange } from "@/lib/db";
import { YearOverYearChart } from "@/components/year-over-year-chart";
import { SpendingTrendChart } from "@/components/spending-trend-chart";
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
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: defaultStartDate,
    to: defaultEndDate,
  });
  const [oldestExpenseDate, setOldestExpenseDate] = useState<Date | null>(null);
  const [isLoadingDates, setIsLoadingDates] = useState(true);
  const [yearlyExpenses, setYearlyExpenses] = useState<Array<{ date: string; amount: number }>>([]);
  const [isLoadingYearlyData, setIsLoadingYearlyData] = useState(true);
  const [trendData, setTrendData] = useState<Array<{ month: string; amount: number }>>([]);

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
    loadYearlyExpenses();
    loadTrendData();
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
      toast({
        title: "Error",
        description: "Failed to load yearly expense data",
        variant: "destructive",
      });
    } finally {
      setIsLoadingYearlyData(false);
    }
  };

  // Load trend data for the last 12 months
  const loadTrendData = async () => {
    try {
      const now = new Date();
      const twelveMonthsAgo = subMonths(now, 11);
      const startDate = startOfMonth(twelveMonthsAgo).toISOString().split('T')[0];
      const endDate = endOfMonth(now).toISOString().split('T')[0];
      
      const expenses = await getExpensesByDateRange(startDate, endDate);
      
      // Group by month
      const monthlyData = new Map();
      const months = [];
      
      // Initialize all months with 0
      let current = startOfMonth(twelveMonthsAgo);
      while (current <= now) {
        const monthKey = format(current, 'MMM yyyy');
        monthlyData.set(monthKey, 0);
        months.push(monthKey);
        current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
      }
      
      // Sum expenses by month
      expenses.forEach(expense => {
        const date = new Date(expense.date);
        const monthKey = format(date, 'MMM yyyy');
        monthlyData.set(monthKey, (monthlyData.get(monthKey) || 0) + expense.amount);
      });
      
      // Convert to array for the chart
      const trendData = months.map(month => ({
        month,
        amount: monthlyData.get(month) || 0
      }));
      
      setTrendData(trendData);
    } catch (error) {
      console.error('Error loading trend data:', error);
      toast({
        title: "Error",
        description: "Failed to load trend data",
        variant: "destructive",
      });
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
      
      toast({
        title: "Export successful",
        description: "Your expense data has been exported to Excel.",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
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
            {/* Year-over-Year Card */}
            <Card>
              <CardHeader>
                <CardTitle>Year-over-Year Comparison</CardTitle>
                <CardDescription>
                  Compare your spending between the current and previous year
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingYearlyData ? (
                  <div className="space-y-4">
                    <Skeleton className="h-[300px] w-full" />
                  </div>
                ) : (
                  <YearOverYearChart 
                    expenses={yearlyExpenses} 
                    isLoading={isLoadingYearlyData} 
                  />
                )}
              </CardContent>
              <CardFooter>
                <p className="text-xs text-muted-foreground">
                  Data shown for {new Date().getFullYear()} and {new Date().getFullYear() - 1}
                </p>
              </CardFooter>
            </Card>

            {/* Trend Analysis Card */}
            <SpendingTrendChart 
              trendData={trendData} 
              isLoading={isLoadingYearlyData} 
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