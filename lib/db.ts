import Dexie, { type Table } from "dexie";
import type { Expense as AppExpense, MoodType, Income as AppIncome } from "@/types/expense";
import { getSupabaseBrowserClient } from "./supabase";
import { User } from "@supabase/supabase-js";
import { Mutex } from 'async-mutex';

// Debug logging disabled in production
const DEBUG = false;

/**
 * Safely parses a date string, returning a Date object or epoch start if invalid
 * @param dateStr - Date string to parse
 * @returns Date object or epoch start if invalid
 */
function safeDateParse(dateStr: string | undefined | null): Date {
  return dateStr ? new Date(dateStr) : new Date(0);
}

export interface SyncedExpense extends AppExpense {
  synced: boolean;
}

export interface SyncedIncome extends Omit<AppIncome, 'synced'> {
  synced: boolean;
  // Add any additional fields that might be needed for the local database
  userId?: string; // Alias for user_id for consistency
}

export interface SyncStatusEntry {
  id: string;
  synced: boolean;
  lastAttempt?: string;
}

export class EmoSpendDatabase extends Dexie {
  expenses!: Table<SyncedExpense, string>;
  incomes!: Table<SyncedIncome, string>;
  syncStatus!: Table<SyncStatusEntry, string>;
  categories!: Table<{ id: string; name: string; icon: string; color: string }, string>;
  moods!: Table<{ id: string; name: string; emoji: string; color: string }, string>;
  syncQueue!: Table<{
    id?: number;
    table_name: string;
    record_id: string;
    action: 'create' | 'update' | 'delete';
    data: any;
    created_at: string;
  }, number>;

  constructor() {
    super("emoSpendDb");

    // Version 1 - Initial schema
    this.version(1).stores({
      expenses: 'id, user_id, date, category, mood, [user_id+date]',
      incomes: 'id, user_id, date, source, [user_id+date]',
      categories: 'id, user_id, name, icon, color',
      moods: 'id, user_id, name, emoji, color',
      syncStatus: 'id, synced, lastAttempt',
      syncQueue: '++id, table_name, record_id, action, created_at'
    });

    // Version 2 - Add indexes for better date-based queries
    this.version(2)
      .stores({
        expenses: 'id, user_id, date, category, mood, [user_id+date], [date]',
        incomes: 'id, user_id, date, source, [user_id+date], [date]',
        categories: 'id, user_id, name, icon, color',
        moods: 'id, user_id, name, emoji, color',
        syncStatus: 'id, synced, lastAttempt',
        syncQueue: '++id, table_name, record_id, action, created_at'
      })
      .upgrade(tx => {
        // Migration code if needed
        return Promise.resolve();
      });

    // Version 3 - Add synced flag to all tables
    this.version(3)
      .stores({
        expenses: 'id, user_id, date, category, mood, [user_id+date], [date], synced',
        incomes: 'id, user_id, date, source, [user_id+date], [date], synced',
        categories: 'id, user_id, name, icon, color, synced',
        moods: 'id, user_id, name, emoji, color, synced',
        syncStatus: 'id, synced, lastAttempt',
        syncQueue: '++id, table_name, record_id, action, created_at'
      })
      .upgrade(async tx => {
        // Add synced flag to existing records
        const tables = ['expenses', 'incomes', 'categories', 'moods'];
        for (const table of tables) {
          await tx.table(table).toCollection().modify(record => {
            if (record.synced === undefined) {
              record.synced = true; // Mark existing records as synced
            }
          }).catch(console.error);
        }
      });
  }
}

let dbInstance: EmoSpendDatabase | null = null;
const syncMutex = new Mutex();
let isSyncing = false;

const SYNC_TIMEOUT = 30000; // 30 seconds

