import { useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Expense } from "@/types/expense";
import { getCategory } from "@/data/categories";
import { getMood } from "@/data/moods";
import { Button } from "./ui/button";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface ExpenseListProps {
  readonly expenses: Expense[];
  readonly onDelete?: (id: string) => void;
}

export function ExpenseList({ expenses, onDelete }: ExpenseListProps) {
  const [showAll, setShowAll] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!onDelete) return;

    try {
      setIsDeleting(id);
      await Promise.resolve(onDelete(id));
      toast.success("Pengeluaran berhasil dihapus", {
        description: 'Pengeluaran telah dihapus dari catatan Anda.'
      });
    } catch (error) {
      console.error("Failed to delete expense:", error);
      toast.error("Gagal menghapus pengeluaran", {
        description: 'Terjadi kesalahan saat menghapus pengeluaran. Silakan coba lagi.'
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const visibleExpenses = showAll ? expenses : expenses.slice(0, 3);
  const hasMore = expenses.length > 3;

  return (
    <div className="space-y-4">
      {visibleExpenses.map((expense) => {
        const category = getCategory(expense.category);
        const mood = getMood(expense.mood);

        return (
          <div
            key={expense.id}
            className="flex items-center justify-between p-3 rounded-lg border group"
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
                <span className="text-lg">
                  {category ? category.icon : "❓"}
                </span>
              </div>
              <div className="flex-1">
                <div className="font-medium hidden sm:block">
                  {category ? category.name : "Unknown"}
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatDate(expense.date)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="font-medium">
                  {formatCurrency(expense.amount)}
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <span className="mr-1">{mood.emoji}</span>
                  <span>{mood.label}</span>
                </div>
              </div>
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(expense.id);
                  }}
                  disabled={isDeleting === expense.id}
                >
                  {isDeleting === expense.id ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
                  ) : (
                    <Trash2 className="h-4 w-4 text-destructive" />
                  )}
                </Button>
              )}
            </div>
          </div>
        );
      })}

      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? (
              <>
                Show less
                <ChevronUp className="ml-1 h-4 w-4" />
              </>
            ) : (
              <>
                Show all {expenses.length} expenses
                <ChevronDown className="ml-1 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
