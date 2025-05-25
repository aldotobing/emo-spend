'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, TrendingUp, ArrowLeft, Loader2, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IncomeForm } from '@/components/income-form';
import { Income } from '@/types/expense';
import { getIncomesByDateRange } from '@/lib/income';
import { format } from 'date-fns';

export default function IncomePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('add');
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  useEffect(() => {
    const loadIncomes = async () => {
      try {
        setIsLoading(true);
        const data = await getIncomesByDateRange(dateRange.start, dateRange.end);
        setIncomes(data);
      } catch (error) {
        console.error('Error loading incomes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadIncomes();
  }, [dateRange]);

  const handleIncomeAdded = async () => {
    try {
      const data = await getIncomesByDateRange(dateRange.start, dateRange.end);
      setIncomes(data);
      setActiveTab('list');
    } catch (error) {
      console.error('Error refreshing incomes:', error);
    }
  };

  const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="h-6 w-6" />
          Income Management
        </h1>
        <div className="w-24">
          {/* Empty div for layout balance */}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="add" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Income
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            View Incomes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="add">
          <Card>
            <CardHeader>
              <CardTitle>Add New Income</CardTitle>
            </CardHeader>
            <CardContent>
              <IncomeForm onSuccess={handleIncomeAdded} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Income History</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="bg-primary/10 text-primary px-3 py-1 rounded-md text-sm font-medium">
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                      }).format(totalIncome)}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setActiveTab('add')}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Income
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : incomes.length > 0 ? (
                <div className="space-y-4">
                  {incomes.map((income) => (
                    <div key={income.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium">{income.source}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(income.date).toLocaleDateString()}
                        </div>
                        {income.description && (
                          <p className="text-sm text-muted-foreground mt-1">{income.description}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                          }).format(income.amount)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(income.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No income records found.</p>
                  <Button
                    variant="link"
                    className="mt-2"
                    onClick={() => setActiveTab('add')}
                  >
                    Add your first income
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