export function getDb(): EmoSpendDatabase {
  if (!dbInstance) {
    try {
      console.log('[DB] Initializing database...');
      dbInstance = new EmoSpendDatabase();
      
      // Set up version change handler
      dbInstance.on('versionchange', (event: any) => {
        // console.log('[DB] Database version change detected:', event);
        // Close the database to allow the upgrade to proceed
        dbInstance?.close();
        dbInstance = null;
        // Notify the user if needed
        if (event.newVersion !== null) { // null means database is being deleted
          // console.log('[DB] Database is being upgraded. Please refresh the page when complete.');
        }
      });
      
      // Log successful initialization
      dbInstance.open().then(() => {
        // console.log('[DB] Database opened successfully');
      }).catch((error: any) => {
        // console.error('[DB] Error opening database:', error);
      });
      
    } catch (e) {
      // console.error("[DB] Failed to initialize database:", e);
      
      // Try to recover by deleting the database and recreating it
      if (typeof window !== 'undefined' && window.indexedDB && window.indexedDB.deleteDatabase) {
        // console.log('[DB] Attempting to reset database...');
        
        // Close any existing connection first
        if (dbInstance) {
          dbInstance.close();
          dbInstance = null;
        }
        
        // Delete and recreate
        const deleteRequest = window.indexedDB.deleteDatabase("emoSpendDb");
        
        deleteRequest.onsuccess = () => {
          // console.log("[DB] Database deleted successfully, recreating...");
          try {
            dbInstance = new EmoSpendDatabase();
          } catch (innerError) {
            console.error("[DB] Failed to recreate database:", innerError);
          }
        };
        
        deleteRequest.onerror = (event: any) => {
          console.error("[DB] Failed to delete database:", event.target?.error);
        };
      }
      
      // If we still don't have a database instance, throw an error
      if (!dbInstance) {
        const error = new Error("Failed to initialize database");
        console.error(error);
        throw error;
      }
    }
  }
  
  if (!dbInstance) {
    const error = new Error("Database instance is not available");
    console.error(error);
    throw error;
  }
  
  return dbInstance;
}

