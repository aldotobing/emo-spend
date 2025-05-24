import Dexie, { type Table } from "dexie";
import type { Expense as AppExpense, MoodType } from "@/types/expense";
import { getSupabaseBrowserClient } from "./supabase";
import { User } from "@supabase/supabase-js";

export interface SyncedExpense extends AppExpense {
  synced: boolean;
}

export interface SyncStatusEntry {
  id: string;
  synced: boolean;
  lastAttempt?: string;
}

export class EmoSpendDatabase extends Dexie {
  expenses!: Table<SyncedExpense, string>;
  syncStatus!: Table<SyncStatusEntry, string>;

  constructor() {
    super("emoSpendDb");

    try {
      this.version(5)
        .stores({
          expenses: "++id, amount, category, mood, date, createdAt, synced",
          syncStatus: "id, synced, lastAttempt",
        })
        .upgrade(async (tx) => {
          // Check if the expenses table exists
          if (tx.table("expenses")) {
            await tx
              .table<SyncedExpense>("expenses")
              .toCollection()
              .modify((expense) => {
                if (expense.synced === undefined) {
                  expense.synced = false;
                }
              })
              .catch((err) =>
                console.error(
                  "--- [DB Constructor Log ERROR] --- Error during expenses table upgrade:",
                  err
                )
              );
          }
        });
    } catch (e: any) {
      console.error(
        "--- [DB Constructor Log ERROR] --- Error during EmoSpendDatabase construction (version/stores):",
        e.message,
        e.stack
      );
      throw e;
    }
  }
}

let dbInstance: EmoSpendDatabase | null = null;
export function getDb(): EmoSpendDatabase {
  if (!dbInstance) {
    try {
      dbInstance = new EmoSpendDatabase();
    } catch (e: any) {
      console.error(
        "--- [DB getDb() ERROR] --- Error creating EmoSpendDatabase instance in getDb():",
        e.message,
        e.stack
      );
      throw e;
    }
  } else {
    // console.log("--- [DB getDb()] --- Returning existing dbInstance."); // Bisa dikurangi lognya jika terlalu verbose
  }
  return dbInstance;
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = getSupabaseBrowserClient();
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) {
      /* console.error("[Auth] Error getting current user:", error.message); */ return null;
    }
    return user;
  } catch (e: any) {
    console.error("[Auth] Exception getting current user:", e.message);
    return null;
  }
}

export async function addExpense(
  expenseData: Omit<AppExpense, "id" | "createdAt">
): Promise<string | null> {
  const db = getDb();
  const supabase = getSupabaseBrowserClient();
  const id = crypto.randomUUID();
  const createdAtDate = new Date();
  
  // Dispatch sync start event for push operation
  dispatchSyncEvent('push');

  if (typeof id !== "string" || id.trim() === "") {
    console.error("[DB] Generated ID for addExpense is invalid:", id);
    return null;
  }

  const localExpense: SyncedExpense = {
    ...expenseData,
    id,
    createdAt: createdAtDate.toISOString(),
    synced: false,
  };

  try {
    await db.transaction("rw", db.expenses, db.syncStatus, async () => {
      await db.expenses.add(localExpense);
      await db.syncStatus.put({
        id,
        synced: false,
        lastAttempt: new Date().toISOString(),
      });
    });

    const user = await getCurrentUser();
    if (user && navigator.onLine) {
      const { synced, category, mood, moodReason, createdAt, ...baseData } =
        localExpense;
      const expenseToSync = {
        ...baseData,
        category_id: category,
        mood_id: mood,
        mood_reason: moodReason,
        created_at: createdAt,
        user_id: user.id,
      };
      const { error: supabaseError } = await supabase
        .from("expenses")
        .upsert(expenseToSync);
      if (supabaseError) {
        console.error(
          `[DB] Error syncing new expense ${id} to Supabase immediately:`,
          supabaseError.message,
          supabaseError.details
        );
        await db.syncStatus.update(id, {
          lastAttempt: new Date().toISOString(),
        });
      } else {
        await db.transaction("rw", db.expenses, db.syncStatus, async () => {
          await db.expenses.update(id, { synced: true });
          await db.syncStatus.update(id, {
            synced: true,
            lastAttempt: new Date().toISOString(),
          });
        });
      }
    } else {
      console.warn(
        `[DB] Expense ${id} saved locally. Immediate sync skipped (User: ${!!user}, Online: ${
          navigator.onLine
        }).`
      );
    }
    try {
      await syncGamificationData();
    } catch (gamificationError: any) {
      console.error("[DB] Error syncing gamification data:", gamificationError.message);
      // Don't fail the expense addition if gamification sync fails
    }
    return id;
  } catch (error: any) {
    console.error(`[SYNC] Error during sync:`, error.message);
    // Dispatch sync error event
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("sync:error", { 
        detail: { 
          message: error.message,
          operation: 'background'
        } 
      }));
    }
  } finally {
    // Dispatch sync end event
    dispatchSyncEvent(null);
  }
  return null;
}

