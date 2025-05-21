"use client"

import type React from "react"
import { useState } from "react"
import { moods } from "@/data/moods"
import { cn } from "@/lib/utils"
import type { MoodType } from "@/types/expense"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { motion } from "framer-motion"

interface FunMoodSelectorProps {
  value: MoodType
  onChange: (mood: MoodType, reason?: string) => void
}

export function FunMoodSelector({ value, onChange }: FunMoodSelectorProps) {
  const [reason, setReason] = useState<string>("")

  const handleMoodChange = (mood: MoodType) => {
    onChange(mood, reason)
  }

  const handleReasonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReason(e.target.value)
    onChange(value, e.target.value)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        {moods.map((mood, index) => (
          <motion.button
            key={mood.id}
            type="button"
            onClick={() => handleMoodChange(mood.id as MoodType)}
            className={cn(
              "flex flex-col items-center justify-center p-4 rounded-2xl transition-all",
              value === mood.id
                ? "bg-gradient-to-br from-background to-primary/10 shadow-lg border-2 border-primary"
                : "bg-card hover:bg-primary/5 border-2 border-transparent",
            )}
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{
              opacity: 1,
              y: 0,
              transition: { delay: 0.1 * index, duration: 0.3 },
            }}
          >
            <motion.span
              className="text-4xl mb-2"
              animate={
                value === mood.id
                  ? {
                      scale: [1, 1.2, 1],
                      rotate: [0, 10, -10, 0],
                      transition: {
                        repeat: 1,
                        duration: 0.5,
                      },
                    }
                  : {}
              }
            >
              {mood.emoji}
            </motion.span>
            <span className="text-sm font-medium">{mood.label}</span>
          </motion.button>
        ))}
      </div>

      {value && (
        <motion.div
          className="space-y-2"
          initial={{ opacity: 0, height: 0 }}
          animate={{
            opacity: 1,
            height: "auto",
            transition: { duration: 0.3 },
          }}
        >
          <Label htmlFor="mood-reason" className="text-foreground/80">
            Why are you feeling this way? (Optional)
          </Label>
          <Textarea
            id="mood-reason"
            placeholder="I'm feeling this way because..."
            value={reason}
            onChange={handleReasonChange}
            className="resize-none rounded-xl border-primary/20 focus-visible:ring-primary/30 bg-background/50"
          />
        </motion.div>
      )}
    </div>
  )
}
