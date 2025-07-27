# Storage Configuration Guide

## Current Setup

Your app is now configured to use **Supabase only** for data storage:

- `NEXT_PUBLIC_ENABLE_SUPABASE=true` - Enables Supabase as the storage provider
- `NEXT_PUBLIC_DISABLE_FALLBACK=true` - Disables fallback to localStorage

This ensures that:
1. All data operations go through Supabase
2. No localStorage data is accessed or used
3. If Supabase is unavailable, operations will fail rather than falling back to localStorage

## Verifying Configuration

Navigate to `/storage-config` in your app to see:
- Current storage provider
- Fallback status
- Environment variable settings
- Connection status

## Data Flow

```
App Components
    ↓
Storage Manager (storageManager)
    ↓
Supabase Provider (no fallback)
    ↓
Supabase Database
```

## Important Notes

1. **No localStorage Access**: With these settings, the app will NOT:
   - Read from localStorage for app data
   - Fall back to localStorage if Supabase fails
   - Use any old localStorage data

2. **Import Still Works**: The backup import functionality can still read old localStorage backup files (.json) and import them to Supabase

3. **UI Preferences**: Some UI-only preferences (like install prompt dismissal) still use localStorage directly, which is fine as they're not app data

## Troubleshooting

If you see any localStorage data being used:
1. Check `/storage-config` to verify settings
2. Ensure your dev server was restarted after adding environment variables
3. Clear your browser's localStorage to remove any old data

## Direct localStorage Usage

The following components use localStorage directly for UI preferences only:
- `InstallPrompt.tsx` - Tracks when install prompt was dismissed
- Debug/diagnostic pages - For testing purposes only

All app data (players, games, settings) goes through the storage manager and uses Supabase exclusively.