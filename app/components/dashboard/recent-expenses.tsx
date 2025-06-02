import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
  import { Skeleton } from "@/components/ui/skeleton";
  import { ExpenseList } from "@/components/expense-list";
  import type { Expense } from "@/types/expense";
  
  interface RecentExpensesProps {
    isLoading: boolean;
    expenses: Expense[];
    onExpenseDeleted?: () => void;
  }
  
  export function RecentExpenses({
    isLoading,
    expenses,
    onExpenseDeleted,
  }: RecentExpensesProps) {
    const recent = [...expenses]
      .sort((a, b) => {
        // First sort by date, then by creation time for same dates
        const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, 5);
  
    const handleDeleteExpense = async (id: string) => {
      try {
        // Dynamic import to potentially help with bundle splitting if db ops are heavy
        const { deleteExpense } = await import("@/lib/db");
        const success = await deleteExpense(id);
        if (success && onExpenseDeleted) {
          onExpenseDeleted();
        }
        return success;
      } catch (error) {
        console.error("Error deleting expense:", error);
        return false;
      }
    };
  
    return (
      <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-sm sm:text-base">
            Pengeluaran Terbaru
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <ExpenseList expenses={recent} onDelete={handleDeleteExpense} />
          )}
        </CardContent>
      </Card>
    );
  }