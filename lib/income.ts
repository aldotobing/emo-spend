import { getDb, getCurrentUser } from './db';
import { getSupabaseBrowserClient } from './supabase';
import { Income, Transaction } from '@/types/expense';
import { SyncedIncome } from './db';

// Extend the Transaction type to include database fields
interface DatabaseTransaction extends Omit<Transaction, 'createdAt' | 'updatedAt'> {
  created_at: string;
  updated_at: string;
  [key: string]: any; // For other potential fields
}

// Helper type to ensure synced is always a boolean
type IncomeWithSync = Omit<Income, 'synced'> & { synced: boolean };

export async function addIncome(income: Omit<Income, 'id' | 'createdAt' | 'updatedAt' | 'synced'>): Promise<string | null> {
  const db = getDb();
  const supabase = getSupabaseBrowserClient();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  // Dispatch sync start event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('sync:start', { 
      detail: { operation: 'push' } 
    }));
  }
  
  // Create a properly typed income object with synced field
  const newIncome = {
    ...income,
    id,
    created_at: now,
    updated_at: now,
    synced: false
  } as const;

  try {
    // Add to local IndexedDB with camelCase fields
    await db.incomes.add({
      ...newIncome,
      // Map back to camelCase for local storage
      createdAt: newIncome.created_at,
      updatedAt: newIncome.updated_at,
    } as SyncedIncome);
    
    // Sync with Supabase if online
    const { data: { user } } = await supabase.auth.getUser();
    if (user && navigator.onLine) {
      // Create a new object without the 'synced' field for Supabase
      const { synced, ...incomeForSupabase } = newIncome;
      
      const { error } = await supabase
        .from('incomes')
        .insert({
          ...incomeForSupabase,
          // Ensure we're not sending any undefined values
          description: incomeForSupabase.description || null,
        });
      
      if (error) throw error;
      
      // Update local record to mark as synced
      await db.incomes.update(id, { synced: true });
    }
    
    // Dispatch sync end event on success
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sync:end'));
    }
    return id;
  } catch (error) {
    // Dispatch sync end event on error
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sync:end'));
    }
    console.error('Error adding income:', error);
    return null;
  }
}

export async function getIncomesByDateRange(startDate: string, endDate: string): Promise<Income[]> {
  const db = getDb();
  try {
    // Check if the incomes table exists and is accessible
    const tableNames = await db.tables.map(t => t.name);
    if (!tableNames.includes('incomes')) {
      console.warn('Incomes table does not exist in the database yet');
      return [];
    }    
    // First, try to get all incomes and filter in memory to debug
    const allIncomes = await db.incomes.toArray();
    
    
    // Parse the input dates once
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Set time to beginning and end of day for proper date comparison
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    
    
    // Filter incomes by date range
    const filteredIncomes = allIncomes.filter(income => {
      // Use the date field if available, otherwise fall back to createdAt
      const dateStr = income.date || income.createdAt;
      if (!dateStr) {
        console.warn(`[Income] Income ${income.id} is missing both date and createdAt`);
        return false;
      }
      
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        console.warn(`[Income] Invalid date format for income ${income.id}:`, dateStr);
        return false;
      }
      
      const isInRange = date >= start && date <= end;
      if (isInRange) {
      }
      
      return isInRange;
    });
    
    
    // Map database fields to TypeScript types with proper type safety
    return filteredIncomes.map(income => {
      // Handle both snake_case and camelCase field names
      const dateValue = income.date || (income as any).date_created;
      const createdAt = income.createdAt || (income as any).created_at || new Date().toISOString();
      const updatedAt = income.updatedAt || (income as any).updated_at || new Date().toISOString();
      const userId = (income as any).user_id || (income as any).userId; // Handle both formats
      
      // Create a properly typed income object
      const mapped: Income = {
        id: income.id,
        user_id: userId || '', // Ensure we have a string value
        amount: income.amount,
        source: income.source,
        description: income.description || undefined, // Use undefined instead of null for optional fields
        date: dateValue || createdAt.split('T')[0], // Fallback to createdAt date if date is missing
        createdAt,
        updatedAt,
        synced: income.synced ?? true,
      };
      
      // Log a warning if we had to use a fallback for the date
      if (!dateValue) {
        console.warn('Income missing date field, using created date as fallback:', {
          incomeId: income.id,
          date: mapped.date,
          createdAt: mapped.createdAt
        });
      }
      
      return mapped;
    });
  } catch (error: unknown) {
    const err = error as Error;
    if (err.name === 'NotFoundError' || err.message?.includes('object store was not found')) {
      console.warn('Incomes table not found in database. This is normal if no incomes have been added yet.');
      return [];
    }
    console.error('Error getting incomes by date range:', error);
    return [];
  }
}

