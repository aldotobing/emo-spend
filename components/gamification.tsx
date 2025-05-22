"use client";

import React from "react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Flame, Award, Star, TrendingUp, Calendar, Check } from "lucide-react";
// Menggunakan impor namespace untuk diagnosis
import * as db from "@/lib/db";
import type { Expense } from "@/types/expense";

console.log(
  "--- [Gamification Module Top Level] --- File gamification.tsx is being evaluated..."
);
console.log("--- [Gamification Module Imports] --- Imported db object:", db); // Log db object saat modul dievaluasi

interface GamificationProps {
  className?: string;
}

export function Gamification({ className }: GamificationProps) {
  console.log(
    "--- [Gamification Component] --- Gamification component rendering/rendered."
  );
  const [streak, setStreak] = useState(0);
  const [badges, setBadges] = useState<
    {
      id: string;
      name: string;
      icon: any;
      description: string;
      earned: boolean;
    }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log("--- [Gamification useEffect] --- useEffect triggered.");
    async function loadData() {
      console.log("--- [Gamification loadData] --- loadData function started.");
      setIsLoading(true);
      try {
        console.log(
          "--- [Gamification loadData] --- Imported 'db' object (inside loadData):",
          db
        );
        console.log(
          "--- [Gamification loadData] --- Keys in 'db' object (inside loadData):",
          db ? Object.keys(db) : "db is null/undefined"
        );
        console.log(
          "--- [Gamification loadData] --- typeof db.getExpenses (inside loadData):",
          db ? typeof db.getExpenses : "db is null/undefined"
        );

        if (db && typeof db.getExpenses === "function") {
          console.log(
            "--- [Gamification loadData] --- Attempting to call db.getExpenses()..."
          );
          const expenses = await db.getExpenses();
          console.log(
            "--- [Gamification loadData] --- db.getExpenses() call finished. Received expenses:",
            expenses ? expenses.length : "null/undefined"
          );

          const calculatedStreak = calculateStreak(expenses || []); // Pastikan expenses tidak null/undefined
          setStreak(calculatedStreak);

          const calculatedBadges = calculateBadges(
            expenses || [],
            calculatedStreak
          );
          setBadges(calculatedBadges);
          console.log(
            "--- [Gamification loadData] --- Streak and badges calculated."
          );
        } else {
          console.error(
            "--- [Gamification loadData ERROR] --- db.getExpenses is NOT a function or db object is problematic!"
          );
          // Jika ini terjadi, periksa log dari /lib/db.ts di terminal server
        }
      } catch (error) {
        console.error(
          "--- [Gamification loadData ERROR] --- Failed to load gamification data:",
          error
        );
      } finally {
        setIsLoading(false);
        console.log(
          "--- [Gamification loadData] --- loadData function finished."
        );
      }
    }

    loadData();
  }, []);
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Flame className="mr-2 h-5 w-5 text-orange-500" />
          Pencapaianmu
        </CardTitle>
        <CardDescription>Lacak kemajuan dan dapatkan lencana</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Streak Section */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Catatan Harian
            </h3>
            <motion.div
              className="bg-gradient-to-r from-orange-500/20 to-amber-500/20 rounded-xl p-4 flex items-center"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="h-12 w-12 rounded-full bg-orange-500/30 flex items-center justify-center mr-4">
                <Flame className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{streak} Hari</div>
                <div className="text-sm text-muted-foreground">
                  Catatan beruntun
                </div>
              </div>
            </motion.div>
          </div>

          {/* Badges Section */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Lencana
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {badges.map((badge, index) => (
                <motion.div
                  key={badge.id}
                  className={`rounded-xl p-3 flex flex-col items-center text-center ${
                    badge.earned
                      ? "bg-primary/10 border border-primary/20"
                      : "bg-muted/50 border border-muted opacity-60"
                  }`}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: index * 0.1, duration: 0.4 }}
                >
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center mb-2 ${
                      badge.earned ? "bg-primary/20" : "bg-muted"
                    }`}
                  >
                    {React.createElement(badge.icon, {
                      className: badge.earned
                        ? "h-5 w-5 text-primary"
                        : "h-5 w-5 text-muted-foreground",
                    })}
                  </div>
                  <div className="text-sm font-medium">{badge.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {badge.description}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
function calculateStreak(expenses: Expense[]): number {
  if (!expenses) return 0;
  return Math.floor(Math.random() * 7) + 1;
}
function calculateBadges(
  expenses: Expense[],
  streak: number
): {
  id: string;
  name: string;
  icon: any;
  description: string;
  earned: boolean;
}[] {
  if (!expenses) expenses = [];
  return [
    {
      id: "3-day-streak",
      name: "3 Hari Beruntun",
      icon: Flame,
      description: "Catat pengeluaran 3 hari berturut-turut",
      earned: streak >= 3,
    },
    {
      id: "budget-master",
      name: "Pengelola Anggaran",
      icon: Award,
      description: "Tetap dalam anggaran selama seminggu",
      earned: Math.random() > 0.5,
    },
    {
      id: "no-impulse",
      name: "Tidak Impulsif",
      icon: Check,
      description: "Tidak ada pembelian impulsif hari ini",
      earned: Math.random() > 0.3,
    },
    {
      id: "mood-tracker",
      name: "Pelacak Emosi",
      icon: TrendingUp,
      description: "Catat 10 pengeluaran dengan emosi",
      earned: expenses.length >= 10,
    },
    {
      id: "weekly-complete",
      name: "Minggu Lengkap",
      icon: Calendar,
      description: "Catat pengeluaran setiap hari selama seminggu",
      earned: streak >= 7,
    },
    {
      id: "insights-explorer",
      name: "Penjelajah Wawasan",
      icon: Star,
      description: "Lihat semua wawasan emosional",
      earned: Math.random() > 0.4,
    },
  ];
}

console.log(
  "--- [Gamification Module End] --- File gamification.tsx evaluation finished."
);
