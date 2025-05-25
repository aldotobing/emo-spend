'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { FinancialHealthScore } from '@/lib/financial-health';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';

interface FinancialHealthCardProps extends FinancialHealthScore {
  className?: string;
}

export function FinancialHealthCard({ score, status, summary, recommendations, metrics, className }: FinancialHealthCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'Excellent':
        return 'bg-green-500';
      case 'Good':
        return 'bg-blue-500';
      case 'Fair':
        return 'bg-yellow-500';
      case 'Needs Improvement':
        return 'bg-orange-500';
      case 'Poor':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusTextColor = () => {
    switch (status) {
      case 'Excellent':
        return 'text-green-600';
      case 'Good':
        return 'text-blue-600';
      case 'Fair':
        return 'text-yellow-600';
      case 'Needs Improvement':
        return 'text-orange-600';
      case 'Poor':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <Card className={cn("w-full max-w-2xl mx-auto", className)}>
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Financial Health Score</CardTitle>
        <CardDescription>
          Your financial health overview based on your recent transactions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-5xl font-bold">{score}</div>
            <div className={`text-lg font-medium ${getStatusTextColor()}`}>{status}</div>
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
                className={getStatusColor()}
                strokeWidth="8"
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r="40"
                cx="50"
                cy="50"
                strokeDasharray={`${(score / 100) * 251.2} 251.2`}
                transform="rotate(-90 50 50)"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-lg font-bold">
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
