'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { FinancialHealthScore } from '@/lib/financial-health';
import { FinancialHealthCard } from './financial-health-card';

interface FinancialHealthButtonProps {
  financialHealth: FinancialHealthScore;
  className?: string;
}

export function FinancialHealthButton({ financialHealth, className }: FinancialHealthButtonProps) {
  const [open, setOpen] = useState(false);

  const getStatusColor = () => {
    switch (financialHealth.status) {
      case 'Excellent':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'Good':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'Fair':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      case 'Needs Improvement':
        return 'bg-orange-100 text-orange-800 hover:bg-orange-200';
      case 'Poor':
        return 'bg-red-100 text-red-800 hover:bg-red-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'h-10 w-10 p-0 rounded-full flex items-center justify-center font-semibold text-base',
            'md:h-9 md:w-9 md:text-sm',
            getStatusColor(),
            className
          )}
          aria-label="View financial health score"
        >
          {financialHealth.score}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <Card className="border-0 shadow-none">
          <FinancialHealthCard {...financialHealth} />
        </Card>
      </PopoverContent>
    </Popover>
  );
}
