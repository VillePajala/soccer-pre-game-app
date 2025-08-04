#!/usr/bin/env node

/**
 * Inject environment variables into service worker at build time
 * This replaces hardcoded API keys with environment variables for security
 */

import fs from 'fs';
import path from 'path';

const SERVICE_WORKER_PATH = './public/sw-enhanced.js';
const BACKUP_PATH = './public/sw-enhanced.backup.js';

function injectEnvironmentVariables() {
  try {
    // Read environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('⚠️  Supabase environment variables not found. Service worker will use placeholders.');
      console.warn('   Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY for full functionality.');
      return;
    }

    // Create backup of original service worker
    if (fs.existsSync(SERVICE_WORKER_PATH)) {
      fs.copyFileSync(SERVICE_WORKER_PATH, BACKUP_PATH);
      console.log('📋 Created backup of service worker');
    }

    // Read service worker content
    let swContent = fs.readFileSync(SERVICE_WORKER_PATH, 'utf8');

    // Replace template placeholders with environment variables
    swContent = swContent.replace(/\{\{NEXT_PUBLIC_SUPABASE_URL\}\}/g, supabaseUrl);
    swContent = swContent.replace(/\{\{NEXT_PUBLIC_SUPABASE_ANON_KEY\}\}/g, supabaseAnonKey);

    // Write updated service worker
    fs.writeFileSync(SERVICE_WORKER_PATH, swContent);

    console.log('✅ Successfully injected environment variables into service worker');
    console.log(`   Supabase URL: ${supabaseUrl.substring(0, 30)}...`);
    console.log(`   API Key: ${supabaseAnonKey.substring(0, 20)}...`);

  } catch (error) {
    console.error('❌ Failed to inject environment variables:', error.message);
    
    // Restore backup if it exists
    if (fs.existsSync(BACKUP_PATH)) {
      fs.copyFileSync(BACKUP_PATH, SERVICE_WORKER_PATH);
      console.log('🔄 Restored service worker from backup');
    }
    
    process.exit(1);
  }
}

// Clean up backup file
function cleanup() {
  if (fs.existsSync(BACKUP_PATH)) {
    fs.unlinkSync(BACKUP_PATH);
    console.log('🧹 Cleaned up backup file');
  }
}

// Run the injection
console.log('🔧 Injecting environment variables into service worker...');
injectEnvironmentVariables();

// Clean up on successful completion
process.on('exit', cleanup);
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);