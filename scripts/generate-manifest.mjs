import fs from 'fs';
import path from 'path';

// This is a workaround to import from a TypeScript file in a Node script.
// We are assuming the compiled output will be in a 'dist' or similar folder,
// but for this script, we'll point directly to the source TS file
// and rely on Node's module handling capabilities.
async function importManifestConfig() {
  const configPath = path.join(process.cwd(), 'src', 'config', 'manifest.config.js');
  // Use a dynamic import() which can handle modules
  const { manifestConfig } = await import(configPath);
  return manifestConfig;
}

async function generateManifest() {
  const manifestConfig = await importManifestConfig();
  const branch = process.env.VERCEL_GIT_COMMIT_REF || 'development'; // Vercel's env var, fallback for local

  console.log(`Generating manifest for branch: ${branch}`);

  // Determine which configuration to use
  const config = manifestConfig[branch] || manifestConfig.default;

  const manifest = {
    "name": config.appName,
    "short_name": config.shortName,
    "description": "Soccer Tactics and Timer App for Coaches",
    "start_url": "/",
    "display": "fullscreen",
    "background_color": "#111827",
    "theme_color": config.themeColor,
    "icons": [
      {
        "src": config.iconPath,
        "sizes": "192x192",
        "type": "image/png"
      },
      {
        "src": config.iconPath,
        "sizes": "512x512",
        "type": "image/png"
      }
    ]
  };

  fs.writeFileSync('public/manifest.json', JSON.stringify(manifest, null, 2));
  console.log('Manifest generated successfully!');
}

async function updateServiceWorker() {
  const swPath = path.join(process.cwd(), 'public', 'sw.js');
  try {
    const swContent = fs.readFileSync(swPath, 'utf8');
    // Remove old timestamp if it exists to prevent the file from growing indefinitely
    const contentWithoutTimestamp = swContent.replace(/\/\/ Build Timestamp: .*/, '').trim();
    const newContent = `${contentWithoutTimestamp}\n// Build Timestamp: ${new Date().toISOString()}`;
    fs.writeFileSync(swPath, newContent);
    console.log('Service worker timestamp updated successfully!');
  } catch (error) {
    console.error('Failed to update service worker:', error);
    // We don't want to fail the build if the SW doesn't exist,
    // as it might not be present in all development environments.
    if (error.code !== 'ENOENT') {
      throw error; // Rethrow if it's not a "file not found" error
    } else {
      console.warn('public/sw.js not found, skipping update.');
    }
  }
}

async function main() {
  await generateManifest();
  await updateServiceWorker();
}

main().catch(error => {
  console.error("Build script failed:", error);
  process.exit(1);
}); 