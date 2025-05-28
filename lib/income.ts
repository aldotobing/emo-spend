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
  console.group(`[getIncomesByDateRange] Starting for range: ${startDate} to ${endDate}`);
  const db = getDb();
  
  try {
    // Check if the incomes table exists and is accessible
    const tableNames = await db.tables.map(t => t.name);
    if (!tableNames.includes('incomes')) {
      console.warn('Incomes table does not exist in the database yet');
      console.groupEnd();
      return [];
    }
    
    // Get current user to filter by user_id
    const user = await getCurrentUser();
    if (!user) {
      console.warn('[getIncomesByDateRange] No authenticated user');
      console.groupEnd();
      return [];
    }
    
    console.log(`[getIncomesByDateRange] User ID: ${user.id}`);
    
    // Debug: Log all tables and their schemas
    console.log('[getIncomesByDateRange] Database tables:', tableNames);
    
    // Get all incomes from IndexedDB
    const allIncomes = await db.incomes.toArray();
    console.log(`[getIncomesByDateRange] Found ${allIncomes.length} total incomes in IndexedDB`);
    
    if (allIncomes.length > 0) {
      console.log('[getIncomesByDateRange] Sample income from IndexedDB:', {
        id: allIncomes[0].id,
        user_id: allIncomes[0].user_id,
        amount: allIncomes[0].amount,
        source: allIncomes[0].source,
        date: allIncomes[0].date,
        hasDescription: !!allIncomes[0].description,
        createdAt: allIncomes[0].createdAt,
        updatedAt: allIncomes[0].updatedAt,
        synced: allIncomes[0].synced,
        raw: allIncomes[0]
      });
    }
    
    // Filter by user ID
    const userIncomes = allIncomes.filter(income => {
      const incomeUserId = income.user_id || (income as any).userId;
      const matchesUser = incomeUserId === user.id;
      if (!matchesUser) {
        console.log(`[getIncomesByDateRange] Filtering out income with user ID: ${incomeUserId} (expected: ${user.id})`);
      }
      return matchesUser;
    });
    
    console.log(`[getIncomesByDateRange] Found ${userIncomes.length} incomes for current user`);
    
    // Parse the input dates once
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Set time to beginning and end of day for proper date comparison
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    
    console.log(`[getIncomesByDateRange] Filtering for date range: ${start.toISOString()} to ${end.toISOString()}`);
    
    // Filter incomes by date range
    const filteredIncomes = userIncomes.filter(income => {
      try {
        // Use the date field if available, otherwise fall back to createdAt
        // Handle both camelCase and snake_case field names with type assertion
        const dateStr = income.date || income.createdAt || (income as any).created_at;
        if (!dateStr) {
          console.warn(`[Income] Income ${income.id} is missing date information`, income);
          return false;
        }
        
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          console.warn(`[Income] Invalid date format for income ${income.id}:`, dateStr);
          return false;
        }
        
        const isInRange = date >= start && date <= end;
        
        if (isInRange) {
          console.log(`[Income] Including income - ID: ${income.id}, Date: ${date.toISOString()}, Amount: ${income.amount}, Source: ${income.source}, UserID: ${income.user_id || (income as any).userId}`);
        } else {
          console.log(`[Income] Excluding income (out of range) - ID: ${income.id}, Date: ${date.toISOString()}, Amount: ${income.amount}`);
        }
        
        return isInRange;
      } catch (error) {
        console.error(`[Income] Error processing income ${income.id}:`, error, income);
        return false;
      }
    });
    
    console.log(`[getIncomesByDateRange] Found ${filteredIncomes.length} incomes in date range`);
    console.groupEnd();
    
    // Map database fields to TypeScript types with proper type safety
    return filteredIncomes.map(income => {
      try {
        // Handle both snake_case and camelCase field names
        const dateValue = income.date || (income as any).date_created;
        const createdAt = income.createdAt || (income as any).created_at || new Date().toISOString();
        const updatedAt = income.updatedAt || (income as any).updated_at || new Date().toISOString();
        const userId = (income as any).user_id || (income as any).userId || '';
        
        // Format the date properly
        let formattedDate: string;
        if (dateValue) {
          const date = new Date(dateValue);
          formattedDate = isNaN(date.getTime()) ? new Date().toISOString().split('T')[0] : date.toISOString().split('T')[0];
        } else {
          formattedDate = new Date(createdAt).toISOString().split('T')[0];
          console.warn('Income missing date field, using created date as fallback:', {
            incomeId: income.id,
            date: formattedDate,
            createdAt: createdAt
          });
        }
        
        // Create the income object with all required fields
        const mappedIncome: Income = {
          id: income.id,
          user_id: userId,
          amount: income.amount,
          source: income.source || 'Other',
          description: income.description || undefined,
          date: formattedDate,
          createdAt: createdAt,
          updatedAt: updatedAt,
          synced: income.synced !== false,
        };
        
        return mappedIncome;
      } catch (error) {
        console.error('Error mapping income:', error, income);
        // Return a minimal valid income object to prevent crashes
        return {
          id: income.id || `error-${Math.random().toString(36).substr(2, 9)}`,
          user_id: '',
          amount: 0,
          source: 'Error',
          description: 'Error processing income',
          date: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          synced: false
        };
      }
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

export interface SyncResult {
  synced: number;
  skipped?: number;
  errors: number;
  success?: boolean;
  message?: string;
  error?: string;
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

export async function pullIncomesFromSupabase(): Promise<SyncResult> {
  console.group('[pullIncomesFromSupabase] Starting income sync from Supabase');
  const db = getDb();
  const supabase = getSupabaseBrowserClient();
  const user = await getCurrentUser();
  
  if (!user) {
    console.error('[Pull] User not authenticated');
    console.groupEnd();
    return { synced: 0, skipped: 0, errors: 1 };
  }

  try {
    // Debug: Verify Supabase URL and key
    console.log('[Pull] Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('[Pull] Supabase anon key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Present' : 'Missing');
    
    // Check if we can access the incomes table with a simple query
    const { error: tableError } = await supabase
      .from('incomes')
      .select('*')
      .limit(1);
      
    if (tableError) {
      console.error('[Pull] Error accessing incomes table:', tableError);
      // Continue execution even if there's an error, as it might be an empty table
    }
    console.log(`[Pull] Starting to pull incomes for user ${user.id}`);
    
    // Get all local incomes for the current user
    console.log('[Pull] Fetching local incomes...');
    const allLocalIncomes = await db.incomes.toArray().catch(error => {
      console.error('[Pull] Error fetching local incomes:', error);
      throw new Error('Failed to fetch local incomes');
    });
    
    console.log(`[Pull] Found ${allLocalIncomes.length} total local incomes`);
    
    // Filter incomes for the current user
    const localIncomes = allLocalIncomes.filter(income => {
      const incomeUserId = income.user_id || (income as any).userId;
      const matchesUser = incomeUserId === user.id;
      if (!matchesUser) {
        console.log(`[Pull] Filtering out local income with user ID: ${incomeUserId} (expected: ${user.id})`);
      }
      return matchesUser;
    });
    
    console.log(`[Pull] Found ${localIncomes.length} local incomes for current user`);
    
    const localMap = new Map<string, SyncedIncome>();
    localIncomes.forEach(income => {
      if (income?.id) {
        const cleanIncome: SyncedIncome = {
          ...income,
          user_id: income.user_id || (income as any).userId || user.id,
          userId: (income as any).userId || income.user_id || user.id,
          date: income.date || new Date().toISOString().split('T')[0],
          createdAt: income.createdAt || new Date().toISOString(),
          updatedAt: income.updatedAt || new Date().toISOString(),
          synced: income.synced ?? true
        };
        console.log(`[Pull] Local income: ID=${income.id}, UserID=${cleanIncome.user_id}, Amount=${income.amount}, Synced=${cleanIncome.synced}`);
        localMap.set(income.id, cleanIncome);
      }
    });
    
    console.log('[Pull] Fetching remote incomes from Supabase...');
    
    // Debug: Check Supabase client and auth state
    console.log('[Pull] Supabase client:', supabase ? 'Initialized' : 'Not initialized');
    const session = await supabase.auth.getSession();
    console.log('[Pull] Supabase session:', session.data?.session ? 'Exists' : 'No session');
    
    if (!session.data?.session) {
      console.error('[Pull] No active Supabase session');
      console.groupEnd();
      return { synced: 0, skipped: 0, errors: 1 };
    }
    
    // Debug: Test a direct query to Supabase
    console.log('[Pull] Testing Supabase connection with a simple query...');
    const testQuery = await supabase
      .from('incomes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);
    
    console.log('[Pull] Supabase test query result:', {
      count: testQuery.count,
      error: testQuery.error,
      status: testQuery.status,
      statusText: testQuery.statusText
    });
    
    if (testQuery.error) {
      console.error('[Pull] Error testing Supabase connection:', testQuery.error);
      console.groupEnd();
      return { synced: 0, skipped: 0, errors: 1 };
    }
    
    // Fetch remote incomes with error handling and timeout
    const { data: supabaseData, error: supabaseError } = await supabase
      .from('incomes')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1000);

    if (supabaseError) {
      console.error('[Pull] Error fetching from Supabase:', supabaseError);
      throw new Error(`Supabase error: ${supabaseError.message}`);
    }

    if (!Array.isArray(supabaseData) || supabaseData.length === 0) {
      console.log('[Pull] No remote incomes found for user');
      console.groupEnd();
      return { synced: 0, skipped: 0, errors: 0 };
    }
    
    console.log(`[Pull] Found ${supabaseData.length} remote incomes to process`);
    
    // Log details about remote incomes
    supabaseData.slice(0, 3).forEach((inc, index) => {
      console.log(`[Pull] Remote income ${index + 1}:`, {
        id: inc.id,
        user_id: inc.user_id,
        amount: inc.amount,
        source: inc.source,
        date: inc.date,
        updated_at: inc.updated_at,
        created_at: inc.created_at
      });
    });
    
    if (supabaseData.length > 3) {
      console.log(`[Pull] ...and ${supabaseData.length - 3} more remote incomes`);
    }
    
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
    
    return { synced, skipped, errors: 0 };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Pull] Fatal error in pullIncomesFromSupabase:', error);
    throw new Error(`Failed to sync incomes: ${errorMessage}`);
  }
}

export async function syncIncomes(): Promise<{ synced: number; errors: number }> {
  console.group('[Sync] Starting income sync');
  const db = getDb();
  const supabase = getSupabaseBrowserClient();
  const user = await getCurrentUser();
  
  if (!user) {
    console.error('[Sync] No user - skipping sync');
    console.groupEnd();
    return { synced: 0, errors: 1 };
  }
  
  // Add retry counter
  let retryCount = 0;
  const maxRetries = 3;
  
  while (retryCount < maxRetries) {
    try {
      console.log(`[Sync] Attempt ${retryCount + 1} of ${maxRetries}`);
      
      // Check session validity
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }
      
      // Rest of sync logic...
      const pullResult = await pullIncomesFromSupabase();
      
      if (pullResult.synced > 0 || retryCount === maxRetries - 1) {
        // Only return if we got data or this is the last attempt
        console.groupEnd();
        return pullResult;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
      retryCount++;
    } catch (error) {
      console.error(`[Sync] Attempt ${retryCount + 1} failed:`, error);
      if (retryCount === maxRetries - 1) {
        console.groupEnd();
        return { synced: 0, errors: 1 };
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
      retryCount++;
    }
  }
  
  console.groupEnd();
  return { synced: 0, errors: 1 };
}