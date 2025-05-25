import { getDb } from './db';
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
    const incomes = await db.incomes
      .where('date')
      .between(startDate, endDate, true, true)
      .toArray();
    
    // Map database fields to TypeScript types
    return incomes.map(income => ({
      ...income,
      // Map snake_case to camelCase for TypeScript
      createdAt: income.createdAt || (income as any).created_at,
      updatedAt: income.updatedAt || (income as any).updated_at,
      // Ensure all required fields are present
      synced: income.synced ?? true,
    }));
  } catch (error) {
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

export async function syncIncomes(): Promise<{ synced: number; errors: number }> {
  const db = getDb();
  const supabase = getSupabaseBrowserClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('User not authenticated');
    return { synced: 0, errors: 0 };
  }

  try {
    // Get all unsynced incomes
    const unsyncedIncomes = await db.incomes
      .filter(income => !income.synced)
      .toArray();

    let syncedCount = 0;
    let errorCount = 0;

    // Sync each unsynced income
    for (const income of unsyncedIncomes) {
      try {
        // Create a new object without the 'synced' field for Supabase
        const { synced, ...incomeForSupabase } = income;
        
        const { error } = await supabase
          .from('incomes')
          .upsert({
            ...incomeForSupabase,
            // Map to snake_case for database
            created_at: incomeForSupabase.createdAt || (incomeForSupabase as any).created_at,
            updated_at: incomeForSupabase.updatedAt || (incomeForSupabase as any).updated_at,
            description: incomeForSupabase.description || null,
            // Remove any undefined values
          } as Record<string, any>)
          .select();

        if (error) throw error;

        // Mark as synced in local DB
        await db.incomes.update(income.id, { 
          synced: true,
          // Ensure we have the latest timestamps
          updatedAt: new Date().toISOString()
        });
        syncedCount++;
      } catch (error) {
        console.error(`Error syncing income ${income.id}:`, {
          error: error instanceof Error ? error.message : error,
          incomeData: income,
          timestamp: new Date().toISOString()
        });
        errorCount++;
      }
    }

    return { synced: syncedCount, errors: errorCount };
  } catch (error) {
    console.error('Error in syncIncomes:', error);
    return { synced: 0, errors: 0 };
  }
}