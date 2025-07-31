#!/usr/bin/env node

/**
 * Simple script to run a migration against Supabase
 * Usage: node scripts/run-migration.mjs <migration-file>
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('Usage: node scripts/run-migration.mjs <migration-file>');
  process.exit(1);
}

try {
  // Read migration file
  const sql = readFileSync(migrationFile, 'utf8');
  console.log(`Running migration: ${migrationFile}`);

  // Create Supabase client with service role key
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Execute the SQL
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }

  console.log('Migration completed successfully');
  if (data) {
    console.log('Result:', data);
  }
} catch (error) {
  console.error('Error running migration:', error);
  process.exit(1);
}