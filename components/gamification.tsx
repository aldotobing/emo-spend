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
import * as db from "@/lib/db";
import type { Expense } from "@/types/expense";
import { getSupabaseBrowserClient } from "@/lib/supabase";

interface GamificationProps {
  className?: string;
}

interface UserStreak {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string;
}

interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
}

interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
}

export function Gamification({ className }: GamificationProps) {
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

  // Function to load gamification data
  const loadData = async () => {
    setIsLoading(true);
    try {

      // Get current user
      const user = await db.getCurrentUser();
      if (!user) {

        setIsLoading(false);
        return;
      }


      const supabase = getSupabaseBrowserClient();
      
      // First try to get data from Supabase
      if (navigator.onLine) {
        // Get user streak from Supabase
        const { data: streakData, error: streakError } = await supabase
          .from("user_streaks")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (streakError && streakError.code !== "PGRST116") {

        }

          // Get all badges
          const { data: allBadges, error: badgesError } = await supabase
            .from("badges")
            .select("*");

          if (badgesError) {
  
          }

          // Get user's earned badges
          const { data: userBadges, error: userBadgesError } = await supabase
            .from("user_badges")
            .select("*")
            .eq("user_id", user.id);

          if (userBadgesError) {
  
          }

          if (streakData) {

            setStreak(streakData.current_streak);
          }

          if (allBadges && userBadges) {


            const formattedBadges = allBadges.map((badge) => {
              const earned = userBadges.some((ub) => ub.badge_id === badge.id);
              return {
                id: badge.id,
                name: badge.name,
                description: badge.description,
                icon: getIconComponent(badge.icon),
                earned,
              };
            });

            setBadges(formattedBadges);
          }
        } else {
          // Fallback to local data if offline
          const expenses = await db.getExpenses();

          const calculatedStreak = calculateStreak(expenses || []);

          setStreak(calculatedStreak);

          const calculatedBadges = calculateBadges(expenses || [], calculatedStreak);

          setBadges(calculatedBadges);
        }
      } catch (error) {

        
        // Fallback to local calculation if there's an error
        try {

          const expenses = await db.getExpenses();

          const calculatedStreak = calculateStreak(expenses || []);

          setStreak(calculatedStreak);

          const calculatedBadges = calculateBadges(expenses || [], calculatedStreak);

          setBadges(calculatedBadges);
        } catch (fallbackError) {

        }
      } finally {
        setIsLoading(false);
      }
    }

  useEffect(() => {
    loadData();
  }, []);

  // Helper function to get the icon component from string name
  function getIconComponent(iconName: string) {
    const iconMap: Record<string, any> = {
      "Flame": Flame,
      "Award": Award,
      "Star": Star,
      "TrendingUp": TrendingUp,
      "Calendar": Calendar,
      "Check": Check
    };
    
    return iconMap[iconName] || Star; // Default to Star if icon not found
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Flame className="mr-2 h-5 w-5 text-orange-500" />
          Pencapaianmu
        </CardTitle>
        <CardDescription>
          <span>Lacak kemajuan dan dapatkan lencana</span>
        </CardDescription>
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
              {badges.filter(badge => badge.earned).map((badge, index) => (
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

// Fallback function for calculating streak from local data
function calculateStreak(expenses: Expense[]): number {
  if (!expenses || expenses.length === 0) return 0;
  
  // Sort expenses by date (newest first)
  const sortedExpenses = [...expenses].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  // Group expenses by date
  const expensesByDate = sortedExpenses.reduce<Record<string, Expense[]>>((acc, expense) => {
    const dateStr = expense.date.split('T')[0]; // Get YYYY-MM-DD part
    if (!acc[dateStr]) {
      acc[dateStr] = [];
    }
    acc[dateStr].push(expense);
    return acc;
  }, {});
  
  // Get unique dates with expenses
  const dates = Object.keys(expensesByDate).sort().reverse(); // Sort dates newest first
  
  if (dates.length === 0) return 0;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const latestExpenseDate = new Date(dates[0]);
  latestExpenseDate.setHours(0, 0, 0, 0);
  
  // If latest expense is not from today or yesterday, streak is broken
  const daysSinceLatest = Math.floor((today.getTime() - latestExpenseDate.getTime()) / (1000 * 60 * 60 * 24));
  if (daysSinceLatest > 1) return 0;
  
  // Count consecutive days
  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const currentDate = new Date(dates[i-1]);
    const prevDate = new Date(dates[i]);
    
    // Calculate difference in days
    const diffDays = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      streak++;
    } else if (diffDays > 1) {
      // Streak is broken
      break;
    }
  }
  
  return streak;
}

// Fallback function for calculating badges from local data
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
  
  // Count expenses with mood data
  const expensesWithMood = expenses.filter(e => e.mood !== undefined && e.mood !== null);
  
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
      earned: false, // This requires budget data which we don't have locally
    },
    {
      id: "no-impulse",
      name: "Tidak Impulsif",
      icon: Check,
      description: "Tidak ada pembelian impulsif hari ini",
      earned: false, // This requires impulse purchase data which we don't have locally
    },
    {
      id: "mood-tracker",
      name: "Pelacak Emosi",
      icon: TrendingUp,
      description: "Catat 10 pengeluaran dengan emosi",
      earned: expensesWithMood.length >= 10,
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
      earned: false, // This requires tracking insights views which we don't have locally
    },
  ];
}