export async function deleteIncome(incomeId: string): Promise<boolean> {
  const db = getDb();
  const supabase = getSupabaseBrowserClient();
  
  try {
    // First, get the income to store in sync queue if needed
    const income = await db.incomes.get(incomeId);
    
    // Delete from local IndexedDB
    await db.incomes.delete(incomeId);
    
    // Try to delete from Supabase if online
    try {
      const { error } = await supabase
        .from('incomes')
        .delete()
        .eq('id', incomeId);
      
      if (error) throw error;
      
    } catch (error) {
      console.error('Error syncing delete with Supabase, adding to sync queue:', error);
      // Add to sync queue if there was an error or offline
      if (income) {
        await db.syncQueue.add({
          table_name: 'incomes',
          record_id: incomeId,
          action: 'delete',
          data: income,
          created_at: new Date().toISOString()
        });
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting income:', error);
    return false;
  }
}

export async function getTransactionsByDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
  const supabase = getSupabaseBrowserClient();
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) throw error;
    
    // Map database fields to TypeScript types
    return (data || []).map((transaction: DatabaseTransaction) => ({
      ...transaction,
      // Map database fields to TypeScript fields
      createdAt: transaction.created_at,
      updatedAt: transaction.updated_at,
      // Ensure required fields have proper types
      type: transaction.type as 'expense' | 'income',
      amount: Number(transaction.amount),
      date: transaction.date,
      user_id: transaction.user_id,
      id: transaction.id,
      description: transaction.description || null,
      // Handle category/source based on transaction type
      ...(transaction.type === 'expense' ? {
        category: transaction.category as string | number,
        mood: transaction.mood,
        notes: transaction.notes
      } : {
        source: transaction.source as string
      })
    }));
  } catch (error) {
    console.error('Error getting transactions:', error);
    return [];
  }
}

interface SyncResult {
  synced: number;
  skipped: number;
}

interface RemoteIncome {
  id: string;
  user_id: string;
  amount: number;
  source?: string;
  date: string;
  notes?: string;
  category?: string;
  updated_at?: string;
  created_at?: string;
}

