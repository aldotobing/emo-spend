import { Gamification } from "@/components/gamification";
import type { Expense } from "@/types/expense";

interface GamificationTabContentProps {
  expenses: Expense[];
  isLoading: boolean;
}

export function GamificationTabContent({
  expenses,
  isLoading,
}: GamificationTabContentProps) {
  return <Gamification expenses={expenses} isLoading={isLoading} />;
}