export async function getExpenses(): Promise<SyncedExpense[]> {
  const db = getDb();
  try {
    return await db.expenses.orderBy("date").reverse().toArray();
  } catch (error: any) {
    console.error(
      "--- [DB getExpenses() ERROR] --- Error getting all expenses:",
      error.message,
      error.stack
    );
    return [];
  }
}

export async function getExpensesByDateRange(
  startDate: string,
  endDate: string
): Promise<SyncedExpense[]> {
  const db = getDb();
  try {
    return await db.expenses
      .where("date")
      .between(startDate, endDate, true, true)
      .toArray();
  } catch (error: any) {
    console.error(
      "--- [DB getExpensesByDateRange() ERROR] --- Error getting expenses by date range:",
      error.message,
      error.stack
    );
    return [];
  }
}

export async function getExpensesByMood(
  mood: MoodType | string
): Promise<SyncedExpense[]> {
  const db = getDb();
  try {
    return await db.expenses
      .where("mood")
      .equals(mood as string)
      .toArray();
  } catch (error: any) {
    console.error(
      "--- [DB getExpensesByMood() ERROR] --- Error getting expenses by mood:",
      error.message,
      error.stack
    );
    return [];
  }
}

export async function deleteExpense(id: string): Promise<boolean> {
  const db = getDb();
  const supabase = getSupabaseBrowserClient();
  if (typeof id !== "string" || id.trim() === "") {
    console.error("[DB] Attempted to delete expense with invalid ID:", id);
    return false;
  }
  try {
    await db.transaction("rw", db.expenses, db.syncStatus, async () => {
      await db.expenses.delete(id);
      await db.syncStatus.delete(id);
    });

    const user = await getCurrentUser();
    if (user && navigator.onLine) {
      const { error: supabaseError } = await supabase
        .from("expenses")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (supabaseError) {
        console.error(
          `[DB] Error deleting expense ${id} from Supabase:`,
          supabaseError.message
        );
        return false;
      } else {
      }
    } else {
      console.warn(
        `[DB] Deletion of ${id} from Supabase skipped (User: ${!!user}, Online: ${
          navigator.onLine
        }).`
      );
    }
    return true;
  } catch (error: any) {
    console.error(`[DB] Error deleting expense ${id}:`, error.message);
    return false;
  }
}

// This function is good for clearing local data on logout.
// We should ensure it only clears local data for the *current user* if multiple users might use the same browser,
// but clearing all local data for this specific app is generally fine for a single-user app.
export async function clearLocalUserData(): Promise<void> {
  const db = getDb();
  try {
    // Clear the expenses and syncStatus tables for the current user's data
    // Assuming a single-user app for now, clearing all tables is safe.
    // If you had multiple users on the same browser AND stored data per user,
    // you'd need to filter by user_id before clearing.
    await db.transaction("rw", db.expenses, db.syncStatus, async () => {
      await db.expenses.clear(); // Clears all expenses
      await db.syncStatus.clear(); // Clears all sync statuses
    });
  } catch (error: any) {
    console.error("[DB] Error clearing local user data:", error.message);
    // Important: Do not re-throw here. We want logout to proceed even if local clear fails.
  }
}

