import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ArrowLeft, Calculator, TrendingUp, Shield, PiggyBank, AlertCircle, CheckCircle, Info } from 'lucide-react';

export default function FinancialHealthGuide() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Financial Health Guide
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Understanding how your financial health score is calculated and what it means for your financial well-being.
          </p>
        </div>
      </div>

      <div className="grid gap-8">
        {/* Overview Card */}
        <Card className="border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 dark:border-blue-800/50">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Calculator className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">How Your Score is Calculated</CardTitle>
            <CardDescription className="text-lg">
              Your financial health score (0-100) is calculated using data from the last 3 months,
              combining four key financial metrics with specific weightings.
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Score Ranges */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Score Ranges & Meanings
            </CardTitle>
            <CardDescription>
              Understanding what your score means and where you stand financially.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border-2 border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800/50">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-4 rounded-full bg-green-500"></div>
                  <Badge variant="secondary" className="bg-green-100 dark:bg-green-800/40 text-green-800 dark:text-green-200">90-100</Badge>
                  <Badge variant="secondary" className="bg-green-200 dark:bg-green-900/30 text-green-900 dark:text-green-300 font-bold">A+ to A-</Badge>
                </div>
                <h4 className="font-semibold text-green-800 dark:text-green-200">Excellent</h4>
                <p className="text-sm text-green-700 dark:text-green-500">Outstanding financial health with strong savings and low expenses.</p>
              </div>

              <div className="p-4 rounded-lg border-2 border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800/50">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                  <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200">80-89</Badge>
                  <Badge variant="secondary" className="bg-blue-200 dark:bg-blue-900/30 text-blue-900 dark:text-blue-300 font-bold">B+ to B-</Badge>
                </div>
                <h4 className="font-semibold text-blue-800 dark:text-blue-200">Good</h4>
                <p className="text-sm text-blue-700 dark:text-blue-500">Solid financial foundation with room for minor improvements.</p>
              </div>

              <div className="p-4 rounded-lg border-2 border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800/50">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                  <Badge variant="secondary" className="bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200">65-79</Badge>
                  <Badge variant="secondary" className="bg-yellow-200 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-300 font-bold">C+ to D+</Badge>
                </div>
                <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">Fair</h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-500">Decent financial health but with clear areas for improvement.</p>
              </div>

              <div className="p-4 rounded-lg border-2 border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800/50">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                  <Badge variant="secondary" className="bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200">30-64</Badge>
                  <Badge variant="secondary" className="bg-orange-200 dark:bg-orange-900/30 text-orange-900 dark:text-orange-300 font-bold">D to F</Badge>
                </div>
                <h4 className="font-semibold text-orange-800 dark:text-orange-200">Needs Improvement</h4>
                <p className="text-sm text-orange-700 dark:text-orange-500">Financial stability at risk, requires attention and action.</p>
              </div>

              <div className="p-4 rounded-lg border-2 border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800/50">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-4 rounded-full bg-red-500"></div>
                  <Badge variant="secondary" className="bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200">0-29</Badge>
                  <Badge variant="secondary" className="bg-red-200 dark:bg-red-900/30 text-red-900 dark:text-red-300 font-bold">F</Badge>
                </div>
                <h4 className="font-semibold text-red-800 dark:text-red-200">Poor</h4>
                <p className="text-sm text-red-700 dark:text-red-500">Critical financial situation requiring immediate attention.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Metrics */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Savings Rate */}
          <Card className="h-fit">
            <CardHeader>
              <div className="flex items-center gap-2">
                <PiggyBank className="h-5 w-5 text-green-600" />
                <CardTitle>Savings Rate</CardTitle>
                <Badge className="bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200">30 Points Max</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Calculation Formula:</h4>
                <code className="text-sm bg-white dark:bg-gray-900/50 p-2 rounded border dark:border-gray-700 block">
                  (Total Income - Total Expenses) / Total Income × 100
                </code>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Scoring System:</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400" />
                    Each 1% savings rate = 0.6 points
                  </li>
                  <li className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                    Capped at 30 points (50% savings rate)
                  </li>
                </ul>
              </div>

              <div className="bg-green-50 dark:bg-green-900/30 p-3 rounded-lg border border-green-200 dark:border-green-800/50">
                <p className="text-sm font-medium text-green-800 dark:text-green-200">Target: 20% or higher savings rate</p>
              </div>
            </CardContent>
          </Card>

          {/* Expense to Income Ratio */}
          <Card className="h-fit">
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <CardTitle>Expense to Income Ratio</CardTitle>
                <Badge className="bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200">30 Points Max</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Calculation Formula:</h4>
                <code className="text-sm bg-white dark:bg-gray-900/50 p-2 rounded border dark:border-gray-700 block">
                  (Total Expenses / Total Income) × 100
                </code>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Scoring Tiers:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
                    <span>≤50% expenses</span>
                    <Badge variant="secondary" className="bg-green-100 dark:bg-green-800/40 text-green-800 dark:text-green-200">30 points</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                    <span>51-70% expenses</span>
                    <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200">20 points</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                    <span>71-90% expenses</span>
                    <Badge variant="secondary" className="bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200">10 points</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-red-50 dark:bg-red-900/20 rounded">
                    <span>≥90% expenses</span>
                    <Badge variant="secondary" className="bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200">0 points</Badge>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800/50">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Target: Keep expenses below 70% of income</p>
              </div>
            </CardContent>
          </Card>

          {/* Emergency Fund */}
          <Card className="h-fit">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-purple-600" />
                <CardTitle>Emergency Fund</CardTitle>
                <Badge className="bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200">30 Points Max</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Calculation Formula:</h4>
                <code className="text-sm bg-white dark:bg-gray-900/50 p-2 rounded border dark:border-gray-700 block">
                  Current Savings / Monthly Expenses
                </code>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                  Where savings = Total Income - Total Expenses over 3 months
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Scoring Tiers:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
                    <span>≥6 months coverage</span>
                    <Badge variant="secondary" className="bg-green-100 dark:bg-green-800/40 text-green-800 dark:text-green-200">30 points</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                    <span>3-6 months coverage</span>
                    <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200">20 points</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                    <span>1-3 months coverage</span>
                    <Badge variant="secondary" className="bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200">10 points</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-red-50 dark:bg-red-900/20 rounded">
                    <span>&lt;1 month coverage</span>
                    <Badge variant="secondary" className="bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200">0 points</Badge>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 dark:bg-purple-900/30 p-3 rounded-lg border border-purple-200 dark:border-purple-800/50">
                <p className="text-sm font-medium text-purple-800 dark:text-purple-200">Target: 3-6 months of expenses saved</p>
              </div>
            </CardContent>
          </Card>

          {/* Discretionary Spending */}
          <Card className="h-fit">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <CardTitle>Discretionary Spending</CardTitle>
                <Badge className="bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200">10 Points Max</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Calculation Formula:</h4>
                <code className="text-sm bg-white dark:bg-gray-900/50 p-2 rounded border dark:border-gray-700 block">
                  (Non-Essential Expenses / Total Expenses) × 100
                </code>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Essential vs. Non-Essential Categories:</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-green-50 dark:bg-green-900/30 p-3 rounded-lg">
                    <h5 className="font-medium text-green-800 dark:text-green-200 mb-2">Essential Categories:</h5>
                    <ul className="space-y-1 text-green-700 dark:text-green-500">
                      <li>• Bills & Utilities</li>
                      <li>• Transportation</li>
                      <li>• Health & Fitness</li>
                    </ul>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-900/30 p-3 rounded-lg">
                    <h5 className="font-medium text-orange-800 dark:text-orange-200 mb-2">Non-Essential (Discretionary):</h5>
                    <ul className="space-y-1 text-orange-700 dark:text-orange-500">
                      <li>• Entertainment</li>
                      <li>• Dining Out</li>
                      <li>• Shopping</li>
                      <li>• Travel</li>
                      <li>• Other categories</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Scoring Tiers:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
                    <span>≤30% discretionary</span>
                    <Badge variant="secondary" className="bg-green-100 dark:bg-green-800/40 text-green-800 dark:text-green-200">10 points</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                    <span>31-50% discretionary</span>
                    <Badge variant="secondary" className="bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200">5 points</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-red-50 dark:bg-red-900/20 rounded">
                    <span>&gt;50% discretionary</span>
                    <Badge variant="secondary" className="bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200">0 points</Badge>
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 dark:bg-orange-900/30 p-3 rounded-lg border border-orange-200 dark:border-orange-800/50">
                <p className="text-sm font-medium text-orange-800 dark:text-orange-200">Target: Keep discretionary spending under 30%</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Data Processing */}
        <Card className="bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900 dark:to-slate-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <Calculator className="h-5 w-5" />
              How Your Data is Processed
            </CardTitle>
            <CardDescription>
              Understanding the technical process behind your financial health calculation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-blue-600 dark:text-blue-300 font-bold">1</span>
                </div>
                <h4 className="font-semibold mb-2">Data Collection</h4>
                <p className="text-sm text-muted-foreground dark:text-gray-400">
                  System fetches your income and expense records from the last 3 months using secure database queries.
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-purple-600 dark:text-purple-300 font-bold">2</span>
                </div>
                <h4 className="font-semibold mb-2">Metric Calculation</h4>
                <p className="text-sm text-muted-foreground dark:text-gray-400">
                  Each financial metric is calculated using your actual transaction data and categorized spending.
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-green-600 dark:text-green-300 font-bold">3</span>
                </div>
                <h4 className="font-semibold mb-2">Score Generation</h4>
                <p className="text-sm text-muted-foreground dark:text-gray-400">
                  All metrics are combined with their respective weights to generate your final health score.
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
              <h4 className="font-semibold mb-3">Data Sources:</h4>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h5 className="font-medium mb-2">Income Records:</h5>
                  <p className="text-muted-foreground dark:text-gray-400">All your recorded income transactions from the past 3 months</p>
                </div>
                <div>
                  <h5 className="font-medium mb-2">Expense Records:</h5>
                  <p className="text-muted-foreground dark:text-gray-400">All your recorded expense transactions from the past 3 months</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Improvement Tips */}
        <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 dark:border-emerald-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200">
              <TrendingUp className="h-5 w-5" />
              Improving Your Financial Health Score
            </CardTitle>
            <CardDescription className="text-emerald-700 dark:text-emerald-300">
              Actionable strategies to boost your financial well-being and score.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold text-emerald-800 dark:text-emerald-200">Quick Wins:</h4>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    <span>Track all expenses for better category accuracy</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    <span>Set up automatic savings transfers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    <span>Review and cancel unused subscriptions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    <span>Use the 50/30/20 budgeting rule</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-emerald-800 dark:text-emerald-200">Long-term Strategies:</h4>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    <span>Build emergency fund gradually (start with 1 month)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    <span>Increase income through skills or side hustles</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    <span>Pay down high-interest debt systematically</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    <span>Consider consulting a financial advisor</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}