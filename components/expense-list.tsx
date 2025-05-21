import { formatCurrency, formatDate } from "@/lib/utils"
import type { Expense } from "@/types/expense"
import { getCategory } from "@/data/categories"
import { getMood } from "@/data/moods"

interface ExpenseListProps {
  expenses: Expense[]
}

export function ExpenseList({ expenses }: ExpenseListProps) {
  return (
    <div className="space-y-4">
      {expenses.map((expense) => {
        const category = getCategory(expense.category)
        const mood = getMood(expense.mood)

        return (
          <div key={expense.id} className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
                <span className="text-lg">{category.icon}</span>
              </div>
              <div>
                <div className="font-medium">{category.name}</div>
                <div className="text-sm text-muted-foreground">{formatDate(expense.date)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className="font-medium">{formatCurrency(expense.amount)}</div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <span className="mr-1">{mood.emoji}</span>
                  <span>{mood.label}</span>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
