'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, TrendingUp, ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import styles from '@/styles/toast.module.css';
import { useSync } from '@/hooks/use-sync';
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
import { format, subMonths, startOfMonth, endOfMonth, isSameMonth } from 'date-fns';

export default function IncomePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('add');
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [expandedMonths, setExpandedMonths] = useState<number>(1); // Show current + 1 previous month by default
  const [allIncomes, setAllIncomes] = useState<{[key: string]: Income[]}>({});
  
  const currentDate = new Date();
  const [dateRange, setDateRange] = useState({
    start: format(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1), 'yyyy-MM-dd'), // Start from previous month
    end: format(currentDate, 'yyyy-MM-dd')
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

  // Function to load incomes for a specific month
  const loadIncomesForMonth = async (year: number, month: number) => {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    
    const startDate = format(monthStart, 'yyyy-MM-dd');
    const endDate = format(monthEnd, 'yyyy-MM-dd');
    
    const data = await getIncomesByDateRange(startDate, endDate);
    return { monthKey: `${year}-${String(month + 1).padStart(2, '0')}`, data };
  };
  
  // Function to add a new income to the state
  const addIncomeToState = (newIncome: Income) => {
    const incomeDate = new Date(newIncome.date);
    const monthKey = format(incomeDate, 'yyyy-MM');
    
    setAllIncomes(prev => {
      const updated = { ...prev };
      
      // If the month doesn't exist, create it with the new income
      if (!updated[monthKey]) {
        updated[monthKey] = [newIncome];
      } else {
        // Check if income already exists (in case of sync)
        const exists = updated[monthKey].some(inc => inc.id === newIncome.id);
        if (!exists) {
          // Add the new income to the beginning of the month's array
          updated[monthKey] = [newIncome, ...updated[monthKey]];
        }
      }
      
      return updated;
    });
  };

  // Load more months when clicking "See More"
  const loadMoreMonths = async () => {
    setIsLoadingMore(true);
    try {
      const newExpandedMonths = expandedMonths + 3; // Load 3 more months
      setExpandedMonths(newExpandedMonths);
      
      // Calculate which months we need to load
      const monthsToLoad = [];
      for (let i = 1; i <= newExpandedMonths; i++) {
        const date = subMonths(currentDate, i);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!allIncomes[monthKey]) {
          monthsToLoad.push({ year: date.getFullYear(), month: date.getMonth() });
        }
      }
      
      // Load all missing months
      const results = await Promise.all(
        monthsToLoad.map(({ year, month }) => loadIncomesForMonth(year, month))
      );
      
      // Update state with new data
      setAllIncomes(prev => {
        const updated = { ...prev };
        results.forEach(({ monthKey, data }) => {
          updated[monthKey] = data;
        });
        return updated;
      });
      
    } catch (error) {
      console.error('Error loading more months:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        
        // Load current month
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth();
        
        // Load current and previous month
        const [currentMonthData, prevMonthData] = await Promise.all([
          loadIncomesForMonth(currentYear, currentMonth),
          loadIncomesForMonth(currentYear, currentMonth - 1)
        ]);
        
        setAllIncomes({
          [currentMonthData.monthKey]: currentMonthData.data,
          [prevMonthData.monthKey]: prevMonthData.data
        });
        
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadInitialData();
  }, []);

  const handleIncomeAdded = async (newIncome?: Income) => {
    try {
      // Trigger sync to ensure latest data
      await sync({ silent: true });
      
      if (newIncome) {
        // Add the new income to the state
        addIncomeToState(newIncome);
      } else {
        // Fallback: Reload current month if no newIncome provided
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth();
        const monthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
        
        const { data } = await loadIncomesForMonth(currentYear, currentMonth);
        setAllIncomes(prev => ({
          ...prev,
          [monthKey]: data
        }));
      }
      
      setActiveTab('list');
    } catch (error) {
      console.error('Error updating incomes:', error);
    }
  };

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [incomeToDelete, setIncomeToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { sync } = useSync();


  // Helper function to sync data after successful deletion
  async function performPostDeleteSync() {
    try {
      // Dispatch sync start event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sync:start', { 
          detail: { operation: 'push' } 
        }));
      }
      
      // Use the sync system which handles both pull and push
      await sync({ silent: true });
      
      // Dispatch sync end event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sync:end'));
      }
    } catch (error) {
      // Ensure sync end event is dispatched even on error
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sync:end'));
      }
      console.error('Error during post-delete sync:', error);
      throw error; // Re-throw to handle in the calling function
    }
  }

  const handleDeleteClick = (incomeId: string) => {
    setIncomeToDelete(incomeId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteIncome = async () => {
    if (!incomeToDelete) return;

    setIsDeleting(true);
    try {
      const success = await deleteIncome(incomeToDelete);
      if (!success) {
        throw new Error('Failed to delete income');
      }

      // Update local state immediately for better UX
      setIncomes(incomes.filter(income => income.id !== incomeToDelete));
      
      // Then sync
      await performPostDeleteSync();
      await new Promise(resolve => setTimeout(resolve, 300)); // Small delay to ensure sync completes

      // Show success toast
      toast.custom((t) => (
        <div className={styles.toastContent}>
          <div className="h-5 w-5 flex items-center justify-center text-green-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <div>
            <p className="font-medium">Pendapatan dihapus!</p>
            <p className="text-sm text-muted-foreground">Pendapatan berhasil dihapus dan perubahan sedang disinkronisasi.</p>
          </div>
        </div>
      ), {
        duration: 3000,
        className: styles.toast,
        style: {
          background: 'transparent',
          border: 'none',
          boxShadow: 'none',
          padding: 0,
          margin: 0,
          width: 'auto',
          maxWidth: '90%',
        }
      });
      
      // Refresh the page to reflect changes
      router.refresh();
    } catch (error) {
      console.error('Error deleting income:', error);
      
      // Show error toast
      toast.custom((t) => (
        <div className={styles.toastContent}>
          <div className="h-5 w-5 flex items-center justify-center text-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </div>
          <div>
            <p className="font-medium">Ups! Terjadi kesalahan</p>
            <p className="text-sm text-muted-foreground">Gagal menghapus pendapatan. Silakan coba lagi.</p>
          </div>
        </div>
      ), {
        duration: 4000,
        className: styles.toast,
        style: {
          background: 'transparent',
          border: 'none',
          boxShadow: 'none',
          padding: 0,
          margin: 0,
          width: 'auto',
          maxWidth: '90%',
        }
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setIncomeToDelete(null);
    }
  };

  // Calculate total income from all loaded months
  const totalIncome = Object.values(allIncomes).reduce(
    (sum, monthIncomes) => sum + monthIncomes.reduce((s, income) => s + income.amount, 0),
    0
  );
  
  // Get sorted month keys (newest first)
  const sortedMonthKeys = Object.keys(allIncomes)
    .filter(key => allIncomes[key].length > 0) // Only show months with data
    .sort((a, b) => b.localeCompare(a)); // Sort by date descending
    
  // Check if there are more months to load
  const hasMoreMonths = sortedMonthKeys.length >= (expandedMonths + 1);

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
          <TabsList className="grid w-full grid-cols-2 h-10 sm:h-12 rounded-md p-1">
            <TabsTrigger
              value="add"
              className="h-8 sm:h-10 w-full text-xs font-medium sm:text-base flex items-center justify-center rounded-sm min-h-[32px] sm:min-h-[40px] gap-2"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden xs:inline">Add Income</span>
              <span className="xs:hidden">Add</span>
            </TabsTrigger>
            <TabsTrigger
              value="list"
              className="h-8 sm:h-10 w-full text-xs font-medium sm:text-base flex items-center justify-center rounded-sm min-h-[32px] sm:min-h-[40px] gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              <span className="hidden xs:inline">View Incomes</span>
              <span className="xs:hidden">View</span>
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
                ) : sortedMonthKeys.length > 0 ? (
                  <div className="space-y-6">
                    {sortedMonthKeys.map((monthKey, monthIndex) => {
                      const monthIncomes = allIncomes[monthKey] || [];
                      const monthDate = new Date(monthKey + '-01');
                      const isCurrentMonth = isSameMonth(monthDate, currentDate);
                      
                      return (
                        <div key={monthKey} className="space-y-3">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-medium text-foreground/90">
                              {format(monthDate, 'MMMM yyyy')}
                              {isCurrentMonth && (
                                <span className="ml-2 text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                                  Current
                                </span>
                              )}
                            </h3>
                            <div className="text-sm text-muted-foreground">
                              {monthIncomes.length} {monthIncomes.length === 1 ? 'entry' : 'entries'}
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            {monthIncomes.map((income, index) => (
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
                          
                          {monthIndex < sortedMonthKeys.length - 1 && (
                            <div className="relative my-6">
                              <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-border/50"></div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    {hasMoreMonths && (
                      <div className="flex justify-center pt-2">
                        <Button
                          variant="outline"
                          onClick={loadMoreMonths}
                          disabled={isLoadingMore}
                          className="gap-2 transition-all duration-200 hover:scale-105 active:scale-95"
                        >
                          {isLoadingMore ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            'See More'
                          )}
                        </Button>
                      </div>
                    )}
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