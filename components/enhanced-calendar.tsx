"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { Expense } from "@/types/expense";
import { getMood } from "@/data/moods";
import {
  format,
  isToday,
  isSameMonth,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  getDay,
  getDate,
} from "date-fns";
import { id } from "date-fns/locale";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar as CalendarIcon, TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface EnhancedCalendarProps {
  selectedMood?: string;
  expenses: Expense[];
  isLoading: boolean;
}

export function EnhancedCalendar({ selectedMood, expenses, isLoading }: EnhancedCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [monthSummary, setMonthSummary] = useState<{
    totalSpent: number;
    highestDay: { date: Date; amount: number } | null;
    lowestDay: { date: Date; amount: number } | null;
    avgPerDay: number;
    daysWithExpenses: number;
  }>({ totalSpent: 0, highestDay: null, lowestDay: null, avgPerDay: 0, daysWithExpenses: 0 });

  // Filter expenses for the current month and selected mood
  const filteredExpenses = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    
    return expenses.filter((expense) => {
      const expenseDate = new Date(expense.date);
      return (
        expenseDate >= start && 
        expenseDate <= end &&
        (selectedMood ? expense.mood === selectedMood : true)
      );
    });
  }, [expenses, currentMonth, selectedMood]);

  // Group expenses by day
  const expensesByDay = useMemo(() => {
    const result = new Map<string, {
      expenses: Expense[];
      totalAmount: number;
      dominantMood: string | null;
      categoryCounts: Record<string, { count: number; amount: number }>;
      expenseCount: number;
    }>();
    
    filteredExpenses.forEach((expense) => {
      const dateKey = format(new Date(expense.date), 'yyyy-MM-dd');
      
      if (!result.has(dateKey)) {
        result.set(dateKey, {
          expenses: [],
          totalAmount: 0,
          dominantMood: null,
          categoryCounts: {},
          expenseCount: 0
        });
      }
      
      const dayData = result.get(dateKey)!;
      dayData.expenses.push(expense);
      dayData.totalAmount += expense.amount;
      dayData.expenseCount += 1;
      
      // Update category counts
      if (!dayData.categoryCounts[expense.category]) {
        dayData.categoryCounts[expense.category] = { count: 0, amount: 0 };
      }
      dayData.categoryCounts[expense.category].count += 1;
      dayData.categoryCounts[expense.category].amount += expense.amount;
    });
    
    // Calculate dominant mood for each day
    result.forEach((dayData) => {
      if (dayData.expenses.length > 0) {
        const moodCounts: Record<string, number> = {};
        dayData.expenses.forEach((expense) => {
          moodCounts[expense.mood] = (moodCounts[expense.mood] || 0) + 1;
        });
        
        dayData.dominantMood = Object.entries(moodCounts).reduce(
          (max, [mood, count]) => (count > max.count ? { mood, count } : max),
          { mood: "", count: 0 }
        ).mood;
      }
    });
    
    return result;
  }, [filteredExpenses]);

  // Calculate month summary
  useEffect(() => {
    if (!isLoading && expensesByDay.size > 0) {
      const daysWithExpenses = Array.from(expensesByDay.values()).filter(day => day.totalAmount > 0);
      const totalSpent = daysWithExpenses.reduce((sum, day) => sum + day.totalAmount, 0);
      
      let highestDay: { date: Date; amount: number } | null = null;
      let lowestDay: { date: Date; amount: number } | null = null;
      
      expensesByDay.forEach((dayData, dateKey) => {
        if (dayData.totalAmount > 0) {
          const date = new Date(dateKey);
          if (!highestDay || dayData.totalAmount > highestDay.amount) {
            highestDay = { date, amount: dayData.totalAmount };
          }
          if (!lowestDay || (dayData.totalAmount < lowestDay.amount)) {
            lowestDay = { date, amount: dayData.totalAmount };
          }
        }
      });
      
      setMonthSummary({
        totalSpent,
        highestDay,
        lowestDay,
        avgPerDay: daysWithExpenses.length > 0 ? totalSpent / daysWithExpenses.length : 0,
        daysWithExpenses: daysWithExpenses.length
      });
    }
  }, [isLoading, expensesByDay]);

  // Format currency helper
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Get intensity level based on amount
  const getIntensityLevel = (amount: number) => {
    if (amount === 0) return 0;
    if (amount < 10000) return 1;
    if (amount < 50000) return 2;
    if (amount < 100000) return 3;
    if (amount < 200000) return 4;
    return 5;
  };

  // Generate days for the current month
  const days = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth),
    });
  }, [currentMonth]);

  // Navigate to previous month
  const goToPreviousMonth = () => {
    setCurrentMonth((prevMonth) => subMonths(prevMonth, 1));
  };

  // Navigate to next month
  const goToNextMonth = () => {
    setCurrentMonth((prevMonth) => addMonths(prevMonth, 1));
  };

  // Tooltip component for handling both hover (desktop) and tap (mobile) interactions
  const CalendarTooltip = ({ children, content }: { children: React.ReactNode, content: React.ReactNode }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [placement, setPlacement] = useState<{ vertical: 'top' | 'bottom', horizontal: 'left' | 'center' | 'right' }>({ 
      vertical: 'top', 
      horizontal: 'center' 
    });
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const childRef = useRef<HTMLDivElement>(null);
    const isMobile = useRef(typeof window !== 'undefined' && window.innerWidth < 768);
    const isHovering = useRef(false);
    
    // Calculate optimal placement based on position and window boundaries
    const calculatePlacement = useCallback((x: number, y: number, element: HTMLElement | null) => {
      if (!element || typeof window === 'undefined') return { vertical: 'top' as const, horizontal: 'center' as const };
      
      const rect = element.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      
      // Tooltip dimensions (estimated if not yet rendered)
      const tooltipWidth = tooltipRef.current?.offsetWidth || 200;
      const tooltipHeight = tooltipRef.current?.offsetHeight || 150;
      
      // Determine horizontal placement
      let horizontal: 'left' | 'center' | 'right' = 'center';
      
      // For mobile, check against window boundaries
      if (isMobile.current) {
        // If we're in the right third of the screen, show tooltip to the left
        if (x > windowWidth * 0.7) {
          horizontal = 'right';
        }
        // If we're in the left third of the screen, show tooltip to the right
        else if (x < windowWidth * 0.3) {
          horizontal = 'left';
        }
      } else {
        // For desktop, check the cell position relative to its container
        const calendarContainer = document.querySelector('.calendar-container');
        if (calendarContainer) {
          const containerRect = calendarContainer.getBoundingClientRect();
          const relativeX = x - containerRect.left;
          const containerWidth = containerRect.width;
          
          // If the cell is in the right third of the calendar
          if (relativeX > containerWidth * 0.7) {
            horizontal = 'right';
          }
          // If the cell is in the left third of the calendar
          else if (relativeX < containerWidth * 0.3) {
            horizontal = 'left';
          }
        }
      }
      
      // Determine vertical placement
      let vertical: 'top' | 'bottom' = 'top';
      if (y < tooltipHeight + 50) { // Add some buffer
        vertical = 'bottom';
      }
      
      return { vertical, horizontal };
    }, []);
    
    // Handle touch start for mobile
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
      if (!isMobile.current) return;
      
      // Prevent default to avoid any default touch behaviors
      e.preventDefault();
      
      const touch = e.touches[0];
      const x = touch.clientX;
      const y = touch.clientY;
      
      setPosition({ x, y });
      setPlacement(calculatePlacement(x, y, e.currentTarget as HTMLElement));
      
      // Show tooltip immediately on touch start
      setShowTooltip(true);
      
      // Clear any existing timeout to prevent multiple tooltips
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Auto-hide the tooltip after 3 seconds
      timeoutRef.current = setTimeout(() => {
        if (!isHovering.current) {
          setShowTooltip(false);
        }
      }, 3000);
    }, [calculatePlacement]);
    
    // Handle touch end for mobile
    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
      if (!isMobile.current) return;
      e.preventDefault();
      // Don't hide the tooltip on touch end, let the timeout handle it
    }, []);
    
    // Handle mouse enter for desktop
    const handleMouseEnter = useCallback((e: React.MouseEvent) => {
      isHovering.current = true;
      
      if (!isMobile.current) {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top;
        
        setPosition({ x, y });
        setPlacement(calculatePlacement(x, y, e.currentTarget as HTMLElement));
        setShowTooltip(true);
        
        // Clear any existing timeout when hovering
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      }
    }, [calculatePlacement]);
    
    // Handle mouse leave for desktop
    const handleMouseLeave = useCallback(() => {
      isHovering.current = false;
      
      if (!isMobile.current) {
        // Add a small delay before hiding to allow moving to the tooltip
        timeoutRef.current = setTimeout(() => {
          setShowTooltip(false);
        }, 300);
      }
    }, []);
    
    // Handle mouse enter on the tooltip itself to keep it visible when hovering over it
    const handleTooltipMouseEnter = useCallback(() => {
      isHovering.current = true;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    }, []);
    
    // Handle mouse leave from the tooltip
    const handleTooltipMouseLeave = useCallback(() => {
      isHovering.current = false;
      setShowTooltip(false);
    }, []);
    
    // Get tooltip style based on placement
    const getTooltipStyle = useCallback(() => {
      if (isMobile.current) {
        // Mobile styles - position near the touch point
        const baseStyle = {
          position: 'fixed' as const,
          maxWidth: '250px',
          width: 'max-content'
        };
        
        // Adjust position based on placement
        if (placement.vertical === 'top') {
          // Horizontal placement adjustments for mobile
          if (placement.horizontal === 'right') {
            // For right edge, position tooltip to the left of the touch point
            return {
              ...baseStyle,
              right: `${window.innerWidth - position.x + 20}px`,
              left: 'auto',
              top: `${position.y - 20}px`,
              transform: 'translateY(-100%)'
            };
          } else if (placement.horizontal === 'left') {
            // For left edge, position tooltip to the right of the touch point
            return {
              ...baseStyle,
              left: `${position.x + 20}px`,
              right: 'auto',
              top: `${position.y - 20}px`,
              transform: 'translateY(-100%)'
            };
          } else {
            // Center (default)
            return {
              ...baseStyle,
              left: `${position.x}px`,
              top: `${position.y - 20}px`,
              transform: 'translate(-50%, -100%)'
            };
          }
        } else {
          // Bottom placement with similar horizontal adjustments
          if (placement.horizontal === 'right') {
            return {
              ...baseStyle,
              right: `${window.innerWidth - position.x + 20}px`,
              left: 'auto',
              top: `${position.y + 50}px`,
            };
          } else if (placement.horizontal === 'left') {
            return {
              ...baseStyle,
              left: `${position.x + 20}px`,
              right: 'auto',
              top: `${position.y + 50}px`,
            };
          } else {
            return {
              ...baseStyle,
              left: `${position.x}px`,
              top: `${position.y + 50}px`,
              transform: 'translateX(-50%)'
            };
          }
        }
      } else {
        // Desktop styles - position relative to the calendar cell
        return {
          position: 'absolute' as const,
          [placement.vertical]: '100%',
          ...(placement.horizontal === 'center' ? { left: '50%' } : {}),
          ...(placement.horizontal === 'left' ? { left: '0' } : {}),
          ...(placement.horizontal === 'right' ? { right: '0' } : {}),
          transform: getTransformStyle(placement),
          margin: placement.vertical === 'top' ? '0 0 0.5rem 0' : '0.5rem 0 0 0',
          maxWidth: '250px',
          width: 'max-content'
        };
      }
    }, [placement, position.x, position.y]);
    
    // Get transform style based on placement
    const getTransformStyle = useCallback((p: typeof placement) => {
      if (p.horizontal === 'center') {
        return p.vertical === 'top' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)';
      } else if (p.horizontal === 'left') {
        return p.vertical === 'top' ? 'translateY(-100%)' : 'none';
      } else { // right
        return p.vertical === 'top' ? 'translateY(-100%)' : 'none';
      }
    }, []);
    
    // Get arrow style based on placement
    const getArrowStyle = useCallback(() => {
      const baseStyle = {
        position: 'absolute' as const,
        zIndex: 50
      };
      
      if (placement.vertical === 'top') {
        return {
          ...baseStyle,
          bottom: '-4px',
          ...(placement.horizontal === 'center' ? { left: '50%', transform: 'translateX(-50%) rotate(45deg)' } : {}),
          ...(placement.horizontal === 'left' ? { left: '15px', transform: 'rotate(45deg)' } : {}),
          ...(placement.horizontal === 'right' ? { right: '15px', transform: 'rotate(45deg)' } : {})
        };
      } else {
        return {
          ...baseStyle,
          top: '-4px',
          ...(placement.horizontal === 'center' ? { left: '50%', transform: 'translateX(-50%) rotate(45deg)' } : {}),
          ...(placement.horizontal === 'left' ? { left: '15px', transform: 'rotate(45deg)' } : {}),
          ...(placement.horizontal === 'right' ? { right: '15px', transform: 'rotate(45deg)' } : {})
        };
      }
    }, [placement]);
    
    return (
      <div 
        ref={childRef}
        className="relative"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
        {showTooltip && (
          <div 
            ref={tooltipRef}
            className="absolute z-50 bg-popover text-popover-foreground shadow-md rounded-md p-3 text-sm animate-in fade-in-0 zoom-in-95 cursor-default"
            style={getTooltipStyle()}
            onMouseEnter={handleTooltipMouseEnter}
            onMouseLeave={handleTooltipMouseLeave}
          >
            {content}
            <div 
              className="w-2 h-2 bg-popover"
              style={getArrowStyle()}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-3 sm:pb-2 sm:pt-4 sm:px-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium sm:text-lg">Kalender</h3>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={goToPreviousMonth}
              className="h-6 w-6 sm:h-7 sm:w-7"
            >
              <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
            <span className="font-medium text-xs sm:text-sm whitespace-nowrap">
              {format(currentMonth, "MMM yyyy", { locale: id })}
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={goToNextMonth}
              className="h-6 w-6 sm:h-7 sm:w-7"
            >
              <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Month Summary */}
        {!isLoading && (
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Pengeluaran</p>
                  <p className="text-2xl font-bold">{formatCurrency(monthSummary.totalSpent)}</p>
                </div>
                {monthSummary.highestDay && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-4 w-4 text-destructive" /> Pengeluaran Tertinggi
                    </p>
                    <p className="text-xl font-bold">{formatCurrency(monthSummary.highestDay.amount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(monthSummary.highestDay.date, "EEEE, d MMMM", { locale: id })}
                    </p>
                  </div>
                )}
                {monthSummary.lowestDay && monthSummary.daysWithExpenses > 1 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <TrendingDown className="h-4 w-4 text-primary" /> Pengeluaran Terendah
                    </p>
                    <p className="text-xl font-bold">{formatCurrency(monthSummary.lowestDay.amount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(monthSummary.lowestDay.date, "EEEE, d MMMM", { locale: id })}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Rata-rata per Hari</p>
                  <p className="text-xl font-bold">{formatCurrency(monthSummary.avgPerDay)}</p>
                  <p className="text-xs text-muted-foreground">
                    Dari {monthSummary.daysWithExpenses} hari dengan pengeluaran
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {isLoading ? (
          <Skeleton className="h-[350px] w-full" />
        ) : (
          <div className="calendar-container">
            {/* Calendar Header - Days of Week */}
            <div className="grid grid-cols-7 mb-2">
              {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((day) => (
                <div key={day} className="text-center text-xs font-medium py-1 text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 md:gap-2">
              {/* Empty cells for days before the first day of the month */}
              {Array.from({ length: getDay(days[0]) }).map((_, index) => (
                <div key={`empty-start-${index}`} className="aspect-square rounded-md bg-muted/20" />
              ))}
              
              {/* Calendar days */}
              {days.map((date) => {
                const dateKey = format(date, 'yyyy-MM-dd');
                const dayData = expensesByDay.get(dateKey);
                const hasExpenses = !!dayData && dayData.totalAmount > 0;
                const mood = dayData?.dominantMood ? getMood(dayData.dominantMood) : null;
                const intensity = dayData ? getIntensityLevel(dayData.totalAmount) : 0;
                const isCurrentDay = isToday(date);
                
                return (
                  <CalendarTooltip 
                    key={dateKey} 
                    content={
                      hasExpenses && dayData ? (
                        <div className="max-w-[220px]">
                          <div className="flex items-center justify-between border-b pb-1.5 mb-2">
                            <p className="font-medium text-xs">{format(date, "EEEE", { locale: id })}</p>
                            <p className="font-bold text-xs">{format(date, "d MMM yyyy", { locale: id })}</p>
                          </div>
                          
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                              {mood && <span className="mr-1.5 text-base">{mood.emoji}</span>}
                              <span className="text-xs">{dayData.expenseCount} transaksi</span>
                            </div>
                            <p className="font-bold text-sm text-primary">{formatCurrency(dayData.totalAmount)}</p>
                          </div>
                          
                          {Object.entries(dayData.categoryCounts).length > 0 && (
                            <div className="border-t pt-1.5">
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Kategori</p>
                              <div className="grid gap-1">
                                {Object.entries(dayData.categoryCounts)
                                  .sort((a, b) => b[1].amount - a[1].amount) // Sort by amount (highest first)
                                  .map(([category, data]) => (
                                    <div key={category} className="flex justify-between text-xs items-center">
                                      <span className="truncate mr-2">{category}</span>
                                      <span className="font-medium tabular-nums">{formatCurrency(data.amount)}</span>
                                    </div>
                                  ))
                                }
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-1">
                          <p className="font-medium text-xs">{format(date, "d MMMM yyyy", { locale: id })}</p>
                          <p className="text-xs text-muted-foreground mt-1">Tidak ada pengeluaran</p>
                        </div>
                      )
                    }
                  >
                    <div 
                      className={cn(
                        "aspect-square rounded-md flex flex-col items-center justify-center transition-all touch-none",
                        isCurrentDay ? "ring-2 ring-primary" : "",
                        hasExpenses ? "cursor-pointer active:bg-muted" : "cursor-default"
                      )}
                      style={{
                        backgroundColor: hasExpenses && mood 
                          ? `${mood.color}${intensity * 20}` 
                          : "var(--card)",
                        border: "1px solid var(--border)",
                        WebkitTapHighlightColor: 'transparent'
                      }}
                      onTouchStart={(e) => e.stopPropagation()}
                    >
                      <div className="flex flex-col items-center">
                        <span className={cn(
                          "text-xs font-medium",
                          isCurrentDay ? "text-primary font-bold" : ""
                        )}>
                          {getDate(date)}
                        </span>
                        {hasExpenses && dayData && (
                          <div className="flex flex-col items-center mt-1 text-[9px]">
                            <span className="font-medium hidden sm:inline">
                              {formatCurrency(dayData.totalAmount).replace('Rp', '')}
                            </span>
                            {mood && <span>{mood.emoji}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </CalendarTooltip>

                );
              })}
              
              {/* Empty cells for days after the last day of the month */}
              {Array.from({ length: 6 - getDay(days[days.length - 1]) }).map((_, index) => (
                <div key={`empty-end-${index}`} className="aspect-square rounded-md bg-muted/20" />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