export async function getCurrentUser(): Promise<User | null> {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return null;
  }

  const supabase = getSupabaseBrowserClient();
  
  // First try to get the session
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    // If we have a valid session with user, return the user
    if (session?.user?.id) {
      return session.user;
    }
    
    // If no session, try to get the user directly
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (user?.id) {
      return user;
    }
    
    // If we get here, no valid user was found
    return null;
    
  } catch (error) {
    // console.error('[Auth] Error getting user:', error);
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
  
  if (typeof id !== "string" || id.trim() === "") {
    // console.error("[DB] Generated ID for addExpense is invalid:", id);
    return null;
  }

  const localExpense: SyncedExpense = {
    ...expenseData,
    id,
    createdAt: createdAtDate.toISOString(),
    synced: false,
  };

  let result: string | null = null;
  
  try {
    // Start sync operation
    dispatchSyncEvent('push');
    
    // First, save locally
    await db.transaction("rw", db.expenses, db.syncStatus, async () => {
      await db.expenses.add(localExpense);
      await db.syncStatus.put({
        id,
        synced: false,
        lastAttempt: new Date().toISOString(),
      });
    });

    result = id; // Mark as successful so far

    // Try to sync immediately if online
    const user = await getCurrentUser();
    if (user && navigator.onLine) {
      try {
        const { synced, category, mood, moodReason, createdAt, date, ...baseData } = localExpense;
        
        // Ensure date is in YYYY-MM-DD format for Supabase
        const formatDateForSupabase = (dateStr: string): string => {
          try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr; // Return as-is if invalid
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          } catch (e) {
            console.warn('[DB] Error formatting date for Supabase:', e);
            return dateStr;
          }
        };

        const expenseToSync = {
          ...baseData,
          date: formatDateForSupabase(date), // Ensure proper date format
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
            `[DB] Error syncing new expense ${id} to Supabase:`,
            supabaseError.message,
            supabaseError.details
          );
          throw supabaseError;
        }

        // Update sync status if successful
        await db.transaction("rw", db.expenses, db.syncStatus, async () => {
          await db.expenses.update(id, { synced: true });
          await db.syncStatus.update(id, {
            synced: true,
            lastAttempt: new Date().toISOString(),
          });
        });
      } catch (syncError) {
        console.error(`[DB] Error during immediate sync of expense ${id}:`, syncError);
        // Don't rethrow - we'll let the background sync handle retries
      }
    }

    // Sync gamification data in the background
    syncGamificationData().catch(gamificationError => {
      console.error("[DB] Error syncing gamification data:", gamificationError);
    });

    return id;
  } catch (error: any) {
    console.error(`[DB] Error in addExpense for ${id}:`, error.message);
    
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("sync:error", { 
        detail: { 
          message: error.message,
          operation: 'push',
          expenseId: id
        } 
      }));
    }
    
    // If we have a result, the expense was saved locally but sync failed
    if (result) return result;
    
    throw error;
  } finally {
    // Always dispatch sync end event
    dispatchSyncEvent(null);
  }
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
    // Parse input dates (they should be in YYYY-MM-DD format)
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0); // Start of day
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // End of day
    
    // Format dates as YYYY-MM-DD for comparison with stored dates
    const formatDate = (date: Date) => {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };
    
    const startDateStr = formatDate(start);
    const endDateStr = formatDate(end);
    
    // First, try to use an indexed query if possible
    const expenses = await db.expenses
      .toCollection()
      .filter(expense => {
        try {
          // Direct string comparison since we're storing dates as YYYY-MM-DD
          return expense.date >= startDateStr && expense.date <= endDateStr;
        } catch (e) {
          console.error('Error comparing expense date:', expense.date, e);
          return false;
        }
      })
      .toArray();
    
    return expenses;
  } catch (error: any) {
    console.error(
      "[DB getExpensesByDateRange ERROR] Error getting expenses by date range:",
      error.message,
      error.stack
    );
    
    // Fallback to client-side filtering with date objects if string comparison fails
    try {
      const allExpenses = await db.expenses.toArray();
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      return allExpenses.filter(expense => {
        try {
          const expenseDate = new Date(expense.date);
          return expenseDate >= start && expenseDate <= end;
        } catch (e) {
          console.error('Error parsing expense date (fallback):', expense.date, e);
          return false;
        }
      });
    } catch (fallbackError) {
      console.error('[DB getExpensesByDateRange FALLBACK ERROR]', fallbackError);
      return [];
    }
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
    // Clear the expenses, incomes, and syncStatus tables for the current user's data
    // Assuming a single-user app for now, clearing all tables is safe.
    // If you had multiple users on the same browser AND stored data per user,
    // you'd need to filter by user_id before clearing.
    await db.transaction("rw", db.expenses, db.incomes, db.syncStatus, async () => {
      await db.expenses.clear(); // Clears all expenses
      await db.incomes.clear();  // Clears all incomes
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

export async function syncExpenses(): Promise<{ syncedLocal: number; syncedRemote: number; skipped: number }> {
  const controller = new AbortController();
  try {
    return await Promise.race([
      actualSyncOperation(controller.signal),
      new Promise<never>((_, reject) => setTimeout(
        () => reject(new Error('Sync timed out after 30 seconds')), 
        30000
      ))
    ]);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Sync] Error during sync:', error);
    window.dispatchEvent(new CustomEvent("sync:error", { 
      detail: { 
        operation: 'sync',
        error: errorMsg,
        message: 'Failed to sync with Supabase'
      } 
    }));
    return { syncedLocal: 0, syncedRemote: 0, skipped: 0 };
  }
}

async function actualSyncOperation(signal: AbortSignal) {
  // Add a timeout to prevent hanging
  const syncTimeout = setTimeout(() => {
    console.error('[Sync] Sync operation timed out');
    window.dispatchEvent(new CustomEvent("sync:error", { 
      detail: { 
        operation: 'sync',
        error: 'Sync operation timed out'
      } 
    }));
    return { syncedLocal: 0, syncedRemote: 0, skipped: 0 };
  }, 30000); // 30 seconds timeout

  try {
    const db = getDb();
    const supabase = getSupabaseBrowserClient();
    const user = await getCurrentUser();
    
    // Initialize counters
    let syncedLocal = 0;
    let syncedRemote = 0;
    let skipped = 0;

    // Check preconditions
    if (!user) {
      // console.log('[Sync] No user - skipping  sync');
      return { syncedLocal: 0, syncedRemote: 0, skipped: 0 };
    }

    // Check online status
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      // console.log('[Sync] Offline - skipping sync');
      return { syncedLocal: 0, syncedRemote: 0, skipped: 0 };
    }

    // First, pull any remote changes
    // console.log('[Sync] Pulling remote changes...');
    const pullResult = await pullExpensesFromSupabase();
    // console.log(`[Sync] Pulled ${pullResult.synced} remote changes, skipped ${pullResult.skipped}`);
    syncedRemote = pullResult.synced;
    skipped = pullResult.skipped;

    // Find all local changes that need to be synced
    // console.log('[Sync] Finding unsynced local changes...');
    let unsyncedStatusEntries: SyncStatusEntry[] = [];
    try {
      const allStatusEntries = await db.syncStatus.toArray();
      unsyncedStatusEntries = allStatusEntries.filter(entry => 
        entry.id && entry.id.trim() !== "" && entry.synced === false
      );
    } catch (error: any) {
      const errorMsg = `Error finding unsynced changes: ${error.message}`;
      // console.error('[Sync]', errorMsg);
      window.dispatchEvent(new CustomEvent("sync:error", { 
        detail: { 
          operation: 'sync',
          error: errorMsg
        } 
      }));
      return { syncedLocal: 0, syncedRemote, skipped };
    }

    // If no local changes, we're done
    if (unsyncedStatusEntries.length === 0) {
      // console.log('[Sync] No local changes to sync');
      return { syncedLocal: 0, syncedRemote, skipped };
    }

    // console.log(`[Sync] Found ${unsyncedStatusEntries.length} unsynced items`);

    // Get the actual expense data for unsynced items
    const validExpenseIds = unsyncedStatusEntries.map(s => s.id).filter(Boolean) as string[];
    const potentialExpenses = await db.expenses.bulkGet(validExpenseIds);
    
    // Process each potential expense
    const localExpensesToSync: SyncedExpense[] = [];
    for (let i = 0; i < potentialExpenses.length; i++) {
      const expense = potentialExpenses[i];
      const statusEntry = unsyncedStatusEntries[i];
      
      if (!expense) {
        // Clean up orphaned sync status
        if (statusEntry) {
          await db.syncStatus.delete(statusEntry.id).catch(console.error);
        }
        continue;
      }
      
      // Skip if already synced (could have been synced by another tab/device)
      if (expense.synced) {
        await db.syncStatus.update(expense.id, {
          synced: true,
          lastAttempt: new Date().toISOString(),
        }).catch(console.error);
        continue;
      }
      
      // Add to sync queue
      if (expense.id) {
        localExpensesToSync.push(expense);
      }
    }

    if (localExpensesToSync.length === 0) {
      // console.log('[Sync] No valid local changes to sync after processing');
      return { syncedLocal: 0, syncedRemote, skipped };
    }

    // console.log(`[Sync] Syncing ${localExpensesToSync.length} local changes...`);

    // Prepare the payload for Supabase
    const syncTimestamp = new Date().toISOString();
    const supabasePayload = localExpensesToSync.map((exp) => {
      const { synced, category, mood, moodReason, createdAt, updatedAt, ...baseData } = exp;
      return {
        ...baseData,
        category_id: category,
        mood_id: mood,
        mood_reason: moodReason,
        created_at: createdAt,
        updated_at: updatedAt || syncTimestamp,
        user_id: user.id,
      };
    });

    // Send to Supabase
    const { error: supabaseError } = await supabase
      .from("expenses")
      .upsert(supabasePayload, { onConflict: "id" });

    if (supabaseError) {
      throw new Error(`Supabase error: ${supabaseError.message}`);
    }

    // Update local sync status for successful syncs
    for (const expense of localExpensesToSync) {
      try {
        await db.transaction("rw", [db.expenses, db.syncStatus], async () => {
          await db.expenses.update(expense.id, { 
            synced: true,
            updatedAt: syncTimestamp
          });
          await db.syncStatus.update(expense.id, {
            synced: true,
            lastAttempt: syncTimestamp,
          });
        });
        syncedLocal++;
      } catch (updateError) {
        console.error(`[Sync] Failed to update local status for ${expense.id}:`, updateError);
      }
    }

    // console.log(`[Sync] Successfully synced ${syncedLocal} expenses`);
    return { 
      syncedLocal, 
      syncedRemote, 
      skipped 
    };

  } catch (error) {
    console.error('[Sync] Error during sync:', error);
    return { syncedLocal: 0, syncedRemote: 0, skipped: 0 };
  } finally {
    clearTimeout(syncTimeout);
  }
}

export async function pullExpensesFromSupabase(attempt = 1): Promise<{ synced: number; skipped: number }> {
  // console.log(`[Pull] Starting expense pull attempt ${attempt}`);
  const startTime = Date.now();
  const MAX_ATTEMPTS = 3;
  const PAGE_SIZE = 100;
  const TIMEOUT = 25000; // 25 seconds
  
  // Add a timeout to prevent hanging
  let pullTimeout: NodeJS.Timeout;
  const timeoutPromise = new Promise<{ synced: number; skipped: number }>((_, reject) => {
    pullTimeout = setTimeout(() => {
      const error = new Error('Pull operation timed out after 25s');
      console.error('[Pull]', error.message);
      reject(error);
    }, TIMEOUT); // 25 seconds timeout
  });

  try {
    // console.log('[Pull] Getting database instance...');
    const db = getDb();
    const supabase = getSupabaseBrowserClient();
    
    // console.log('[Pull] Getting current user...');
    const user = await getCurrentUser();

    // Check preconditions
    if (!user) {
      // console.log('[Pull] No user - skipping pull');
      return { synced: 0, skipped: 0 };
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      // console.log('[Pull] Offline - skipping pull');
      return { synced: 0, skipped: 0 };
    }

    // console.log('[Pull] Fetching expenses from Supabase...');
    
    let page = 0;
    let hasMore = true;
    let totalSynced = 0;
    let totalSkipped = 0;

    while (hasMore) {
      // console.log(`[Pull] Fetching page ${page + 1}`);
      
      const { data, error, count } = await supabase
        .from("expenses")
        .select("*", { count: 'exact' })
        .eq("user_id", user.id)
        .order('updated_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error) {
        if(error.message.includes('rate limit') || error.message.includes('quota')) {
          console.error('[Pull] Supabase free tier limit reached');
          window.dispatchEvent(new CustomEvent("sync:error", { 
            detail: { 
              error: 'Batas paket gratis Supabase tercapai',
              solution: 'Upgrade ke Pro Plan atau kurangi data sync'
            }
          }));
          return { synced: 0, skipped: 0 };
        }
        throw error;
      }
      
      hasMore = data.length === PAGE_SIZE;
      page++;

      // Process page data
      const { synced, skipped } = await processPageData(data);
      totalSynced += synced;
      totalSkipped += skipped;

      // Send progress event every 500ms
      window.dispatchEvent(new CustomEvent('sync:progress', {
        detail: {
          operation: 'pull',
          currentPage: page,
          totalItems: count,
          processedItems: page * PAGE_SIZE
        }
      }));
    }

    return { synced: totalSynced, skipped: totalSkipped };
  } catch (error) {
    clearTimeout(pullTimeout!);
    
    // If we haven't exceeded max attempts, retry
    if (attempt < MAX_ATTEMPTS) {
      // console.log(`[Pull] Retrying... (${attempt + 1}/${MAX_ATTEMPTS})`);
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      return pullExpensesFromSupabase(attempt + 1);
    }

    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Pull] Final error after retries:', error);
    window.dispatchEvent(new CustomEvent("sync:error", { 
      detail: { 
        operation: 'pull',
        error: errorMsg,
        message: 'Failed to pull from Supabase after multiple attempts'
      } 
    }));
    return { synced: 0, skipped: 0 };
  } finally {
    clearTimeout(pullTimeout!);
    // console.log(`[Pull] Pull operation completed in ${Date.now() - startTime}ms`);
  }
}

