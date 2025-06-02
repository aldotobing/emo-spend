// Simple script to check date formats in Supabase
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Try to load .env.local if it exists
try {
  if (fs.existsSync('.env.local')) {
    require('dotenv').config({ path: '.env.local' });
  } else if (fs.existsSync('.env')) {
    require('dotenv').config({ path: '.env' });
  }
} catch (err) {
  console.log('No .env files found, using process.env');
}

// Get Supabase credentials from environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Simple test to see if we can access the environment
console.log('Supabase URL:', supabaseUrl ? '*** (exists)' : 'Not found');
console.log('Supabase Key:', supabaseKey ? '*** (exists)' : 'Not found');

if (!supabaseUrl || !supabaseKey) {
  console.error('\nError: Missing Supabase credentials');
  console.log('Please make sure your .env.local file contains:');
  console.log('NEXT_PUBLIC_SUPABASE_URL=your_supabase_url');
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key\n');
  process.exit(1);
}

// If we get here, we have credentials
console.log('\nCredentials found! Testing Supabase connection...\n');

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('Checking database structure...');
    
    // First, try to get table information
    const { data: tables, error: tablesError } = await supabase
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public');

    if (tablesError) {
      console.log('Could not list tables, but connection is working.');
      console.log('This is normal if your RLS policies are strict.');
      console.log('\nTrying to fetch table structure directly...');
      
      // Try to get table structure using raw SQL (if permissions allow)
      try {
        const { data: columns, error: columnsError } = await supabase
          .from('information_schema.columns')
          .select('table_name, column_name, data_type')
          .eq('table_schema', 'public')
          .in('table_name', ['expenses', 'incomes']);
          
        if (columnsError) throw columnsError;
        
        console.log('\nFound tables and columns:');
        const tables = {};
        columns.forEach(col => {
          if (!tables[col.table_name]) tables[col.table_name] = [];
          tables[col.table_name].push(`${col.column_name} (${col.data_type})`);
        });
        
        Object.entries(tables).forEach(([table, cols]) => {
          console.log(`\n${table}:`);
          cols.forEach(col => console.log(`- ${col}`));
        });
        
      } catch (sqlError) {
        console.log('\nCould not fetch table structure. This is expected with default RLS policies.');
      }
      
      console.log('\nConnection to Supabase successful!');
      console.log('To check date formats, please add a test expense through the app first.');
      return;
    }
    
    console.log('\nTables in database:');
    tables.forEach(table => console.log(`- ${table.tablename}`));
    
    // Try to get a count of rows in expenses
    const { count, error: countError } = await supabase
      .from('expenses')
      .select('*', { count: 'exact', head: true });
      
    if (countError) {
      console.log('\nCould not count rows in expenses table.');
      console.log('This is normal if your RLS policies are strict.');
    } else {
      console.log(`\nFound ${count} expenses in the database.`);
      
      if (count > 0) {
        // Try to get the most recent expense
        const { data: expense, error: expError } = await supabase
          .from('expenses')
          .select('id, date, created_at')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
          
        if (expError) throw expError;
        
        if (expense) {
          console.log('\nMost recent expense:');
          console.log('- ID:', expense.id);
          console.log('- Date:', expense.date, `(${new Date(expense.date).toISOString()})`);
          console.log('- Created At:', expense.created_at);
        }
      }
    }
    
  } catch (error) {
    console.error('\nError checking database:');
    console.error(error.message);
    
    if (error.code) console.error('Error code:', error.code);
    if (error.details) console.error('Details:', error.details);
    if (error.hint) console.error('Hint:', error.hint);
    
    console.log('\nPlease check your Supabase credentials and network connection.');
  }
}

testConnection();
