"use client";

import { useState } from "react";
import { format, subMonths, startOfMonth, endOfMonth, isBefore, isAfter, isSameDay, startOfYear } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { exportExpensesToExcel, downloadExcel } from "@/lib/excel-export";
import { Calendar } from "@/components/ui/calendar";
import { getExpenses } from "@/lib/db";
import { useEffect } from "react";
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">Generate and export your financial reports</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Export Reports</CardTitle>
          <CardDescription>
            Generate and download your financial data in various formats
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Select Date Range</h3>
              <div className="flex flex-col sm:flex-row gap-4">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date"
                      variant={"outline"}
                      className={cn(
                        "w-full sm:w-[300px] justify-start text-left font-normal",
                        !dateRange && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd, y")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={handleDateRangeSelect}
                      numberOfMonths={2}
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                    />
                  </PopoverContent>
                </Popover>
                
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleQuickRange('thisMonth')}
                    disabled={isLoadingDates}
                    className={cn(
                      "text-xs",
                      dateRange?.from?.getMonth() === new Date().getMonth() &&
                      dateRange?.from?.getFullYear() === new Date().getFullYear() ? "bg-accent" : ""
                    )}
                  >
                    This Month
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleQuickRange('lastMonth')}
                    className="text-xs"
                  >
                    Last Month
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleQuickRange('last30Days')}
                    className="text-xs"
                  >
                    Last 30 Days
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleQuickRange('allTime')}
                    className="text-xs"
                  >
                    All Time
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-4">
              <h3 className="font-medium">Export to Excel</h3>
              <p className="text-sm text-muted-foreground">
                Export your expense data as a formatted Excel report
                {dateRange?.from && dateRange.to && (
                  <span className="font-medium">
                    {' '}from {format(dateRange.from, 'MMM d, yyyy')} to {format(dateRange.to, 'MMM d, yyyy')}
                  </span>
                )}
              </p>
              <Button
                variant="outline"
                onClick={handleExportExcel}
                disabled={isExporting}
                className="mt-2"
              >
                {isExporting ? "Exporting..." : "Export to Excel"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
