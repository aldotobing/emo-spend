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
  // Get color classes based on score for both light and dark modes
  const getStatusColors = () => {
    if (score >= 80) return {
      bg: 'bg-green-500 dark:bg-green-600',
      text: 'text-green-700 dark:text-green-300',
      border: 'border-green-500 dark:border-green-600',
      progress: 'bg-green-500 dark:bg-green-600',
      ring: 'ring-green-500/20 dark:ring-green-400/30',
      alert: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800',
      alertText: 'text-green-800 dark:text-green-200',
      alertTitle: 'text-green-800 dark:text-green-100',
      circleBg: 'text-green-100 dark:text-green-900/30',
      circleProgress: 'text-green-500 dark:text-green-400',
    };
    if (score >= 60) return {
      bg: 'bg-blue-500 dark:bg-blue-600',
      text: 'text-blue-700 dark:text-blue-300',
      border: 'border-blue-500 dark:border-blue-600',
      progress: 'bg-blue-500 dark:bg-blue-600',
      ring: 'ring-blue-500/20 dark:ring-blue-400/30',
      alert: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
      alertText: 'text-blue-800 dark:text-blue-200',
      alertTitle: 'text-blue-800 dark:text-blue-100',
      circleBg: 'text-blue-100 dark:text-blue-900/30',
      circleProgress: 'text-blue-500 dark:text-blue-400',
    };
    if (score >= 40) return {
      bg: 'bg-yellow-500 dark:bg-yellow-600',
      text: 'text-yellow-700 dark:text-yellow-300',
      border: 'border-yellow-500 dark:border-yellow-600',
      progress: 'bg-yellow-500 dark:bg-yellow-600',
      ring: 'ring-yellow-500/20 dark:ring-yellow-400/30',
      alert: 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800',
      alertText: 'text-yellow-800 dark:text-yellow-200',
      alertTitle: 'text-yellow-800 dark:text-yellow-100',
      circleBg: 'text-yellow-100 dark:text-yellow-900/30',
      circleProgress: 'text-yellow-500 dark:text-yellow-400',
    };
    if (score >= 20) return {
      bg: 'bg-orange-500 dark:bg-orange-600',
      text: 'text-orange-700 dark:text-orange-300',
      border: 'border-orange-500 dark:border-orange-600',
      progress: 'bg-orange-500 dark:bg-orange-600',
      ring: 'ring-orange-500/20 dark:ring-orange-400/30',
      alert: 'bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800',
      alertText: 'text-orange-800 dark:text-orange-200',
      alertTitle: 'text-orange-800 dark:text-orange-100',
      circleBg: 'text-orange-100 dark:text-orange-900/30',
      circleProgress: 'text-orange-500 dark:text-orange-400',
    };
    return {
      bg: 'bg-red-500 dark:bg-red-600',
      text: 'text-red-700 dark:text-red-300',
      border: 'border-red-500 dark:border-red-600',
      progress: 'bg-red-500 dark:bg-red-600',
      ring: 'ring-red-500/20 dark:ring-red-400/30',
      alert: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800',
      alertText: 'text-red-800 dark:text-red-200',
      alertTitle: 'text-red-800 dark:text-red-100',
      circleBg: 'text-red-100 dark:text-red-900/30',
      circleProgress: 'text-red-500 dark:text-red-400',
    };
  };

  const statusColors = getStatusColors();

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
              className={`text-5xl font-bold ${statusColors.text} transition-colors duration-300`}
            >
              {score}
            </div>
            <div 
              className={`text-lg font-medium ${statusColors.text} transition-colors duration-300`}
            >
              {status}
            </div>
          </div>
          <div className="w-24 h-24 relative">
            <svg className="w-full h-full" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                className={statusColors.circleBg}
                strokeWidth="10"
                stroke="currentColor"
                fill="transparent"
                r="40"
                cx="50"
                cy="50"
              />
              {/* Progress circle */}
              <circle
                className={statusColors.circleProgress}
                strokeWidth="10"
                strokeLinecap="round"
                fill="transparent"
                r="40"
                cx="50"
                cy="50"
                strokeDasharray={`${(score / 100) * 251.2} 251.2`}
                transform="rotate(-90 50 50)"
                style={{
                  stroke: 'currentColor',
                  transition: 'stroke-dasharray 1s ease-out, stroke 0.3s ease',
                }}
              />
            </svg>
            <div 
              className={`absolute inset-0 flex items-center justify-center text-lg font-bold ${statusColors.text} transition-colors duration-300`}
            >
              {score}/100
            </div>
          </div>
        </div>

        <div>
          <p className="text-sm text-muted-foreground mb-4">{summary}</p>
          
          {recommendations.length > 0 && (
            <Alert className={`${statusColors.alert} ${statusColors.border}`}>
              <Info className={`h-4 w-4 ${statusColors.text}`} />
              <AlertTitle className={`font-medium ${statusColors.alertTitle}`}>Recommendations</AlertTitle>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                {recommendations.map((rec, i) => (
                  <li key={i} className={`text-sm ${statusColors.alertText}`}>{rec}</li>
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
                  metrics.expenseToIncomeRatio > 70 ? 'bg-red-500 dark:bg-red-600' : 'bg-green-500 dark:bg-green-600'
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
