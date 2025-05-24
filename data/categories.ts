import type { Category } from "@/types/expense";

export const categories: Category[] = [
  {
    id: "food",
    name: "Food & Dining",
    icon: "🍔",
  },
  {
    id: "transport",
    name: "Transportation",
    icon: "🚗",
  },
  {
    id: "shopping",
    name: "Shopping",
    icon: "🛍️",
  },
  {
    id: "entertainment",
    name: "Entertainment",
    icon: "🎬",
  },
  {
    id: "health",
    name: "Health & Fitness",
    icon: "💊",
  },
  {
    id: "bills",
    name: "Bills & Utilities",
    icon: "📱",
  },
  {
    id: "education",
    name: "Education",
    icon: "📚",
  },
  {
    id: "travel",
    name: "Travel",
    icon: "✈️",
  },
  {
    id: "other",
    name: "Other",
    icon: "📦",
  },
];

export function getCategory(id: string): Category | undefined {
  return (
    categories.find((category) => category.id === id) ||
    categories.find((c) => c.id === "other")
  );
}
