import type { Mood } from "@/types/expense"

export const moods: Mood[] = [
  {
    id: "happy",
    emoji: "😊",
    label: "Happy",
    color: "hsl(var(--mood-happy))",
  },
  {
    id: "sad",
    emoji: "😢",
    label: "Sad",
    color: "hsl(var(--mood-sad))",
  },
  {
    id: "stressed",
    emoji: "😖",
    label: "Stressed",
    color: "hsl(var(--mood-stressed))",
  },
  {
    id: "bored",
    emoji: "😑",
    label: "Bored",
    color: "hsl(var(--mood-bored))",
  },
  {
    id: "lonely",
    emoji: "😔",
    label: "Lonely",
    color: "hsl(var(--mood-lonely))",
  },
  {
    id: "neutral",
    emoji: "😐",
    label: "Neutral",
    color: "hsl(var(--mood-neutral))",
  },
]

export function getMood(id: string): Mood {
  return moods.find((mood) => mood.id === id) || moods[5] // Default to neutral
}
