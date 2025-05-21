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
}

export interface Category {
  id: string
  name: string
  icon: string
}
