import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FinancialHealthButton } from "@/components/financial-health-button";
import { PlusCircle, CalendarIcon } from "lucide-react";
import { motion } from "framer-motion";
import type { FinancialHealthScore } from "@/lib/financial-health";

interface DashboardHeaderProps {
  showCalendar: boolean;
  onToggleCalendar: () => void;
  financialHealth: FinancialHealthScore | null;
  isHealthLoading: boolean;
}

export function DashboardHeader({
  showCalendar,
  onToggleCalendar,
  financialHealth,
  isHealthLoading,
}: DashboardHeaderProps) {
  return (
    <>
      {/* Desktop header */}
      <div className="hidden sm:flex justify-between items-center sticky top-0 z-40 bg-background/80 backdrop-blur-md py-4 border-b border-border/50 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
          Dashboard
        </h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 h-10 px-4 rounded-xl border-border/50 bg-background/50 backdrop-blur-sm"
              onClick={onToggleCalendar}
            >
              <CalendarIcon className="h-4 w-4" />
              {showCalendar ? "Hide Calendar" : "Show Calendar"}
            </Button>
            <div className="h-8 w-px bg-border mx-1"></div>
            <div className="flex items-center">
              {isHealthLoading ? (
                <div className="h-8 w-8 rounded-full bg-muted animate-pulse"></div>
              ) : financialHealth ? (
                <FinancialHealthButton financialHealth={financialHealth} />
              ) : null}
            </div>
          </div>
          <Link href="/add">
            <Button size="sm" className="h-10 px-4 gap-2">
              <PlusCircle className="h-4 w-4" />
              Add
            </Button>
          </Link>
        </div>
      </div>

      {/* Mobile header with enhanced styling */}
      <div className="sm:hidden px-4 pt-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between"
        >
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Dashboard
          </h1>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              {financialHealth && !isHealthLoading && (
                <FinancialHealthButton
                  financialHealth={financialHealth}
                  className="h-8 w-8 text-xs"
                />
              )}
               {isHealthLoading && <div className="h-8 w-8 rounded-full bg-muted animate-pulse"></div>}
              <div className="relative group">
                <Button
                  variant="outline"
                  size="icon"
                  className={`h-9 w-9 p-0 rounded-full flex items-center justify-center transition-all duration-200 ${showCalendar ? 'bg-accent/50 border-primary/50' : 'bg-background/80 hover:bg-accent/30'}`}
                  onClick={onToggleCalendar}
                >
                  <motion.div
                    animate={showCalendar ? { rotate: 90 } : { rotate: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <CalendarIcon className={`h-4 w-4 ${showCalendar ? 'text-primary' : 'text-muted-foreground'}`} />
                  </motion.div>
                  <span className="sr-only">Calendar</span>
                </Button>
                <div className="absolute right-0 mt-1 w-24 px-2 py-1 bg-foreground text-background text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                  {showCalendar ? 'Hide calendar' : 'Show calendar'}
                  <div className="absolute -top-1 right-2 w-2 h-2 bg-foreground transform rotate-45"></div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}