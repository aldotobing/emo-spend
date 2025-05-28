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
  }
}

if (typeof window !== 'undefined') {
  window.debugDb = async () => {
    await checkDatabaseState();
  };
}