// Renaming the old clearAllData to emphasize it's for ALL data and includes remote
// This might be used for a "reset app" function, not just logout.
export async function clearAllLocalAndRemoteData(): Promise<void> {
  const db = getDb();
  const supabase = getSupabaseBrowserClient();
  try {
    const user = await getCurrentUser();
    if (user && navigator.onLine) {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("user_id", user.id);
      if (error)
        console.error(
          "[DB] Error clearing user's expenses from Supabase:",
          error.message
        );
      else console.log("[DB] User's expenses cleared from Supabase.");
    }
    await db.transaction("rw", db.expenses, db.syncStatus, async () => {
      await db.expenses.clear();
      await db.syncStatus.clear();
    });
  } catch (error: any) {
    console.error("[DB] Error clearing data:", error.message);
    throw error; // Re-throw if this is a "hard reset" function
  }
}

export async function syncExpenses(): Promise<void> {
  const db = getDb();
  const supabase = getSupabaseBrowserClient();
  const user = await getCurrentUser();

  // Dispatch sync start event
  dispatchSyncEvent('background');

  if (!user || !navigator.onLine) {
    // Dispatch sync end event
    dispatchSyncEvent(null);
    return;
  }
  if (!navigator.onLine) {
    return;
  }

  let allStatusEntries: SyncStatusEntry[];
  let unsyncedStatusEntries: SyncStatusEntry[];
  try {
    allStatusEntries = await db.syncStatus.toArray();
    unsyncedStatusEntries = allStatusEntries.filter((entry) => {
      if (typeof entry.id !== "string" || entry.id.trim() === "") return false;
      if (typeof entry.synced !== "boolean") {
        /* console.warn(`[Sync Debug] Invalid 'synced' in syncStatus ${entry.id}`); */ return true;
      }
      return entry.synced === false;
    });
  } catch (error: any) {
    console.error(
      "[Sync Debug] Error fetching/filtering syncStatus:",
      error.message,
      error.inner
    );
    return;
  }

  if (unsyncedStatusEntries.length === 0) {
    return;
  }

  const validExpenseIdsFromStatus = unsyncedStatusEntries.map((s) => s.id);
  let localExpensesToSync: SyncedExpense[];
  try {
    const potentialExpenses = await db.expenses.bulkGet(
      validExpenseIdsFromStatus
    );
    localExpensesToSync = potentialExpenses.filter((expense) => {
      if (!expense) {
        const missingId = validExpenseIdsFromStatus.find(
          (id) => !potentialExpenses.some((p) => p && p.id === id)
        );
        if (missingId) {
          db.syncStatus
            .delete(missingId)
            .catch((e) =>
              console.warn(
                `[Sync] Failed to delete orphaned syncStatus ${missingId}`,
                e
              )
            );
        }
        return false;
      }
      if (expense.synced === true) {
        db.syncStatus
          .update(expense.id, {
            synced: true,
            lastAttempt: new Date().toISOString(),
          })
          .catch((e) =>
            console.warn(`[Sync] Failed to correct syncStatus ${expense.id}`, e)
          );
        return false;
      }
      return typeof expense.id === "string" && expense.id.trim() !== "";
    }) as SyncedExpense[];
  } catch (error: any) {
    console.error(
      "[Sync] DexieError during .bulkGet() for sync:",
      error.message
    );
    return;
  }

  if (localExpensesToSync.length === 0) {
    return;
  }

  const supabasePayload = localExpensesToSync.map((exp) => {
    const { synced, category, mood, moodReason, createdAt, ...rest } = exp;
    return {
      ...rest,
      category_id: category,
      mood_id: mood,
      mood_reason: moodReason,
      created_at: createdAt,
      user_id: user.id,
    };
  });

  const { error: supabaseError } = await supabase
    .from("expenses")
    .upsert(supabasePayload, { onConflict: "id" });

  const syncTimestamp = new Date().toISOString();
  if (supabaseError) {
    console.error(
      "[Sync] Error syncing to Supabase:",
      supabaseError.message,
      supabaseError.details
    );
    // Dispatch sync error event
    window.dispatchEvent(new CustomEvent("sync:error", { 
      detail: { 
        operation: 'background',
        error: supabaseError 
      } 
    }));
    
    await db.transaction("rw", db.syncStatus, async () => {
      for (const expense of localExpensesToSync) {
        const statusEntry = await db.syncStatus.get(expense.id);
        if (statusEntry && !statusEntry.synced)
          await db.syncStatus.update(expense.id, {
            lastAttempt: syncTimestamp,
          });
      }
    });
    return;
  }
  await db.transaction("rw", db.expenses, db.syncStatus, async () => {
    for (const syncedExpense of localExpensesToSync) {
      try {
        await db.expenses.update(syncedExpense.id, { synced: true });
        await db.syncStatus.update(syncedExpense.id, {
          synced: true,
          lastAttempt: syncTimestamp,
        });
      } catch (updateError: any) {
        console.error(
          `[Sync] Failed to update local status for ${syncedExpense.id}:`,
          updateError.message
        );
      }
    }
  });
}