async function processPageData(data: any[]) {
  const db = getDb();
  const supabase = getSupabaseBrowserClient();
  const user = await getCurrentUser();

  let syncedCount = 0;
  let skippedCount = 0;

  for (const [index, remote] of data.entries()) {
    try {
      // Add a small delay every 10 items to prevent UI freezing
      if (index > 0 && index % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      const local = await db.expenses.get(remote.id);
      const remoteUpdated = new Date(remote.updated_at || 0);
      const localUpdated = local ? new Date(local.updatedAt || 0) : new Date(0);

      // Skip if local version is newer and already synced
      if (local && local.synced && localUpdated > remoteUpdated) {
        skippedCount++;
        continue;
      }

      // Format date to YYYY-MM-DD if it's not already in that format
      const formatDate = (dateStr: string): string => {
        try {
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) return dateStr; // Return as-is if invalid date
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        } catch (e) {
          console.warn(`[DB] Error formatting date ${dateStr}:`, e);
          return dateStr;
        }
      };

      // Convert remote format to local format
      const expense: SyncedExpense = {
        id: remote.id,
        amount: remote.amount,
        category: remote.category_id,
        mood: remote.mood_id,
        moodReason: remote.mood_reason,
        date: formatDate(remote.date),
        notes: remote.notes || '',
        createdAt: remote.created_at,
        updatedAt: remote.updated_at || new Date().toISOString(),
        synced: true
      };

      // Update or create the expense
      await db.expenses.put(expense);
      await db.syncStatus.put({
        id: expense.id,
        synced: true,
        lastAttempt: new Date().toISOString(),
      });

      syncedCount++;

    } catch (expenseError) {
      // console.error(`[Pull] Error processing expense ${remote?.id}:`, expenseError);
    }
  }

  return { synced: syncedCount, skipped: skippedCount };
}

