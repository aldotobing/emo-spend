'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { FinancialHealthScore } from '@/lib/financial-health';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, InfoIcon } from 'lucide-react';
import { useUser } from "@/hooks/use-user";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "./ui/button";
import Link from "next/link";

interface FinancialHealthCardProps extends FinancialHealthScore {
  className?: string;
}

export function FinancialHealthCard({ score, status, summary, recommendations, metrics, className }: FinancialHealthCardProps) {
  const { user, isLoading: isUserLoading } = useUser();

  if (!user && !isUserLoading) {
    return (
      <Card className={cn("w-full max-w-2xl mx-auto", className)}>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Financial Health Score</CardTitle>
          <CardDescription>
            Track your financial health and get personalized recommendations
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">Please log in to view your financial health score</p>
            <Button asChild>
              <Link href="/auth/login">Login</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  // Calculate color based on score for a smooth gradient from red to green
  const getScoreColor = (value: number) => {
    // Normalize the score to a 0-1 range
    const normalizedScore = value / 100;
    
    // Calculate RGB values for a smooth gradient from red (0) to green (1)
    const r = Math.round(255 * (1 - normalizedScore * 0.8));
    const g = Math.round(255 * (normalizedScore * 0.8));
    const b = 0;
    
    // Calculate text color (dark for light backgrounds, light for dark backgrounds)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    const textColor = brightness > 128 ? 'text-gray-900' : 'text-white';
    
    return {
      bg: `rgb(${r}, ${g}, ${b})`,
      text: textColor,
      ring: `ring-rgb(${Math.round(r * 0.8)}, ${Math.round(g * 0.8)}, 0)`
    };
  };

  const scoreColor = getScoreColor(score);
  
  // For the circular progress indicator
  const getStatusColor = () => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-yellow-500';
    if (score >= 20) return 'bg-orange-500';
    return 'bg-red-500';
  };
  
  // For text and other elements that need status-based colors
  const getStatusTextColor = () => {
    if (score >= 80) return 'text-green-700';
    if (score >= 60) return 'text-blue-700';
    if (score >= 40) return 'text-yellow-700';
    if (score >= 20) return 'text-orange-700';
    return 'text-red-700';
  };

  return (
    <Card className={cn("w-full max-w-2xl mx-auto", className)}>
      <CardHeader className="relative">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-2xl font-bold">Financial Health Score</CardTitle>
            <CardDescription>
              {user ? 'Your financial health overview based on your recent transactions' : 'Loading...'}
            </CardDescription>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/financial-health-guide" className="text-muted-foreground hover:text-foreground transition-colors">
                  <InfoIcon className="h-5 w-5" />
                  <span className="sr-only">Learn more about financial health score</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-[300px]">
                <p>Click to learn more about how your financial health score is calculated and what it means.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div 
              className="text-5xl font-bold transition-colors duration-300"
              style={{ color: scoreColor.bg }}
            >
              {score}
            </div>
            <div 
              className={`text-lg font-medium ${getStatusTextColor()} transition-colors duration-300`}
            >
              {status}
            </div>
          </div>
          <div className="w-24 h-24 relative">
            <svg className="w-full h-full" viewBox="0 0 100 100">
              <circle
                className="text-gray-200"
                strokeWidth="8"
                stroke="currentColor"
                fill="transparent"
                r="40"
                cx="50"
                cy="50"
              />
              <circle
                strokeWidth="8"
                strokeLinecap="round"
                stroke={scoreColor.bg}
                fill="transparent"
                r="40"
                cx="50"
                cy="50"
                strokeDasharray={`${(score / 100) * 251.2} 251.2`}
                transform="rotate(-90 50 50)"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div 
              className="absolute inset-0 flex items-center justify-center text-lg font-bold transition-colors duration-300"
              style={{ color: scoreColor.bg }}
            >
              {score}/100
            </div>
          </div>
        </div>

        <div>
          <p className="text-sm text-muted-foreground mb-4">{summary}</p>
          
          {recommendations.length > 0 && (
            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-800">Recommendations</AlertTitle>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                {recommendations.map((rec, i) => (
                  <li key={i} className="text-sm text-blue-700">{rec}</li>
                ))}
              </ul>
            </Alert>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-sm font-medium">Savings Rate</div>
            <div className="text-2xl font-bold">{metrics.savingsRate}%</div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
              <Progress 
                value={Math.min(metrics.savingsRate, 100)} 
                className={cn(
                  'h-full transition-all duration-500',
                  metrics.savingsRate > 50 ? 'bg-green-500' : 'bg-yellow-500'
                )}
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium">Expense to Income</div>
            <div className="text-2xl font-bold">{metrics.expenseToIncomeRatio}%</div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
              <Progress 
                value={Math.min(metrics.expenseToIncomeRatio, 100)} 
                className={cn(
                  'h-full transition-all duration-500',
                  metrics.expenseToIncomeRatio > 70 ? 'bg-red-500' : 'bg-green-500'
                )}
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium">Emergency Fund</div>
            <div className="text-2xl font-bold">{metrics.emergencyFundMonths} mo</div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
              <Progress 
                value={Math.min(metrics.emergencyFundMonths * 20, 100)} 
                className={cn(
                  'h-full transition-all duration-500',
                  metrics.emergencyFundMonths >= 3 ? 'bg-green-500' : 'bg-yellow-500'
                )}
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium">Discretionary</div>
            <div className="text-2xl font-bold">{metrics.discretionarySpending}%</div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
              <Progress 
                value={metrics.discretionarySpending} 
                className={cn(
                  'h-full transition-all duration-500',
                  metrics.discretionarySpending > 30 ? 'bg-yellow-500' : 'bg-green-500'
                )}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
