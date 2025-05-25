'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, TrendingUp, ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IncomeForm } from '@/components/income-form';
import { Income } from '@/types/expense';
import { getIncomesByDateRange, deleteIncome } from '@/lib/income';
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

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [incomeToDelete, setIncomeToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (incomeId: string) => {
    setIncomeToDelete(incomeId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteIncome = async () => {
    if (!incomeToDelete) return;
    
    setIsDeleting(true);
    try {
      const success = await deleteIncome(incomeToDelete);
      if (success) {
        setIncomes(incomes.filter(income => income.id !== incomeToDelete));
      } else {
        alert('Failed to delete income. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting income:', error);
      alert('An error occurred while deleting the income.');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setIncomeToDelete(null);
    }
  };

  const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);

  return (
    <div className="min-h-screen bg-background/50 transition-colors duration-300">
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this income record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDeleteIncome}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Mobile-optimized header */}
      <div className="bg-background border-b px-4 py-3 sticky top-0 z-10 backdrop-blur-sm bg-background/95 transition-all duration-300 dark:bg-background-dark/95">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center gap-2 p-2 -ml-2 hover:bg-accent transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <ArrowLeft className="h-5 w-5 transition-transform duration-200" />
            <span className="hidden sm:inline transition-opacity duration-200">Back</span>
          </Button>
          <h1 className="text-lg sm:text-xl font-semibold flex items-center gap-2 text-center transition-all duration-300">
            <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 transition-all duration-300" />
            <span className="hidden xs:inline transition-opacity duration-200">Income</span>
            <span className="xs:hidden transition-opacity duration-200">Income</span>
          </h1>
          <div className="w-12 sm:w-16 transition-all duration-300">
            {/* Spacer for layout balance */}
          </div>
        </div>
      </div>

      {/* Mobile-optimized content */}
      <div className="px-4 py-4 space-y-4 max-w-4xl mx-auto transition-all duration-300">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          {/* Mobile-friendly tabs */}
          <TabsList className="grid w-full grid-cols-2 h-12 border transition-all duration-300 hover:shadow-sm">
            <TabsTrigger 
              value="add" 
              className="flex items-center gap-2 text-sm sm:text-base py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 hover:bg-accent data-[state=active]:hover:bg-primary data-[state=active]:shadow-sm"
            >
              <Plus className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
              <span className="hidden xs:inline transition-opacity duration-200">Add Income</span>
              <span className="xs:hidden transition-opacity duration-200">Add</span>
            </TabsTrigger>
            <TabsTrigger 
              value="list" 
              className="flex items-center gap-2 text-sm sm:text-base py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 hover:bg-accent data-[state=active]:hover:bg-primary data-[state=active]:shadow-sm"
            >
              <TrendingUp className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
              <span className="hidden xs:inline transition-opacity duration-200">View Incomes</span>
              <span className="xs:hidden transition-opacity duration-200">View</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="add" className="mt-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
            <Card className="border-0 shadow-sm transition-all duration-300 hover:shadow-md">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg sm:text-xl transition-colors duration-200">Add New Income</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <IncomeForm onSuccess={handleIncomeAdded} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="list" className="mt-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
            <Card className="border-0 shadow-sm transition-all duration-300 hover:shadow-md">
              <CardHeader className="pb-4">
                <div className="space-y-3">
                  <div className="flex flex-col xs:flex-row xs:justify-between xs:items-center gap-3">
                    <CardTitle className="text-lg sm:text-xl transition-colors duration-200">Income History</CardTitle>
                    <div className="flex flex-col xs:flex-row items-start xs:items-center gap-2">
                      {/* Total income badge - full width on mobile */}
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-3 py-2 rounded-lg text-sm font-medium w-full xs:w-auto text-center xs:text-left transition-all duration-300 hover:bg-green-100 dark:hover:bg-green-900/30 hover:border-green-300 dark:hover:border-green-700 hover:shadow-sm">
                        <span className="flex items-center justify-center xs:justify-start gap-1">
                          <span className="font-semibold transition-all duration-200">
                            Rp{" "}
                            {new Intl.NumberFormat('id-ID', {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0
                            }).format(totalIncome)}
                          </span>
                        </span>
                      </div>
                      {/* Add button - full width on mobile */}
                      <Button
                        size="sm"
                        onClick={() => setActiveTab('add')}
                        className="gap-2 w-full xs:w-auto h-10 transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-md"
                      >
                        <Plus className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90" />
                        Add Income
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {isLoading ? (
                  <div className="flex justify-center items-center h-32 sm:h-40 transition-all duration-300">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground transition-colors duration-300" />
                  </div>
                ) : incomes.length > 0 ? (
                  <div className="space-y-3">
                    {incomes.map((income, index) => (
                      <div 
                        key={income.id} 
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-all duration-300 touch-manipulation hover:shadow-md hover:border-border/80 transform hover:-translate-y-0.5 animate-in fade-in-0 slide-in-from-bottom-2"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex-1 mb-3 sm:mb-0">
                          <div className="font-medium text-base sm:text-lg mb-1 transition-colors duration-200">{income.source}</div>
                          <div className="text-sm text-muted-foreground mb-1 transition-colors duration-200">
                            {new Date(income.date).toLocaleDateString()}
                          </div>
                          {income.description && (
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2 transition-colors duration-200">{income.description}</p>
                          )}
                        </div>
                        <div className="flex justify-between items-start sm:items-center gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 transition-all duration-200">
                          <div className="flex-1">
                            <div className="font-bold text-green-600 dark:text-green-400 text-lg sm:text-xl transition-all duration-200 hover:text-green-700 dark:hover:text-green-300">
                              {new Intl.NumberFormat('id-ID', {
                                style: 'currency',
                                currency: 'IDR',
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0
                              }).format(income.amount)}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1 transition-colors duration-200">
                              Added: {new Date(income.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(income.id);
                            }}
                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-full transition-colors duration-200"
                            aria-label="Delete income"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
                    <div className="mb-4 transition-transform duration-300 hover:scale-110">
                      <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground/50 transition-colors duration-300" />
                    </div>
                    <p className="text-base mb-2 transition-opacity duration-300">No income records found</p>
                    <p className="text-sm mb-4 transition-opacity duration-300">Start tracking your income to see it here</p>
                    <Button
                      onClick={() => setActiveTab('add')}
                      className="gap-2 transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-lg"
                    >
                      <Plus className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90" />
                      Add your first income
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}