// Recommended Supabase SQL index for better performance:
// CREATE INDEX IF NOT EXISTS expenses_user_updated_idx ON expenses (user_id, updated_at DESC);
// Run this in your Supabase SQL editor for better query performance

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
  
  // In db.ts, update the performFullSync function
const performFullSync = async (reason: string) => {
  let release: (() => void) | null = null;
  let timeout: NodeJS.Timeout | null = null;

  try {
    // Try to acquire the lock with a timeout
    try {
      release = await Promise.race([
        syncMutex.acquire(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Mutex acquisition timeout')), 5000)
        )
      ]);
    } catch (e) {
      console.error('[Sync] Failed to acquire sync lock:', e);
      return;
    }

    // Set a timeout for the entire sync operation
    timeout = setTimeout(() => {
      console.error('[Sync] Sync operation timeout');
      if (release) {
        release();
        release = null;
      }
      isSyncing = false;
    }, 30000); // 30 seconds total timeout

    if (isSyncing) {
      // console.log('[Sync] Sync already in progress, skipping');
      return;
    }

    // console.log(`[Sync] Starting sync (${reason})`);
    isSyncing = true;
    dispatchSyncEvent('background');
    
    // Run sync operations in sequence
    await pullExpensesFromSupabase();
    await syncExpenses();
    await syncGamificationData();
    
    // console.log('[Sync] Sync completed successfully');
  } catch (error: any) {
    // console.error(`[Sync] Error during sync (${reason}):`, error.message);
  } finally {
    if (timeout) clearTimeout(timeout);
    if (release) {
      release();
    }
    isSyncing = false;
    dispatchSyncEvent(null);
  }
};

  window.addEventListener("online", () => performFullSync("App online"));
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === "SIGNED_IN" || (event === "INITIAL_SESSION" && session)) {
      if (navigator.onLine) performFullSync(`Auth: ${event}`);
      else console.log("[SyncSetup] User signed in but offline.");
    } else if (event === "SIGNED_OUT") {
      // console.log("[SyncSetup] User signed out. Clearing local data...");
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
    // console.log("[Badge Fix] No user or offline");
    return;
  }

  try {
    // console.log("[Badge Fix] Starting badge fix for user:", user.id);
    
    // Get local expenses for streak calculation
    const expenses = await getExpenses();
    const calculatedStreak = calculateStreak(expenses);
    // console.log("[Badge Fix] Calculated streak:", calculatedStreak);
    
    // Force add the 3-day streak badge if streak is >= 3
    if (calculatedStreak >= 3) {
      // console.log("[Badge Fix] Adding 3-day streak badge");
      const { error } = await supabase.from("user_badges").upsert({
        user_id: user.id,
        badge_id: "3-day-streak",
        earned_at: new Date().toISOString()
      }, { onConflict: 'user_id,badge_id' });
      
      if (error) {
        console.error("[Badge Fix] Error adding badge:", error);
      } else {
        // console.log("[Badge Fix] Badge added successfully!");
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
      // console.log("[Badge Fix] Streak updated successfully!");
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
    // console.log("[Gamification] Calculated badges:", badges);
    // console.log("[Gamification] Current streak:", calculatedStreak);
    
    // Force sync the 3-day streak badge if streak is >= 3
    if (calculatedStreak >= 3) {
      // console.log("[Gamification] Forcing sync of 3-day streak badge");
      await supabase.from("user_badges").upsert({
        user_id: user.id,
        badge_id: "3-day-streak",
        earned_at: new Date().toISOString()
      }, { onConflict: 'user_id,badge_id' });
    }
    
    // Sync other badges
    for (const badge of badges) {
      if (badge.earned) {
        await supabase.from("user_badges").upsert({
          user_id: user.id,
          badge_id: badge.id,
          earned_at: new Date().toISOString()
        }, { onConflict: 'user_id,badge_id' });
      }
    }
  } catch (error: any) {
    // console.error("[GAMIFICATION] Error syncing gamification data:", error.message);
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
