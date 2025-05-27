import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select";
  import { EnhancedCalendar } from "@/components/enhanced-calendar";
  import type { Expense, MoodType } from "@/types/expense";
  import { moods } from "@/data/moods";
  
  interface CalendarTabContentProps {
    selectedMood: MoodType | "all";
    onMoodChange: (mood: MoodType | "all") => void;
    expenses: Expense[];
    isLoading: boolean;
  }
  
  export function CalendarTabContent({
    selectedMood,
    onMoodChange,
    expenses,
    isLoading,
  }: CalendarTabContentProps) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h2 className="text-xl font-semibold shrink-0">
            Kalender Pengeluaran
          </h2>
          <Select
            value={selectedMood}
            onValueChange={(value) => onMoodChange(value as MoodType | "all")}
          >
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue placeholder="Filter berdasarkan mood" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Mood</SelectItem>
              {moods.map((mood) => (
                <SelectItem key={mood.id} value={mood.id}>
                  <span className="flex items-center">
                    <span className="mr-2">{mood.emoji}</span>
                    <span>{mood.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <EnhancedCalendar
          selectedMood={selectedMood === "all" ? undefined : selectedMood}
          expenses={expenses}
          isLoading={isLoading}
        />
      </div>
    );
  }