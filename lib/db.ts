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
console.log(
  "--- [DB Module Interfaces] --- SyncedExpense, SyncStatusEntry defined."
);

export class EmoSpendDatabase extends Dexie {
  expenses!: Table<SyncedExpense, string>;
  syncStatus!: Table<SyncStatusEntry, string>;

  constructor() {
    super("emoSpendDb");
    console.log(
      "--- [DB Constructor Log] --- EmoSpendDatabase constructor: super('emoSpendDb') called."
    );
    try {
      this.version(5)
        .stores({
          expenses: "++id, amount, category, mood, date, createdAt, synced",
          syncStatus: "id, synced, lastAttempt",
        })
        .upgrade(async (tx) => {
          console.log(
            `--- [DB Constructor Log] --- Upgrading database to version ${tx.verno}...`
          );
          if (tx.verno < 5 && tx.table("expenses")) {
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
          console.log(
            `--- [DB Constructor Log] --- Database upgrade to version ${tx.verno} complete.`
          );
        });
      console.log(
        "--- [DB Constructor Log] --- EmoSpendDatabase constructor: versioning and stores configured."
      );
    } catch (e: any) {
      console.error(
        "--- [DB Constructor Log ERROR] --- Error during EmoSpendDatabase construction (version/stores):",
        e.message,
        e.stack
      );
      throw e;
    }
    console.log(
      "--- [DB Constructor Log] --- EmoSpendDatabase constructor finished."
    );
  }
}
console.log("--- [DB Module Class Def] --- EmoSpendDatabase class defined.");

let dbInstance: EmoSpendDatabase | null = null;
export function getDb(): EmoSpendDatabase {
  console.log("--- [DB getDb()] --- getDb function called.");
  if (!dbInstance) {
    console.log(
      "--- [DB getDb()] --- No dbInstance, creating new EmoSpendDatabase()."
    );
    try {
      dbInstance = new EmoSpendDatabase();
      console.log(
        "--- [DB getDb()] --- EmoSpendDatabase instance created and assigned to dbInstance."
      );
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
console.log("--- [DB Module Func Def] --- getDb function defined.");

async function getCurrentUser(): Promise<User | null> {
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
console.log("--- [DB Module Func Def] --- getCurrentUser function defined.");

export async function addExpense(
  expenseData: Omit<AppExpense, "id" | "createdAt">
): Promise<string | null> {
  console.log("[DB] addExpense called.");
  const db = getDb();
  const supabase = getSupabaseBrowserClient();
  const id = crypto.randomUUID();
  const createdAtDate = new Date();

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
    console.log(`[DB] Expense ${id} added locally.`);

    const user = await getCurrentUser();
    if (user && navigator.onLine) {
      console.log(`[DB] Attempting immediate sync for new expense ${id}...`);
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
        console.log(`[DB] New expense ${id} synced to Supabase immediately.`);
      }
    } else {
      console.warn(
        `[DB] Expense ${id} saved locally. Immediate sync skipped (User: ${!!user}, Online: ${
          navigator.onLine
        }).`
      );
    }
    return id;
  } catch (error: any) {
    console.error(`[DB] Error adding expense ${id}:`, error.message);
    try {
      await db.syncStatus.update(id, { lastAttempt: new Date().toISOString() });
    } catch (e) {
      console.error(
        `[DB] Failed to update syncStatus for ${id} after addExpense error.`,
        e
      );
    }
    return null;
  }
}
console.log(
  "--- [DB Module Func Def] --- addExpense function defined and exported."
);

export async function getExpenses(): Promise<SyncedExpense[]> {
  console.log("--- [DB getExpenses()] --- getExpenses function called.");
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
console.log(
  "--- [DB Module Func Def] --- getExpenses function defined and exported."
);

export async function getExpensesByDateRange(
  startDate: string,
  endDate: string
): Promise<SyncedExpense[]> {
  console.log("--- [DB getExpensesByDateRange()] --- Called with:", {
    startDate,
    endDate,
  });
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
console.log(
  "--- [DB Module Func Def] --- getExpensesByDateRange function defined and exported."
);

export async function getExpensesByMood(
  mood: MoodType | string
): Promise<SyncedExpense[]> {
  console.log("--- [DB getExpensesByMood()] --- Called with mood ID:", mood);
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
console.log(
  "--- [DB Module Func Def] --- getExpensesByMood function defined and exported."
);

export async function deleteExpense(id: string): Promise<boolean> {
  console.log(
    `--- [DB deleteExpense()] --- deleteExpense called for ID: ${id}`
  );
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
    console.log(`[DB] Expense ${id} deleted locally.`);

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
        console.log(`[DB] Expense ${id} deleted from Supabase.`);
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
console.log(
  "--- [DB Module Func Def] --- deleteExpense function defined and exported."
);

// This function is good for clearing local data on logout.
// We should ensure it only clears local data for the *current user* if multiple users might use the same browser,
// but clearing all local data for this specific app is generally fine for a single-user app.
export async function clearLocalUserData(): Promise<void> {
  console.log("--- [DB clearLocalUserData()] --- clearLocalUserData called.");
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
    console.log(
      "[DB] All local user-related data (expenses, syncStatus) cleared."
    );
  } catch (error: any) {
    console.error("[DB] Error clearing local user data:", error.message);
    // Important: Do not re-throw here. We want logout to proceed even if local clear fails.
  }
}
console.log(
  "--- [DB Module Func Def] --- clearLocalUserData function defined and exported."
);

// Renaming the old clearAllData to emphasize it's for ALL data and includes remote
// This might be used for a "reset app" function, not just logout.
export async function clearAllLocalAndRemoteData(): Promise<void> {
  console.log(
    "--- [DB clearAllLocalAndRemoteData()] --- clearAllLocalAndRemoteData called."
  );
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
    console.log("[DB] All local and potentially remote data cleared.");
  } catch (error: any) {
    console.error("[DB] Error clearing data:", error.message);
    throw error; // Re-throw if this is a "hard reset" function
  }
}
console.log(
  "--- [DB Module Func Def] --- clearAllLocalAndRemoteData function defined and exported."
);

export async function syncExpenses(): Promise<void> {
  console.log("[Sync] Attempting to sync local changes to Supabase...");
  const db = getDb();
  const supabase = getSupabaseBrowserClient();
  const user = await getCurrentUser();

  if (!user) {
    console.log("[Sync] Failed (to Supabase): User not logged in.");
    return;
  }
  if (!navigator.onLine) {
    console.log("[Sync] Failed (to Supabase): Offline.");
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
    console.log("[Sync] No local changes to sync.");
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
    console.log("[Sync] No actual expenses need syncing after filtering.");
    return;
  }
  console.log(
    `[Sync] Sending ${localExpensesToSync.length} expenses to Supabase.`
  );

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
console.log(
  "--- [DB Module Func Def] --- syncExpenses function defined and exported."
);

export async function pullExpensesFromSupabase(): Promise<void> {
  console.log("[Sync] Attempting to pull from Supabase...");
  const db = getDb();
  const supabase = getSupabaseBrowserClient();
  const user = await getCurrentUser();

  if (!user) {
    console.log("[Sync] Pull failed: No user.");
    return;
  }
  if (!navigator.onLine) {
    console.log("[Sync] Pull failed: Offline.");
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
    return;
  }
  if (!supabaseData || supabaseData.length === 0) {
    console.log("[Sync] No expenses to pull.");
    // If no data to pull, it's good to ensure local data is also empty for THIS user.
    // If you have a multi-user setup, this would need to be user-specific.
    // await db.expenses.clear(); // Only if you are SURE this user has no expenses.
    return;
  }
  console.log(`[Sync] Pulled ${supabaseData.length} expenses.`);

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
      console.log("[Sync] Local DB updated with pulled expenses.");
    } catch (error: any) {
      console.error("[Sync] Error storing pulled expenses:", error.message);
    }
  }
}
console.log(
  "--- [DB Module Func Def] --- pullExpensesFromSupabase function defined and exported."
);

export function setupSync(): void {
  console.log("--- [DB setupSync()] --- setupSync function called.");
  if (typeof window === "undefined") {
    console.log("[SyncSetup] Not in browser, skipping.");
    return;
  }
  const supabase = getSupabaseBrowserClient();
  let isSyncing = false;

  const performFullSync = async (reason: string) => {
    if (isSyncing) {
      console.log(`[SyncSetup] Sync in progress. Skipped: ${reason}`);
      return;
    }
    isSyncing = true;
    console.log(`[SyncSetup] Performing full sync: ${reason}`);
    try {
      await pullExpensesFromSupabase();
      await syncExpenses();
    } catch (error: any) {
      console.error(
        `[SyncSetup] Error during full sync (${reason}):`,
        error.message
      );
    } finally {
      isSyncing = false;
      console.log(`[SyncSetup] Full sync completed: ${reason}`);
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
  console.log("[SyncSetup] Sync listeners configured.");
}
