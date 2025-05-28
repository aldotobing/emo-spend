import { getSupabaseBrowserClient } from './supabase';
import { getDb } from './db';

export async function checkDatabaseState() {
  console.group('[Debug] Database State Check');
  
  // Check Supabase connection
  const supabase = getSupabaseBrowserClient();
  const { data: session } = await supabase.auth.getSession();
  console.log('[Debug] Supabase session:', session?.session ? 'Active' : 'Inactive');
  
  if (session?.session) {
    console.log('[Debug] User ID:', session.session.user.id);
    
    // Check sync status in IndexedDB
    const db = getDb();
    try {
      const syncStatus = await db.syncStatus.get('incomes');
      if (syncStatus) {
        console.log('[Debug] Last sync attempt:', syncStatus.lastAttempt);
        console.log('[Debug] Last successful sync:', syncStatus.lastSync || 'Never');
        console.log('[Debug] Sync error count:', syncStatus.errorCount || 0);
      } else {
        console.log('[Debug] No sync status found');
      }
    } catch (e) {
      console.log('[Debug] Error checking sync status:', e);
    }
    
    // Check incomes table in Supabase
    const { data: incomes, error } = await supabase
      .from('incomes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.session.user.id);
      
    if (error) {
      console.error('[Debug] Error fetching incomes from Supabase:', error);
    } else {
      console.log(`[Debug] Found ${incomes?.length || 0} incomes in Supabase`);
    }
  }
  
  // Check IndexedDB
  const db = getDb();
  const tableNames = await db.tables.map(t => t.name);
  console.log('[Debug] IndexedDB tables:', tableNames);
  
  if (tableNames.includes('incomes')) {
    const localIncomes = await db.incomes.toArray();
    console.log(`[Debug] Found ${localIncomes.length} incomes in IndexedDB`);
    
    if (localIncomes.length > 0) {
      console.log('[Debug] Sample income from IndexedDB:', {
        id: localIncomes[0].id,
        amount: localIncomes[0].amount,
        source: localIncomes[0].source,
        date: localIncomes[0].date,
        synced: localIncomes[0].synced,
        userId: localIncomes[0].user_id || (localIncomes[0] as any).userId
      });
    }
  }
  
  console.groupEnd();
  return { success: true };
}

// Add to window for easy access in browser console
declare global {
  interface Window {
    debugDb: () => Promise<void>;
    forceSync: () => Promise<void>;
  }
}

if (typeof window !== 'undefined') {
  window.debugDb = async () => {
    await checkDatabaseState();
  };
  
  window.forceSync = async () => {
    console.group('[Debug] Forcing sync');
    try {
      const { syncIncomes } = await import('@/lib/income');
      console.log('Starting forced sync...');
      const result = await syncIncomes();
      console.log('Sync result:', result);
      await checkDatabaseState();
    } catch (e) {
      console.error('Force sync failed:', e);
    }
    console.groupEnd();
  };
}