export async function pullExpensesFromSupabase(): Promise<void> {
  const db = getDb();
  const supabase = getSupabaseBrowserClient();
  const user = await getCurrentUser();

  // Dispatch sync start event with pull operation
  dispatchSyncEvent('pull');

  if (!user || !navigator.onLine) {
    // Dispatch sync end event
    dispatchSyncEvent(null);
    return;
  }
  if (!navigator.onLine) {
    return;
  }

  // Before pulling, you might want to clear existing data for the current user to prevent duplicates
  // This is crucial for a clean pull, especially if previous pulls or syncs were incomplete.
  // HOWEVER, be careful if you have un-synced local changes you want to preserve before pulling.
  // For a "fresh start" on login, clearing *before* pulling makes sense if no unsynced data should survive.
  // For standard sync, merging is often preferred.
  // Given your current setup, where pullExpensesFromSupabase uses bulkPut (which will update/insert),
  // it might overwrite or add, but not delete local expenses that are no longer in Supabase.
  // For logout, a full local clear is appropriate.

  const { data: supabaseData, error: supabaseError } = await supabase
    .from("expenses")
    .select(
      "id, amount, category_id, mood_id, mood_reason, date, notes, created_at, user_id, updated_at"
    )
    .eq("user_id", user.id);

  if (supabaseError) {
    console.error("[Sync] Error pulling from Supabase:", supabaseError.message);
    // Dispatch sync error event
    window.dispatchEvent(new CustomEvent("sync:error", { 
      detail: { 
        operation: 'pull',
        error: supabaseError 
      } 
    }));
    dispatchSyncEvent(null);
    return;
  }
  if (!supabaseData || supabaseData.length === 0) {
    // If no data to pull, ensure we still dispatch sync end event
    dispatchSyncEvent(null);
    return;
  }

  const expensesToStore: SyncedExpense[] = [];
  const syncTimestamp = new Date().toISOString();
  for (const remoteExpense of supabaseData) {
    if (
      typeof remoteExpense.id !== "string" ||
      remoteExpense.id.trim() === ""
    ) {
      console.warn("[Sync] Pulled expense with invalid ID:", remoteExpense);
      continue;
    }
    expensesToStore.push({
      id: remoteExpense.id,
      amount: remoteExpense.amount,
      category: remoteExpense.category_id,
      mood: remoteExpense.mood_id as MoodType,
      moodReason: remoteExpense.mood_reason,
      date: remoteExpense.date,
      notes: remoteExpense.notes,
      createdAt: remoteExpense.created_at,
      synced: true,
    });
  }

  if (expensesToStore.length > 0) {
    try {
      await db.transaction("rw", db.expenses, db.syncStatus, async () => {
        // Crucial: Before bulkPut, consider what to do with *existing* local expenses for this user.
        // If this is a login sync, you likely want to merge, or completely replace if pulling is authoritative.
        // For logout, we'll clear everything. For a pull (like on login), bulkPut is usually fine.
        await db.expenses.bulkPut(expensesToStore); // This will add new or update existing by ID
        for (const expense of expensesToStore)
          await db.syncStatus.put({
            id: expense.id,
            synced: true,
            lastAttempt: syncTimestamp,
          });
      });
    } catch (error: any) {
      console.error("[Sync] Error storing pulled expenses:", error.message);
      // Dispatch sync error event
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("sync:error", { 
          detail: { 
            message: error.message,
            operation: 'pull'
          } 
        }));
      }
    } finally {
      // Ensure we always dispatch sync end event, even if there was an error
      if (expensesToStore.length === 0) {
        dispatchSyncEvent(null);
      }
    }
  }
}

