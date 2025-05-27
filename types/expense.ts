export type MoodType = "happy" | "sad" | "stressed" | "bored" | "lonely" | "neutral"

export interface Mood {
  id: MoodType
  emoji: string
  label: string
  color: string
}

export interface Expense {
  id: string
  amount: number
  category: string
  mood: MoodType
  moodReason?: string
  date: string
  notes?: string
  createdAt: string
  updatedAt?: string
}

export interface Category {
  id: string
  name: string
  icon: string
}

export type Income = {
  id: string;
  user_id: string;
  amount: number;
  source: string;
  description?: string;
  date: string;
  created_at: string;
  updated_at: string;
  synced?: boolean;
}

export type Transaction = {
  id: string;
  user_id: string;
  amount: number;
  type: 'expense' | 'income';
  category: string | number; // category_id for expenses, source for incomes
  description: string | null;
  date: string;
  created_at: string;
  updated_at: string;
  // Additional fields that might be present based on the type
  mood?: MoodType;
  moodReason?: string;
  notes?: string;
  source?: string; // For income transactions
};
