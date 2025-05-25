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
    const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
    
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
      
      const touch = e.touches[0];
      const x = touch.clientX;
      const y = touch.clientY;
      
      // Store touch start position and time
      touchStartRef.current = { x, y, time: Date.now() };
      
      // Don't prevent default here to avoid passive event warning
      // We'll handle the actual touch in a ref callback
    }, []);
    
    // Handle touch move to detect if it's a scroll
    const handleTouchMove = useCallback((e: TouchEvent) => {
      if (!touchStartRef.current) return;
      
      const touch = e.touches[0];
      const dx = Math.abs(touch.clientX - touchStartRef.current.x);
      const dy = Math.abs(touch.clientY - touchStartRef.current.y);
      
      // If the touch moved significantly, it's probably a scroll
      if (dx > 5 || dy > 5) {
        touchStartRef.current = null;
      }
    }, []);
    
    // Handle touch end for mobile
    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
      if (!isMobile.current || !touchStartRef.current) return;
      
      const touch = e.changedTouches[0];
      const x = touch.clientX;
      const y = touch.clientY;
      
      // Check if this was a tap (not a scroll)
      const dx = Math.abs(x - touchStartRef.current.x);
      const dy = Math.abs(y - touchStartRef.current.y);
      const dt = Date.now() - touchStartRef.current.time;
      
      if (dx < 10 && dy < 10 && dt < 300) {
        // It's a tap, show the tooltip
        const target = e.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();
        
        // Check if touch is within the target element
        if (
          x >= rect.left - 10 && 
          x <= rect.right + 10 && 
          y >= rect.top - 10 && 
          y <= rect.bottom + 10
        ) {
          // Hide any existing tooltip first to avoid flickering
          setShowTooltip(false);
          
          // Use a small delay to ensure state updates are processed
          setTimeout(() => {
            setPosition({ x, y });
            setPlacement(calculatePlacement(x, y, target));
            setShowTooltip(true);
            
            // Clear any existing timeout to prevent multiple tooltips
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }
            
            // Auto-hide the tooltip after 5 seconds (slightly longer for better UX)
            timeoutRef.current = setTimeout(() => {
              setShowTooltip(false);
            }, 5000);
          }, 50);
        }
      }
      
      touchStartRef.current = null;
    }, [calculatePlacement]);
    
    // Handle document click to close tooltip when clicking outside
    const handleDocumentClick = useCallback((e: MouseEvent | TouchEvent) => {
      if (!isMobile.current || !showTooltip || !tooltipRef.current) return;
      
      let target: Node | null = null;
      
      // Handle both TouchEvent and MouseEvent
      if ('touches' in e) {
        if (e.touches.length > 0) {
          target = document.elementFromPoint(
            e.touches[0].clientX,
            e.touches[0].clientY
          ) as Node;
        }
      } else {
        target = e.target as Node;
      }
      
      if (!target) return;
      
      // If the click is outside the tooltip and not on the child element
      if (!tooltipRef.current.contains(target) && !childRef.current?.contains(target)) {
        setShowTooltip(false);
      }
    }, [showTooltip]);
    
    // Add event listeners for touch move and document click
    useEffect(() => {
      if (isMobile.current) {
        // Add passive touch move listener to detect scrolls
        document.addEventListener('touchmove', handleTouchMove as any, { passive: true });
        document.addEventListener('click', handleDocumentClick as any, true);
        document.addEventListener('touchend', handleDocumentClick as any, true);
        
        return () => {
          document.removeEventListener('touchmove', handleTouchMove as any);
          document.removeEventListener('click', handleDocumentClick as any, true);
          document.removeEventListener('touchend', handleDocumentClick as any, true);
        };
      }
    }, [handleTouchMove, handleDocumentClick]);
    
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
    const getTooltipStyle = useCallback((): React.CSSProperties => {
      if (isMobile.current) {
        // Mobile styles - position near the touch point
        const baseStyle: React.CSSProperties = {
          position: 'fixed',
          maxWidth: '90vw', // Use viewport width instead of fixed width
          width: 280, // Use number for better TypeScript compatibility
          zIndex: 9999,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          borderRadius: 12,
          padding: 12,
          backgroundColor: 'var(--background)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
          maxHeight: '70vh', // Prevent tooltip from being too tall
          overflowY: 'auto' as const, // Properly type the overflowY property
          WebkitOverflowScrolling: 'touch' as any, // Type assertion for webkit prefixed property
        };

        // Calculate safe area insets for notches and home indicators
        const safeAreaInsetBottom = typeof window !== 'undefined' 
          ? parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sab') || '0', 10) 
          : 0;
        
        // Get viewport dimensions
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight - safeAreaInsetBottom;
        
        // Estimate tooltip dimensions (will be adjusted after render)
        const tooltipWidth = Math.min(280, viewportWidth * 0.9);
        const tooltipHeight = 180; // Initial estimate, will be adjusted
        
        // Calculate initial position centered on touch point
        let left = position.x - (tooltipWidth / 2);
        let top = position.y + 20; // Position below touch point by default
        
        // Adjust horizontal position to keep tooltip within viewport
        if (left < 10) {
          left = 10;
        } else if (left + tooltipWidth > viewportWidth - 10) {
          left = viewportWidth - tooltipWidth - 10;
        }
        
        // Adjust vertical position based on available space
        const spaceAbove = position.y - 20; // Space above touch point
        const spaceBelow = viewportHeight - position.y - 40; // Space below touch point
        
        if (spaceBelow < tooltipHeight && spaceAbove > spaceBelow) {
          // If more space above and not enough below, position above
          top = position.y - tooltipHeight - 20;
        } else {
          // Default to below, but ensure it doesn't go off screen
          top = Math.min(viewportHeight - tooltipHeight - 20, top);
        }
        
        // Ensure minimum distance from edges
        top = Math.max(10, Math.min(viewportHeight - tooltipHeight - 20, top));
        
        return {
          ...baseStyle,
          left: `${left}px`,
          top: `${top}px`,
          transform: 'none',
          opacity: showTooltip ? 1 : 0, // Fade in/out
          transition: 'opacity 0.15s ease-out, transform 0.15s ease-out',
          pointerEvents: showTooltip ? 'auto' : 'none' // Prevent blocking interactions when hidden
        };
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
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
        {showTooltip && (
          <div 
            ref={tooltipRef}
            className={cn(
              "z-50 bg-popover text-popover-foreground shadow-lg rounded-lg p-3 text-sm animate-in fade-in-0 zoom-in-95 cursor-default",
              "transition-all duration-200 ease-out",
              isMobile.current ? "fixed" : "absolute"
            )}
            style={{
              ...getTooltipStyle(),
              pointerEvents: 'auto',
              touchAction: 'none',
              WebkitTapHighlightColor: 'transparent'
            }}
            onMouseEnter={handleTooltipMouseEnter}
            onMouseLeave={handleTooltipMouseLeave}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
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
    <Card className="overflow-hidden border-0 shadow-lg dark:shadow-gray-800/30 transition-all duration-300 hover:shadow-xl dark:hover:shadow-gray-800/50">
      <CardHeader className="p-2 sm:p-4 sm:px-6 sm:py-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm sm:text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
              Kalender
              <span className="hidden xs:inline"> Pengeluaran</span>
            </h3>
            <p className="text-[10px] xs:text-xs text-muted-foreground mt-0.5">Lacak pengeluaran harian</p>
          </div>
          <div className="flex items-center gap-1 xs:gap-2 bg-white/50 dark:bg-gray-800/50 rounded-lg p-0.5 xs:p-1 border border-gray-100 dark:border-gray-700">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={goToPreviousMonth}
              className="h-7 w-7 xs:h-8 xs:w-8 p-0 rounded-md hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5 xs:h-4 xs:w-4" />
            </Button>
            <span className="font-medium text-xs xs:text-sm whitespace-nowrap px-1.5 xs:px-2 text-gray-700 dark:text-gray-200">
              <span className="hidden sm:inline">{format(currentMonth, "MMMM yyyy", { locale: id })}</span>
              <span className="sm:hidden">{format(currentMonth, "MMM yyyy", { locale: id })}</span>
            </span>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={goToNextMonth}
              className="h-7 w-7 xs:h-8 xs:w-8 p-0 rounded-md hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5 xs:h-4 xs:w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-6">
        {/* Month Summary */}
        {!isLoading && (
          <Card className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 divide-x divide-y md:divide-y-0 divide-gray-100 dark:divide-gray-700 text-center sm:text-left">
                <div className="p-2 sm:p-3 md:p-4 lg:p-5">
                  <p className="text-[10px] xs:text-xs font-medium text-muted-foreground mb-0.5 sm:mb-1 flex items-center justify-center sm:justify-start">Total Pengeluaran</p>
                  <p className="text-lg xs:text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                    {formatCurrency(monthSummary.totalSpent)}
                  </p>
                </div>
                {monthSummary.highestDay && (
                  <div className="p-2 sm:p-3 md:p-4 lg:p-5">
                    <p className="text-[10px] xs:text-xs font-medium text-muted-foreground mb-0.5 sm:mb-1 flex items-center justify-center sm:justify-start gap-1">
                      <TrendingUp className="h-3 w-3 xs:h-3.5 xs:w-3.5 text-red-500 flex-shrink-0" />
                      <span className="truncate">Pengeluaran Tertinggi</span>
                    </p>
                    <p className="text-base xs:text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100">
                      {formatCurrency(monthSummary.highestDay.amount)}
                    </p>
                    <p className="text-[10px] xs:text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {format(monthSummary.highestDay.date, "EEE, d MMM", { locale: id })}
                    </p>
                  </div>
                )}
                {monthSummary.lowestDay && monthSummary.daysWithExpenses > 1 && (
                  <div className="p-2 sm:p-3 md:p-4 lg:p-5">
                    <p className="text-[10px] xs:text-xs font-medium text-muted-foreground mb-0.5 sm:mb-1 flex items-center justify-center sm:justify-start gap-1">
                      <TrendingDown className="h-3 w-3 xs:h-3.5 xs:w-3.5 text-emerald-500 flex-shrink-0" />
                      <span className="truncate">Pengeluaran Terendah</span>
                    </p>
                    <p className="text-base xs:text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100">
                      {formatCurrency(monthSummary.lowestDay.amount)}
                    </p>
                    <p className="text-[10px] xs:text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {format(monthSummary.lowestDay.date, "EEE, d MMM", { locale: id })}
                    </p>
                  </div>
                )}
                <div className="p-2 sm:p-3 md:p-4 lg:p-5">
                  <p className="text-[10px] xs:text-xs font-medium text-muted-foreground mb-0.5 sm:mb-1">Rata-rata per Hari</p>
                  <p className="text-base xs:text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100">
                    {formatCurrency(monthSummary.avgPerDay)}
                  </p>
                  <p className="text-[10px] xs:text-xs text-muted-foreground mt-0.5">
                    <span className="font-medium text-foreground">{monthSummary.daysWithExpenses} hari</span> dengan pengeluaran
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
            <div className="grid grid-cols-7 mb-2 sm:mb-3">
              {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((day, i) => (
                <div 
                  key={day} 
                  className={cn(
                    "text-center text-[10px] xs:text-xs font-medium py-1.5 sm:py-2 text-muted-foreground",
                    i === 0 && "text-red-500 dark:text-red-400", // Sunday
                    i === 6 && "text-blue-500 dark:text-blue-400"  // Saturday
                  )}
                >
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 xs:gap-1.5 sm:gap-2.5">
              {/* Empty cells for days before the first day of the month */}
              {Array.from({ length: getDay(days[0]) }).map((_, index) => (
                <div 
                  key={`empty-start-${index}`} 
                  className="aspect-square rounded-lg bg-muted/10 dark:bg-muted/20" 
                />
              ))}
              
              {/* Calendar days */}
              {days.map((date) => {
                const dateKey = format(date, 'yyyy-MM-dd');
                const dayData = expensesByDay.get(dateKey);
                const hasExpenses = !!dayData && dayData.totalAmount > 0;
                const mood = dayData?.dominantMood ? getMood(dayData.dominantMood) : null;
                const intensity = dayData ? getIntensityLevel(dayData.totalAmount) : 0;
                const isCurrentDay = isToday(date);
                const isWeekend = [0, 6].includes(getDay(date));
                
                // Calculate background color based on intensity
                const bgIntensity = [
                  'bg-gray-50 dark:bg-gray-900/30',
                  'bg-blue-50 dark:bg-blue-900/20',
                  'bg-blue-100 dark:bg-blue-900/30',
                  'bg-blue-200 dark:bg-blue-800/40',
                  'bg-blue-300 dark:bg-blue-700/40',
                  'bg-blue-400 dark:bg-blue-600/50'
                ][intensity];
                
                return (
                  <CalendarTooltip 
                    key={dateKey} 
                    content={
                      hasExpenses && dayData ? (
                        <div className="max-w-[240px] p-0">
                          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3 text-white">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-sm">{format(date, "EEEE", { locale: id })}</p>
                              <p className="font-bold text-sm">{format(date, "d MMM yyyy", { locale: id })}</p>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center bg-white/10 px-2 py-1 rounded-full">
                                {mood && <span className="mr-1.5 text-base">{mood.emoji}</span>}
                                <span className="text-xs font-medium">{dayData.expenseCount} transaksi</span>
                              </div>
                              <p className="font-bold text-base">{formatCurrency(dayData.totalAmount)}</p>
                            </div>
                          </div>
                          
                          <div className="p-3">
                            {Object.entries(dayData.categoryCounts).length > 0 && (
                              <div className="space-y-3">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Kategori Pengeluaran</p>
                                <div className="space-y-2">
                                  {Object.entries(dayData.categoryCounts)
                                    .sort((a, b) => b[1].amount - a[1].amount) // Sort by amount (highest first)
                                    .map(([category, { count, amount }]) => (
                                      <div key={category} className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                          {category}
                                        </span>
                                        <div className="flex items-center gap-3">
                                          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                                            {count}x
                                          </span>
                                          <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                            {formatCurrency(amount)}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )}
                          </div>
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
                      key={dateKey}
                      className={cn(
                        "aspect-square rounded-lg sm:rounded-xl flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300 transform hover:scale-105",
                        // Background only for current day or empty cells
                        isCurrentDay 
                          ? "ring-2 ring-offset-2 ring-blue-500 dark:ring-blue-400 shadow-lg bg-muted/10 dark:bg-muted/20" 
                          : !hasExpenses 
                            ? "bg-muted/10 dark:bg-muted/20 hover:bg-muted/20 dark:hover:bg-muted/30" 
                            : "hover:bg-muted/5 dark:hover:bg-muted/10",
                        // Weekend styling for empty cells
                        isWeekend && !hasExpenses && !isCurrentDay && "bg-muted/5 dark:bg-muted/10",
                        "group"
                      )}
                    >
                      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full p-1">
                        {/* On mobile: Show only emoji if exists, otherwise show date */}
                        <div className="sm:hidden">
                          {hasExpenses && mood ? (
                            <span className={cn(
                              "text-xl transform transition-transform duration-300 group-hover:scale-110",
                              isCurrentDay && "text-2xl"
                            )}>
                              {mood.emoji}
                            </span>
                          ) : (
                            <span className={cn(
                              "text-xs font-medium",
                              isCurrentDay 
                                ? "text-blue-700 dark:text-blue-300 font-bold" 
                                : isWeekend 
                                  ? "text-red-500 dark:text-red-400" 
                                  : "text-muted-foreground"
                            )}>
                              {getDate(date)}
                            </span>
                          )}
                        </div>

                        {/* On desktop: Always show date, and show emoji if exists */}
                        <div className="hidden sm:flex flex-col items-center">
                          <span className={cn(
                            "text-sm font-medium transition-all duration-200",
                            isCurrentDay 
                              ? "text-blue-700 dark:text-blue-300 font-bold text-base" 
                              : isWeekend 
                                ? "text-red-500 dark:text-red-400" 
                                : "text-muted-foreground"
                          )}>
                            {getDate(date)}
                          </span>
                          {hasExpenses && mood && (
                            <span className={cn(
                              "text-xl mt-1 transform transition-transform duration-300 group-hover:scale-110",
                              isCurrentDay && "text-2xl"
                            )}>
                              {mood.emoji}
                            </span>
                          )}
                        </div>
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
