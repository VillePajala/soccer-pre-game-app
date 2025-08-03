#!/usr/bin/env node

/**
 * Remove debug pages that could expose sensitive information in production
 * This script identifies and removes directories that contain debug/test routes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APP_DIR = path.join(__dirname, '..', 'src', 'app');

// Patterns for debug/test directories to remove
const DEBUG_PATTERNS = [
  /^debug/,
  /^test-/,
  /^check-/,
  /^analyze-/,
  /^diagnose-/,
  /^verify-/,
  /^fix-/,
  /^cleanup-/,
  /^refresh-/,
  /^reset-/,
  /^run-/,
  /^simple-test$/,
  /^demo-/,
  /^storage-/,
  /^env-check$/,
  /^auth-debug$/,
  /^password-reset-help$/,
  /^import-backup$/
];

// Keep these essential directories (whitelist)
const ESSENTIAL_DIRS = [
  'api',
  'auth', // Keep actual auth pages
  'favicon.ico',
  'globals.css',
  'layout.tsx',
  'page.tsx',
  'QueryProvider.tsx'
];

function isDebugDirectory(dirName) {
  // Check if it's an essential directory
  if (ESSENTIAL_DIRS.includes(dirName)) {
    return false;
  }
  
  // Check against debug patterns
  return DEBUG_PATTERNS.some(pattern => pattern.test(dirName));
}

function removeDebugDirectories() {
  console.log('🔍 Scanning for debug/test pages...');
  
  if (!fs.existsSync(APP_DIR)) {
    console.error('❌ App directory not found:', APP_DIR);
    return;
  }
  
  const items = fs.readdirSync(APP_DIR);
  const debugDirs = [];
  const keptDirs = [];
  
  items.forEach(item => {
    const itemPath = path.join(APP_DIR, item);
    const stat = fs.statSync(itemPath);
    
    if (stat.isDirectory()) {
      if (isDebugDirectory(item)) {
        debugDirs.push(item);
      } else {
        keptDirs.push(item);
      }
    }
  });
  
  console.log(`\n📊 Found ${debugDirs.length} debug directories and ${keptDirs.length} essential directories`);
  
  if (debugDirs.length === 0) {
    console.log('✅ No debug directories found to remove');
    return;
  }
  
  console.log('\n🗑️  Removing debug directories:');
  debugDirs.forEach(dir => {
    const dirPath = path.join(APP_DIR, dir);
    try {
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`   ✓ Removed: ${dir}`);
    } catch (error) {
      console.error(`   ❌ Failed to remove ${dir}:`, error.message);
    }
  });
  
  console.log('\n✅ Keeping essential directories:');
  keptDirs.forEach(dir => {
    console.log(`   ✓ Kept: ${dir}`);
  });
  
  console.log(`\n🎉 Successfully removed ${debugDirs.length} debug directories`);
  console.log('🔒 Production security improved - no debug pages exposed');
}

// Create a backup list before removal
function createBackupList() {
  const backupFile = path.join(__dirname, '..', 'debug-pages-removed.txt');
  const items = fs.readdirSync(APP_DIR);
  
  const debugDirs = items.filter(item => {
    const itemPath = path.join(APP_DIR, item);
    const stat = fs.statSync(itemPath);
    return stat.isDirectory() && isDebugDirectory(item);
  });
  
  const backupContent = [
    '# Debug Pages Removed for Security',
    `# Removed on: ${new Date().toISOString()}`,
    '# These directories were removed to prevent information disclosure in production',
    '',
    ...debugDirs.map(dir => `src/app/${dir}/`)
  ].join('\n');
  
  fs.writeFileSync(backupFile, backupContent);
  console.log(`📝 Created backup list: debug-pages-removed.txt`);
}

// Main execution
console.log('🚀 Starting debug page removal for production security...');

try {
  createBackupList();
  removeDebugDirectories();
  console.log('\n✅ Debug page removal completed successfully');
} catch (error) {
  console.error('❌ Failed to remove debug pages:', error.message);
  process.exit(1);
}