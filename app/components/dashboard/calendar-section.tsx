import { Card, CardContent } from "@/components/ui/card";
import { EnhancedCalendar } from "@/components/enhanced-calendar";
import { moods } from "@/data/moods";
import type { Expense, MoodType } from "@/types/expense";
import { AnimatePresence, motion } from "framer-motion";

interface CalendarSectionProps {
  showCalendar: boolean;
  selectedMood: MoodType | "all";
  onMoodChange: (mood: MoodType | "all") => void;
  expenses: Expense[];
  isLoading: boolean;
}

export function CalendarSection({
  showCalendar,
  selectedMood,
  onMoodChange,
  expenses,
  isLoading,
}: CalendarSectionProps) {
  return (
    <AnimatePresence>
      {showCalendar && (
        <motion.div
          initial={{ opacity: 0, height: 0, marginBottom: 0 }}
          animate={{ opacity: 1, height: "auto", marginBottom: "1.5rem" }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden mb-6"
        >
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Calendar</h2>
                  <div className="flex items-center space-x-2">
                    <select
                      value={selectedMood}
                      onChange={(e) => onMoodChange(e.target.value as MoodType | "all")}
                      className="text-sm rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      <option value="all">All Moods</option>
                      {moods.map((mood) => (
                        <option key={mood.id} value={mood.id}>
                          {mood.emoji} {mood.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <EnhancedCalendar
                  expenses={expenses}
                  isLoading={isLoading}
                  selectedMood={
                    selectedMood === "all" ? undefined : selectedMood
                  }
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}