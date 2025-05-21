"use client"

import type React from "react"

import { useState } from "react"
import { moods } from "@/data/moods"
import { cn } from "@/lib/utils"
import type { MoodType } from "@/types/expense"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface SimpleMoodSelectorProps {
  value: MoodType
  onChange: (mood: MoodType, reason?: string) => void
}

export function SimpleMoodSelector({ value, onChange }: SimpleMoodSelectorProps) {
  const [reason, setReason] = useState<string>("")

  const handleMoodChange = (mood: MoodType) => {
    onChange(mood, reason)
  }

  const handleReasonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReason(e.target.value)
    onChange(value, e.target.value)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {moods.map((mood) => (
          <button
            key={mood.id}
            type="button"
            onClick={() => handleMoodChange(mood.id as MoodType)}
            className={cn(
              "flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all",
              value === mood.id
                ? "border-primary bg-primary/10"
                : "border-transparent hover:border-muted-foreground/20 hover:bg-muted",
            )}
          >
            <span className="text-3xl mb-1">{mood.emoji}</span>
            <span className="text-sm font-medium">{mood.label}</span>
          </button>
        ))}
      </div>

      {value && (
        <div className="space-y-2">
          <Label htmlFor="mood-reason">Why are you feeling this way? (Optional)</Label>
          <Textarea
            id="mood-reason"
            placeholder="I'm feeling this way because..."
            value={reason}
            onChange={handleReasonChange}
            className="resize-none"
          />
        </div>
      )}
    </div>
  )
}