export const pullIncomesFromSupabase = async (): Promise<SyncResult> => {
  const db = getDb();
  const supabase = getSupabaseBrowserClient();
  
  try {
    // Get current session and user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('[Pull] Error getting session:', sessionError);
      throw sessionError;
    }
    
    const user = session?.user;
    if (!user) {
      return { synced: 0, skipped: 0 };
    }

    // Check network status
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { synced: 0, skipped: 0 };
    }
    
    // Get local incomes for comparison
    const localIncomes = await db.incomes.toArray().catch(error => {
      console.error('[Pull] Error fetching local incomes:', error);
      throw new Error('Failed to fetch local incomes');
    });
    
    const localMap = new Map<string, SyncedIncome>();
    localIncomes.forEach(income => {
      if (income?.id) {
        localMap.set(income.id, income);
      }
    });
    
    
    // Fetch remote incomes with error handling and timeout
    const { data: supabaseData, error: supabaseError } = await supabase
      .from('incomes')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1000); // Add a reasonable limit

    if (supabaseError) {
      console.error('[Pull] Error fetching from Supabase:', supabaseError);
      throw new Error(`Supabase error: ${supabaseError.message}`);
    }

    if (!Array.isArray(supabaseData) || supabaseData.length === 0) {
      return { synced: 0, skipped: 0 };
    }
    
    
    // Log sample records for debugging
    const sampleSize = Math.min(3, supabaseData.length);
    supabaseData.slice(0, sampleSize).forEach((record, i) => {
    });
    
    // Define result types for better type safety
    type SyncResultItem = 
      | { success: true; id: string }
      | { success: false; id: string; reason: string; error?: never }
      | { success: false; id: string; error: string; reason?: never };

    // Process each remote record with proper typing
    const results = await Promise.allSettled<SyncResultItem>(
      supabaseData.map(
        async (remote: RemoteIncome): Promise<SyncResultItem> => {
          try {
            // Validate required fields
            if (!remote.id || !remote.user_id || !remote.amount || !remote.date) {
              console.warn('[Pull] Skipping invalid income record:', remote);
              return { success: false, id: remote.id || 'unknown', reason: 'Missing required fields' };
            }
            
            const local = localMap.get(remote.id);
            const remoteUpdatedAt = remote.updated_at ? new Date(remote.updated_at).getTime() : 0;
            const localUpdatedAt = local?.updatedAt ? new Date(local.updatedAt).getTime() : 0;

            // Skip if local version is up-to-date
            if (local && remoteUpdatedAt <= localUpdatedAt) {
              return { success: false, id: remote.id, reason: 'Local version is up to date' };
            }

            // Prepare data for storage
            const incomeData: Omit<Income, 'id'> = {
              amount: Number(remote.amount) || 0,
              source: remote.source?.toString() || 'Other',
              date: remote.date,
              description: remote.notes?.toString() || '',
              synced: true,
              updatedAt: remote.updated_at || new Date().toISOString(),
              user_id: remote.user_id,
              createdAt: remote.created_at || new Date().toISOString()
            };

            // Save to local database
            await db.incomes.put({
              ...incomeData,
              id: remote.id,
              synced: true
            });

            return { success: true, id: remote.id };
          } catch (error) {
            console.error(`[Pull] Error processing income ${remote.id}:`, error);
            return { 
              success: false, 
              id: remote.id || 'unknown', 
              error: error instanceof Error ? error.message : 'Unknown error' 
            };
          }
        }
      )
    );

    // Process results with proper type guards
    const fulfilledResults = results.filter(
      (r): r is PromiseFulfilledResult<SyncResultItem> => r.status === 'fulfilled'
    );
    
    // Type guard to check if a result has a reason
    const hasReason = (result: SyncResultItem): result is { success: false; id: string; reason: string } => 
      !result.success && 'reason' in result && !!result.reason;
      
    // Type guard to check if a result has an error
    const hasError = (result: SyncResultItem): result is { success: false; id: string; error: string } => 
      !result.success && 'error' in result && !!result.error;
    
    const synced = fulfilledResults.filter(r => r.value.success).length;
    const skipped = results.length - synced;
    
    // Log detailed results if there were any skipped records
    if (skipped > 0) {
      const skippedReasons = fulfilledResults
        .map(r => r.value)
        .filter(hasReason)
        .reduce((acc, { reason }) => {
          acc[reason] = (acc[reason] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
      
      
      if (Object.keys(skippedReasons).length > 0) {
      }
      
      // Log any errors that occurred during processing
      const errors = fulfilledResults
        .map(r => r.value)
        .filter(hasError)
        .map(({ id, error }) => ({ id, error }));
        
      if (errors.length > 0) {
        console.warn(`[Pull] Encountered ${errors.length} errors during sync:`, errors);
      }
    } else {
    }
    
    return { synced, skipped };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Pull] Fatal error in pullIncomesFromSupabase:', error);
    throw new Error(`Failed to sync incomes: ${errorMessage}`);
  }
}

export async function syncIncomes(): Promise<{ synced: number; errors: number }> {
  const db = getDb();
  const supabase = getSupabaseBrowserClient();
  const user = await getCurrentUser();
  
  if (!user) {
    console.error('[Sync] User not authenticated');
    return { synced: 0, errors: 0 };
  }

  if (!navigator.onLine) {
    return { synced: 0, errors: 0 };
  }

  try {
    // First, pull any remote changes
    const pullResult = await pullIncomesFromSupabase();
    
    // Then push local changes
    const unsyncedIncomes = await db.incomes
      .filter(income => !income.synced)
      .toArray();

    let syncedCount = pullResult.synced; // Start with count from pull
    let errorCount = pullResult.skipped;

    // Sync each unsynced income
    for (const income of unsyncedIncomes) {
      try {
        if (!income.id) {
          console.warn('[Sync] Skipping income with missing ID:', income);
          errorCount++;
          continue;
        }

        // Prepare the data for Supabase - map to snake_case for the database
        const incomeData = {
          id: income.id,
          user_id: income.user_id || (income as any).userId || user.id,
          amount: income.amount,
          source: income.source,
          description: income.description || null,
          date: income.date,
          created_at: income.createdAt || (income as any).created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        // Try to update existing record first, insert if not exists
        const { error } = await supabase
          .from('incomes')
          .upsert(incomeData, { onConflict: 'id' });

        if (error) {
          throw error;
        }

        // Mark as synced in local DB
        await db.incomes.update(income.id, { 
          synced: true,
          updatedAt: new Date().toISOString()
        });
        
        syncedCount++;
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[Sync] Error syncing income ${income?.id || 'unknown'}:`, {
          error: errorMessage,
          incomeId: income?.id,
          timestamp: new Date().toISOString()
        });
        errorCount++;
      }
    }

    return { synced: syncedCount, errors: errorCount };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Sync] Error in syncIncomes:', errorMessage);
    return { synced: 0, errors: 1 };
  }
}