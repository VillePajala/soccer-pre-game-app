#!/usr/bin/env node

/**
 * Bundle Analysis Script
 * 
 * Analyzes the current bundle size and identifies optimization opportunities
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Read package.json to analyze dependencies
const packageJsonPath = join(projectRoot, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

console.log('📦 BUNDLE SIZE ANALYSIS');
console.log('========================\n');

// Analyze dependencies
const dependencies = packageJson.dependencies || {};
const devDependencies = packageJson.devDependencies || {};

console.log(`📊 Dependencies Overview:`);
console.log(`  - Production dependencies: ${Object.keys(dependencies).length}`);
console.log(`  - Dev dependencies: ${Object.keys(devDependencies).length}\n`);

// Identify potentially large dependencies
const heavyDependencies = [
  '@supabase/supabase-js',
  '@tanstack/react-query', 
  'react',
  'react-dom',
  'next',
  'i18next',
  '@vercel/analytics',
  'tinycolor2',
  'date-fns'
];

console.log('🏋️ Potentially Heavy Dependencies:');
heavyDependencies.forEach(dep => {
  if (dependencies[dep]) {
    console.log(`  ✓ ${dep}: ${dependencies[dep]}`);
  }
});

console.log('\n');

// Analyze .next build directory for actual sizes
const buildDir = join(projectRoot, '.next');

if (fs.existsSync(buildDir)) {
  console.log('📁 Build Directory Analysis:');
  
  try {
    // Check static files
    const staticDir = join(buildDir, 'static');
    if (fs.existsSync(staticDir)) {
      const staticSize = getFolderSize(staticDir);
      console.log(`  - Static files: ${formatBytes(staticSize)}`);
      
      // Check chunks specifically
      const chunksDir = join(staticDir, 'chunks');
      if (fs.existsSync(chunksDir)) {
        const chunksSize = getFolderSize(chunksDir);
        console.log(`  - JavaScript chunks: ${formatBytes(chunksSize)}`);
        
        // List largest chunks
        const chunks = fs.readdirSync(chunksDir)
          .filter(file => file.endsWith('.js'))
          .map(file => ({
            name: file,
            size: fs.statSync(join(chunksDir, file)).size
          }))
          .sort((a, b) => b.size - a.size)
          .slice(0, 5);
          
        console.log('\n  📋 Largest JavaScript Chunks:');
        chunks.forEach((chunk, index) => {
          console.log(`    ${index + 1}. ${chunk.name}: ${formatBytes(chunk.size)}`);
        });
      }
    }
  } catch (error) {
    console.log(`  ⚠️ Could not analyze build directory: ${error.message}`);
  }
}

console.log('\n');

// Optimization recommendations
console.log('🚀 OPTIMIZATION RECOMMENDATIONS:');
console.log('================================\n');

const recommendations = [
  {
    title: 'Code Splitting',
    priority: 'HIGH',
    items: [
      'Lazy load GameStatsModal and GameSettingsModal (likely largest components)',
      'Implement dynamic imports for heavy modals',
      'Split authentication flows into separate chunks'
    ]
  },
  {
    title: 'Bundle Size Reduction',
    priority: 'HIGH', 
    items: [
      'Tree shake unused Supabase functions',
      'Use date-fns with only needed functions (not entire library)',
      'Consider replacing tinycolor2 with lighter alternative',
      'Remove unused i18next features if any'
    ]
  },
  {
    title: 'Asset Optimization',
    priority: 'MEDIUM',
    items: [
      'Optimize font loading (preload critical fonts)',
      'Compress and optimize images',
      'Use next/image for automatic optimization',
      'Implement proper caching strategies'
    ]
  },
  {
    title: 'React Optimization',
    priority: 'MEDIUM',
    items: [
      'Add React.memo to expensive components',
      'Implement virtual scrolling for player lists',
      'Optimize SoccerField re-renders',
      'Use useCallback for expensive event handlers'
    ]
  }
];

recommendations.forEach((rec, index) => {
  console.log(`${index + 1}. ${rec.title} (${rec.priority} Priority):`);
  rec.items.forEach(item => {
    console.log(`   • ${item}`);
  });
  console.log('');
});

console.log('🎯 NEXT STEPS:');
console.log('==============\n');
console.log('1. Implement lazy loading for large modals');
console.log('2. Analyze bundle reports in .next/analyze/client.html');
console.log('3. Remove unused dependencies');
console.log('4. Optimize React components with memo/callback');
console.log('5. Implement code splitting for routes');

console.log('\n📊 To view detailed bundle analysis:');
console.log('   Open .next/analyze/client.html in your browser');

// Helper functions
function getFolderSize(folderPath) {
  let totalSize = 0;
  
  function addSize(itemPath) {
    const stats = fs.statSync(itemPath);
    if (stats.isFile()) {
      totalSize += stats.size;
    } else if (stats.isDirectory()) {
      const items = fs.readdirSync(itemPath);
      items.forEach(item => {
        addSize(join(itemPath, item));
      });
    }
  }
  
  try {
    addSize(folderPath);
  } catch (error) {
    // Ignore errors for inaccessible files
  }
  
  return totalSize;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}