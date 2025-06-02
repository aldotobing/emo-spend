import { useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Expense } from "@/types/expense";
import { getCategory } from "@/data/categories";
import { getMood } from "@/data/moods";
import { Button } from "./ui/button";
import { ChevronDown, ChevronUp, Trash2, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
    <div className="space-y-3">
      {visibleExpenses.map((expense) => {
        const category = getCategory(expense.category);
        const mood = getMood(expense.mood);
        const [isHovered, setIsHovered] = useState(false);

        return (
          <div
            key={expense.id}
            className={cn(
              "relative p-4 rounded-xl border transition-all duration-200",
              "hover:shadow-sm hover:border-muted-foreground/20",
              "group"
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* Date */}
            <div className="text-xs text-muted-foreground mb-3 font-medium">
              {formatDate(expense.createdAt, true)}
            </div>

            {/* Main Content */}
            <div className="flex items-start justify-between gap-3">
              {/* Left side - Category */}
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className={cn(
                  "flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-muted",
                  "transition-transform duration-200",
                  isHovered ? "scale-105" : ""
                )}>
                  <div className="flex items-center justify-center w-full h-full text-xl">
                    {category ? category.icon : "❓"}
                  </div>
                </div>
                <div className="min-w-0">
                  <h3 className="font-medium text-foreground/90 truncate hidden sm:block">
                    {category ? category.name : "Unknown Category"}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="text-base">{mood.emoji}</span>
                    <span className="text-xs text-muted-foreground/90 hidden sm:inline">
                      {mood.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right side - Amount and Actions */}
              <div className="flex items-center">
                <div className="text-right pr-3">
                  <div className="font-semibold text-foreground whitespace-nowrap text-base">
                    {formatCurrency(expense.amount)}
                  </div>
                </div>
                
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-8 w-8 -mr-2 transition-all duration-200",
                      isHovered ? "opacity-100" : "opacity-0"
                    )}
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
          </div>
        );
      })}
      

      {hasMore && (
        <div className="flex justify-center pt-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground group"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? (
              <>
                Show less
                <ChevronUp className="ml-1 h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
              </>
            ) : (
              <>
                Show all {expenses.length} expenses
                <ChevronDown className="ml-1 h-4 w-4 transition-transform group-hover:translate-y-0.5" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
