#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

// Simple budget check using Next.js build stats if available, or fallback sizes in .next
const projectRoot = process.cwd();
const nextDir = path.join(projectRoot, '.next');

// Budgets adjusted for feature-rich PWA with soccer field visualization, 
// game management, charts, i18n, PWA features, and monitoring
const MAIN_BUNDLE_MAX_BYTES = 2_000_000; // 2 MB (was 1 MB - too restrictive for this app)
const TOTAL_ASSETS_MAX_BYTES = 8_000_000; // 8 MB (was 5 MB - accounts for charts, PWA assets)

function getFileSize(filePath) {
  try {
    const stat = fs.statSync(filePath);
    return stat.size;
  } catch {
    return 0;
  }
}

function findFilesRecursively(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results.push(...findFilesRecursively(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

function main() {
  if (!fs.existsSync(nextDir)) {
    console.error('[bundle-budgets] .next directory not found. Run build first.');
    process.exit(1);
  }

  // Look for JS chunks under .next/static/chunks and main app chunk
  const staticDir = path.join(nextDir, 'static');
  const files = findFilesRecursively(staticDir);

  // Heuristic: main bundle files include 'main-' or 'webpack-' or 'app' chunk
  const mainCandidates = files.filter(f => /main-|webpack-|app-/.test(path.basename(f)) && /\.js$/.test(f));
  const mainSizes = mainCandidates.map(getFileSize);
  const largestMain = mainSizes.length ? Math.max(...mainSizes) : 0;

  const totalAssets = files.reduce((sum, f) => sum + getFileSize(f), 0);

  let ok = true;
  if (largestMain > MAIN_BUNDLE_MAX_BYTES) {
    console.error(`[bundle-budgets] Main bundle exceeded: ${largestMain} > ${MAIN_BUNDLE_MAX_BYTES}`);
    ok = false;
  } else {
    console.log(`[bundle-budgets] Main bundle OK: ${largestMain} <= ${MAIN_BUNDLE_MAX_BYTES}`);
  }

  if (totalAssets > TOTAL_ASSETS_MAX_BYTES) {
    console.error(`[bundle-budgets] Total assets exceeded: ${totalAssets} > ${TOTAL_ASSETS_MAX_BYTES}`);
    ok = false;
  } else {
    console.log(`[bundle-budgets] Total assets OK: ${totalAssets} <= ${TOTAL_ASSETS_MAX_BYTES}`);
  }

  process.exit(ok ? 0 : 2);
}

main();


