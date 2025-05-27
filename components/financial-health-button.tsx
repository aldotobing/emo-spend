'use client';

import { useState, useMemo, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { FinancialHealthScore } from '@/lib/financial-health';
import { FinancialHealthCard } from './financial-health-card';

type StatusVariant = 'excellent' | 'good' | 'fair' | 'needsImprovement' | 'poor';

interface StatusStyle {
  bg: string;
  text: string;
  hover: string;
  ring: string;
}

const statusStyles: Record<StatusVariant, StatusStyle> = {
  excellent: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    hover: 'hover:bg-green-200',
    ring: 'ring-green-400',
  },
  good: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    hover: 'hover:bg-blue-200',
    ring: 'ring-blue-400',
  },
  fair: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    hover: 'hover:bg-yellow-200',
    ring: 'ring-yellow-400',
  },
  needsImprovement: {
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    hover: 'hover:bg-orange-200',
    ring: 'ring-orange-400',
  },
  poor: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    hover: 'hover:bg-red-200',
    ring: 'ring-red-400',
  },
} as const;

interface FinancialHealthButtonProps {
  /** The financial health score and status to display */
  financialHealth: FinancialHealthScore;
  /** Additional class names to apply to the button */
  className?: string;
  /** Custom label for accessibility (default: 'View financial health score') */
  'aria-label'?: string;
}

/**
 * A button that displays a financial health score with a color-coded status.
 * Clicking the button opens a popover with detailed financial health information.
 */
const getLetterGrade = (score: number): string => {
  if (score >= 97) return 'A+';
  if (score >= 93) return 'A';
  if (score >= 90) return 'A-';
  if (score >= 87) return 'B+';
  if (score >= 83) return 'B';
  if (score >= 80) return 'B-';
  if (score >= 77) return 'C+';
  if (score >= 73) return 'C';
  if (score >= 70) return 'C-';
  if (score >= 67) return 'D+';
  if (score >= 63) return 'D';
  if (score >= 60) return 'D-';
  return 'F';
};

const ButtonContent = memo(({ financialHealth }: { financialHealth: FinancialHealthScore }) => {
  const statusVariant = useMemo<StatusVariant>(() => {
    const status = financialHealth.status.toLowerCase();
    if (status.includes('excellent')) return 'excellent';
    if (status.includes('good')) return 'good';
    if (status.includes('fair')) return 'fair';
    if (status.includes('improve')) return 'needsImprovement';
    if (status.includes('poor')) return 'poor';
    return 'fair';
  }, [financialHealth.status]);

  const { bg, text, hover, ring } = statusStyles[statusVariant];
  const letterGrade = getLetterGrade(financialHealth.score);
  
  return (
    <div className={cn(
      'h-10 w-10 p-0 rounded-full flex items-center justify-center font-semibold text-base',
      'md:h-9 md:w-9 md:text-sm',
      'focus-visible:ring-2 focus-visible:ring-offset-2',
      'transition-colors duration-200',
      bg,
      text,
      hover,
      `focus-visible:${ring}`
    )}>
      {letterGrade}
    </div>
  );
});

ButtonContent.displayName = 'ButtonContent';

export function FinancialHealthButton({
  financialHealth,
  className,
  'aria-label': ariaLabel = 'View financial health score',
}: FinancialHealthButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn('p-0 bg-transparent border-0 hover:bg-transparent', className)}
          aria-label={ariaLabel}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
        >
          <ButtonContent financialHealth={financialHealth} />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-96 p-0" 
        align="end"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Card className="border-0 shadow-none">
          <FinancialHealthCard {...financialHealth} />
        </Card>
      </PopoverContent>
    </Popover>
  );
}