export type SyncOperation = 'push' | 'pull' | 'background' | 'gamification' | null;

function dispatchSyncEvent(operation: SyncOperation) {
  if (typeof window === "undefined") return;
  
  if (operation) {
    window.dispatchEvent(new CustomEvent("sync:start", { 
      detail: { operation } 
    }));
  } else {
    window.dispatchEvent(new CustomEvent("sync:end", { 
      detail: { operation: null } 
    }));
  }
}

export async function setupSync(): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }
  const supabase = getSupabaseBrowserClient();
  let isSyncing = false;

  // No need for custom events, using dispatchSyncEvent instead

  const performFullSync = async (reason: string) => {
    if (isSyncing) {
      return;
    }
    
    // Dispatch sync start event with background operation
    dispatchSyncEvent('background');
    isSyncing = true;
    
    try {
      await pullExpensesFromSupabase();
      await syncExpenses();
      await syncGamificationData();
    } catch (error: any) {
      console.error(
        `[SyncSetup] Error during full sync (${reason}):`,
        error.message
      );
    } finally {
      isSyncing = false;
      // Dispatch sync end event
      dispatchSyncEvent(null);
    }
  };

  window.addEventListener("online", () => performFullSync("App online"));
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === "SIGNED_IN" || (event === "INITIAL_SESSION" && session)) {
      if (navigator.onLine) performFullSync(`Auth: ${event}`);
      else console.log("[SyncSetup] User signed in but offline.");
    } else if (event === "SIGNED_OUT") {
      console.log("[SyncSetup] User signed out. Clearing local data...");
      // This is a good place to clear local data specific to the user.
      // But it's often more robust to do it *explicitly* in the logout handler
      // in auth-context, as onAuthStateChange might not always fire reliably
      // *before* components try to render, or if the browser is closed immediately.
      // However, as a safety net, it's not bad.
      // await clearLocalUserData(); // Optional: Add this here for robustness
    }
  });
}

// Add these functions to your db.ts file

// Special function to fix the 3-day streak badge issue
export async function fixStreakBadge(): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const user = await getCurrentUser();

  if (!user || !navigator.onLine) {
    console.log("[Badge Fix] No user or offline");
    return;
  }

  try {
    console.log("[Badge Fix] Starting badge fix for user:", user.id);
    
    // Get local expenses for streak calculation
    const expenses = await getExpenses();
    const calculatedStreak = calculateStreak(expenses);
    console.log("[Badge Fix] Calculated streak:", calculatedStreak);
    
    // Force add the 3-day streak badge if streak is >= 3
    if (calculatedStreak >= 3) {
      console.log("[Badge Fix] Adding 3-day streak badge");
      const { error } = await supabase.from("user_badges").upsert({
        user_id: user.id,
        badge_id: "3-day-streak",
        earned_at: new Date().toISOString()
      }, { onConflict: 'user_id,badge_id' });
      
      if (error) {
        console.error("[Badge Fix] Error adding badge:", error);
      } else {
        console.log("[Badge Fix] Badge added successfully!");
      }
    }
    
    // Update streak record
    const { error: streakError } = await supabase.from("user_streaks").upsert({
      user_id: user.id,
      current_streak: calculatedStreak,
      longest_streak: calculatedStreak, // This will be adjusted in the regular sync
      last_activity_date: new Date().toISOString().split('T')[0]
    }, { onConflict: 'user_id' });
    
    if (streakError) {
      console.error("[Badge Fix] Error updating streak:", streakError);
    } else {
      console.log("[Badge Fix] Streak updated successfully!");
    }
    
    return;
  } catch (error: any) {
    console.error("[Badge Fix] Error:", error.message);
  }
}

