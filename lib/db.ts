// /lib/db.ts
console.log(
  "--- [DB Module Top Level] --- File /lib/db.ts is being evaluated by Next.js (server/build or client import)..."
);

import Dexie, { type Table } from "dexie";
import type { Expense as AppExpense, MoodType } from "@/types/expense"; // Pastikan tipe MoodType diimpor jika digunakan
import { getSupabaseBrowserClient } from "./supabase";
import { User } from "@supabase/supabase-js";

console.log(
  "--- [DB Module Imports] --- Dexie, types, supabaseClient, User imported."
);

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
          // Sesuaikan versi jika perlu
          expenses: "++id, amount, category, mood, date, createdAt, synced", // 'category' & 'mood' di sini adalah ID dari AppExpense
          syncStatus: "id, synced, lastAttempt",
        })
        .upgrade(async (tx) => {
          console.log(
            `--- [DB Constructor Log] --- Upgrading database to version ${tx.verno}...`
          );
          // Contoh migrasi, sesuaikan jika perlu atau hapus jika tidak relevan untuk versi ini
          if (tx.verno < 5 && tx.table("expenses")) {
            // Pastikan tabel ada sebelum modifikasi
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
    } // Kurangi verbosity
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
    ...expenseData, // Ini berisi 'category' (ID) dan 'mood' (ID) dari form
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
        category_id: category, // Mapping: lokal 'category' (ID) ke Supabase 'category_id'
        mood_id: mood, // Mapping: lokal 'mood' (ID) ke Supabase 'mood_id'
        mood_reason: moodReason,
        created_at: createdAt, // ISO string
        user_id: user.id,
      };
      const { error: supabaseError } = await supabase
        .from("expenses")
        .upsert(expenseToSync); // Sesuaikan "expenses" jika nama tabel Anda berbeda
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
  // Izinkan string jika mood adalah ID
  console.log("--- [DB getExpensesByMood()] --- Called with mood ID:", mood);
  const db = getDb();
  try {
    // Asumsi 'mood' di tabel Dexie 'expenses' adalah ID mood (string)
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
        .eq("user_id", user.id); // Sesuaikan "expenses"
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

export async function clearAllData(): Promise<void> {
  console.log("--- [DB clearAllData()] --- clearAllData called.");
  const db = getDb();
  const supabase = getSupabaseBrowserClient();
  try {
    const user = await getCurrentUser();
    if (user && navigator.onLine) {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("user_id", user.id); // Sesuaikan "expenses"
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
    console.log("[DB] All local data cleared.");
  } catch (error: any) {
    console.error("[DB] Error clearing data:", error.message);
  }
}
console.log(
  "--- [DB Module Func Def] --- clearAllData function defined and exported."
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
    .upsert(supabasePayload, { onConflict: "id" }); // Sesuaikan "expenses"

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

  const { data: supabaseData, error: supabaseError } = await supabase
    .from("expenses") // Sesuaikan "expenses"
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
      category: remoteExpense.category_id, // Mapping
      mood: remoteExpense.mood_id as MoodType, // Mapping
      moodReason: remoteExpense.mood_reason,
      date: remoteExpense.date,
      notes: remoteExpense.notes,
      createdAt: remoteExpense.created_at, // Mapping
      synced: true,
    });
  }

  if (expensesToStore.length > 0) {
    try {
      await db.transaction("rw", db.expenses, db.syncStatus, async () => {
        await db.expenses.bulkPut(expensesToStore);
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
    } else if (event === "SIGNED_OUT")
      console.log("[SyncSetup] User signed out.");
  });
  console.log("[SyncSetup] Sync listeners configured.");
}
console.log(
  "--- [DB Module Func Def] --- setupSync function defined and exported."
);

// Log paling akhir untuk memastikan seluruh modul dievaluasi
console.log("--- [DB Module Last Line Log] ---");
console.log(
  "[DB Module] File: /lib/db.ts. Successfully evaluated by Next.js (expected)."
);
console.log(
  "[DB Module] typeof getExpenses (at end of file):",
  typeof getExpenses
);
console.log(
  "[DB Module] typeof getExpensesByDateRange (at end of file):",
  typeof getExpensesByDateRange
);
console.log(
  "[DB Module] typeof getExpensesByMood (at end of file):",
  typeof getExpensesByMood
);
console.log(
  "[DB Module] typeof addExpense (at end of file):",
  typeof addExpense
);
console.log(
  "[DB Module] typeof deleteExpense (at end of file):",
  typeof deleteExpense
);
console.log(
  "[DB Module] typeof clearAllData (at end of file):",
  typeof clearAllData
);
console.log(
  "[DB Module] typeof syncExpenses (at end of file):",
  typeof syncExpenses
);
console.log(
  "[DB Module] typeof pullExpensesFromSupabase (at end of file):",
  typeof pullExpensesFromSupabase
);
console.log("[DB Module] typeof setupSync (at end of file):", typeof setupSync);
console.log("--- [DB Module End Log] ---");
