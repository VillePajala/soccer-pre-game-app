#!/usr/bin/env node
/**
 * Script to replace console statements with logger utility
 * This is part of the critical issues cleanup phase
 */

const fs = require('fs');
const path = require('path');

// Files to process (excluding test files which should keep console mocks)
const filesToProcess = [
  'src/components/GameStatsModal/GameStatsModalNew.tsx',
  'src/components/LoadGameModal.tsx',
  'src/components/offline/OfflineSettings.tsx',
  'src/components/StartScreen.tsx',
  'src/context/AuthContext.tsx',
  'src/app/page.tsx',
  'src/components/AppShortcutHandler.tsx',
  'src/components/migration/MigrationModal.tsx',
  'src/app/auth/confirm/page.tsx',
  'src/app/auth/reset-password/page.tsx',
  'src/utils/pwaSettings.ts',
  'src/utils/sessionSettings.ts',
  'src/app/import-backup/page.tsx',
  'src/components/EnhancedInstallPrompt.tsx',
  'src/app/api/csp-report/route.ts',
  'src/utils/cacheUtils.ts',
  'src/hooks/useGameSessionReducer.ts',
  'src/hooks/useDeviceIntegration.ts'
];

// Replacements to make
const replacements = [
  {
    pattern: /console\.error\(/g,
    replacement: 'logger.error(',
    needsImport: true
  },
  {
    pattern: /console\.log\(/g,
    replacement: 'logger.debug(',
    needsImport: true
  },
  {
    pattern: /console\.warn\(/g,
    replacement: 'logger.warn(',
    needsImport: true
  }
];

function addLoggerImport(content, filePath) {
  // Skip if logger is already imported
  if (content.includes("import logger from '@/utils/logger'")) {
    return content;
  }

  // Find the best place to add the import
  const lines = content.split('\n');
  let insertIndex = 0;

  // Find the last import statement
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ') && !lines[i].includes('from \'react\'')) {
      insertIndex = i + 1;
    } else if (lines[i].trim() === '' && insertIndex > 0) {
      break;
    } else if (!lines[i].trim().startsWith('import ') && !lines[i].trim().startsWith('\'use client\'') && lines[i].trim() !== '' && insertIndex === 0) {
      insertIndex = i;
      break;
    }
  }

  // Insert the logger import
  lines.splice(insertIndex, 0, "import logger from '@/utils/logger';");
  return lines.join('\n');
}

function processFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Skipping ${filePath} - file not found`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;
  let needsLoggerImport = false;

  // Apply replacements
  replacements.forEach(({ pattern, replacement, needsImport }) => {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement);
      modified = true;
      if (needsImport) {
        needsLoggerImport = true;
      }
    }
  });

  // Add logger import if needed
  if (needsLoggerImport) {
    const originalContent = content;
    content = addLoggerImport(content, filePath);
    if (content !== originalContent) {
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Updated ${filePath}`);
  } else {
    console.log(`➡️  No changes needed for ${filePath}`);
  }
}

console.log('🚀 Starting console statements cleanup...\n');

filesToProcess.forEach(processFile);

console.log('\n✨ Console statements cleanup completed!');
console.log('📝 Next steps:');
console.log('   1. Test the application');
console.log('   2. Run: npm run lint');
console.log('   3. Run: npm run build');
console.log('   4. Verify no console statements in production');