// Function to sync gamification data
export async function syncGamificationData(): Promise<void> {
  const db = getDb();
  const supabase = getSupabaseBrowserClient();
  const user = await getCurrentUser();

  if (!user) {
    console.warn("[GAMIFICATION] Cannot sync: No authenticated user");
    return;
  }
  
  // Dispatch sync start event for gamification operation
  dispatchSyncEvent('gamification');

  try {
    // Get local expenses for streak calculation
    const expenses = await getExpenses();
    const calculatedStreak = calculateStreak(expenses);
    
    // Check if user already has a streak record
    const { data: existingStreak, error: streakError } = await supabase
      .from("user_streaks")
      .select("*")
      .eq("user_id", user.id)
      .single();
    
    if (streakError && streakError.code !== "PGRST116") {
      console.error("[Gamification] Error checking for existing streak:", streakError);
      return;
    }
    
    if (!existingStreak) {
      // Create new streak record
      await supabase.from("user_streaks").insert({
        user_id: user.id,
        current_streak: calculatedStreak,
        longest_streak: calculatedStreak,
        last_activity_date: new Date().toISOString().split('T')[0]
      });
    } else {
      // Update existing streak record
      const longestStreak = Math.max(existingStreak.longest_streak, calculatedStreak);
      await supabase.from("user_streaks").update({
        current_streak: calculatedStreak,
        longest_streak: longestStreak,
        last_activity_date: new Date().toISOString().split('T')[0]
      }).eq("user_id", user.id);
    }
    
    // Sync badges based on local calculations
    const badges = calculateBadges(expenses, calculatedStreak);
    console.log("[Gamification] Calculated badges:", badges);
    console.log("[Gamification] Current streak:", calculatedStreak);
    
    // Force sync the 3-day streak badge if streak is >= 3
    if (calculatedStreak >= 3) {
      console.log("[Gamification] Forcing sync of 3-day streak badge");
      await supabase.from("user_badges").upsert({
        user_id: user.id,
        badge_id: "3-day-streak",
        earned_at: new Date().toISOString()
      }, { onConflict: 'user_id,badge_id' });
    }
    
    // Sync other badges
    for (const badge of badges) {
      console.log("[Gamification] Processing badge:", badge.id, "earned:", badge.earned);
      if (badge.earned) {
        await supabase.from("user_badges").upsert({
          user_id: user.id,
          badge_id: badge.id,
          earned_at: new Date().toISOString()
        }, { onConflict: 'user_id,badge_id' });
      }
    }
  } catch (error: any) {
    console.error("[GAMIFICATION] Error syncing gamification data:", error.message);
    // Dispatch sync error event
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("sync:error", { 
        detail: { 
          message: error.message,
          operation: 'gamification'
        } 
      }));
    }
  } finally {
    // Dispatch sync end event
    dispatchSyncEvent(null);
  }
}

// Helper function to calculate streak from expenses
function calculateStreak(expenses: SyncedExpense[]): number {
  if (!expenses || expenses.length === 0) return 0;
  
  // Sort expenses by date (newest first)
  const sortedExpenses = [...expenses].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  // Group expenses by date
  const expensesByDate = sortedExpenses.reduce<Record<string, SyncedExpense[]>>((acc, expense) => {
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

// Helper function to calculate badges
function calculateBadges(expenses: SyncedExpense[], streak: number): {
  id: string;
  earned: boolean;
}[] {
  if (!expenses) expenses = [];
  
  // Count expenses with mood data
  const expensesWithMood = expenses.filter(e => e.mood);
  
  return [
    {
      id: "3-day-streak",
      earned: streak >= 3,
    },
    {
      id: "budget-master",
      earned: false, // This requires budget data
    },
    {
      id: "no-impulse",
      earned: false, // This requires impulse purchase data
    },
    {
      id: "mood-tracker",
      earned: expensesWithMood.length >= 10,
    },
    {
      id: "weekly-complete",
      earned: streak >= 7,
    },
    {
      id: "insights-explorer",
      earned: false, // This requires tracking insights views
    },
  ];
}
