# Storage Architecture and Migration Guide

This document consolidates all information about the app's storage architecture, including the migration from localStorage to Supabase.

## Table of Contents

1. [Storage Configuration](#storage-configuration)
2. [Supabase Migration Guide](#supabase-migration-guide)
3. [LocalStorage Deprecation Plan](#localstorage-deprecation-plan)
4. [Migration Troubleshooting](#migration-troubleshooting)
5. [Offline Requirements](#offline-requirements)

---

## Storage Configuration

The application uses a flexible storage abstraction layer that supports multiple backends:

- **LocalStorage**: Original browser-based storage (default)
- **Supabase**: Cloud-based PostgreSQL database (opt-in via feature flag)
- **IndexedDB**: Offline caching layer for Supabase data

### Feature Flags

- `NEXT_PUBLIC_ENABLE_SUPABASE`: Enable Supabase storage backend
- `NEXT_PUBLIC_DISABLE_FALLBACK`: Disable automatic fallback to localStorage

### Storage Manager

The `StorageManager` class provides a unified interface for all storage operations, automatically selecting the appropriate backend based on configuration and availability.

---

## Supabase Migration Guide

This section explains how to migrate the MatchDay Coach application from browser `localStorage` to using Supabase as a backend.

### Current State Overview

The application is a PWA built with Next.js 15, React 19 and TypeScript. All persistent data is currently kept in `localStorage`.

Key modules that interact with storage:
- `src/utils/masterRoster.ts` and `src/utils/masterRosterManager.ts`
- `src/utils/seasons.ts` and `src/utils/tournaments.ts`
- `src/utils/savedGames.ts`
- `src/utils/appSettings.ts`

### Migration Status

**COMPLETED STEPS:**
- ✅ **STEP 1** - Inventory Current Data
- ✅ **STEP 2** - Design Supabase Schema
- ✅ **STEP 3** - Bootstrap Supabase Project
- ✅ **STEP 4** - Build Storage Abstraction Layer
- ✅ **STEP 5** - Update Components
- ✅ **STEP 6** - Implement Authentication
- ✅ **STEP 7** - Write Migration Script
- ✅ **STEP 8** - Offline Support
- ✅ **STEP 9** - Testing & QA
- ✅ **STEP 10** - Feature Flag Implementation

### Database Schema

The Supabase database includes the following tables:
- `users` - Authentication and user profiles
- `players` - Player roster with user_id FK
- `seasons` - Season definitions with settings
- `tournaments` - Tournament definitions linked to seasons
- `games` - Game states and metadata
- `game_events` - Normalized game events
- `player_assessments` - Player performance ratings
- `app_settings` - User-specific application settings

### Environment Configuration

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=public-anon-key
NEXT_PUBLIC_ENABLE_SUPABASE=true  # Enable Supabase backend
```

---

## LocalStorage Deprecation Plan

### Timeline
- **Phase 1:** Display in-app warnings during versions 0.9.x
- **Phase 2:** Disable `localStorage` by default once all active users have migrated (target **2025-12-31**)
- **Phase 3:** Remove the `localStorage` utilities and driver entirely in version **1.0**

### Migration Completion Criteria
- All users successfully sign in to Supabase and sync their data
- Automated telemetry reports zero `localStorage` access
- Manual regression tests pass with `localStorage` disabled

---

## Migration Troubleshooting

### Common Issues

1. **Column name mismatches**: All fixed (snake_case in DB)
2. **UUID handling**: Non-UUID game IDs stored in JSONB
3. **Missing columns**: Migration 002 added all required columns
4. **Auth state**: Should persist across refreshes
5. **Data transforms**: Should handle all data types correctly

### Debugging Steps

1. Check browser console for errors
2. Verify Supabase credentials in `.env.local`
3. Check Supabase dashboard for database activity
4. Review network tab for failed API calls
5. Verify RLS policies aren't blocking access

---

## Offline Requirements

### Core Offline Features

1. **Game Timer**: Must continue running when offline
2. **Player Management**: Full CRUD operations cached locally
3. **Game Events**: Queue events for sync when online
4. **Data Persistence**: No data loss during offline periods

### Implementation

- **IndexedDB Cache**: Three-tier cache system (data, sync queue, session)
- **Service Worker**: Enhanced with caching strategies and background sync
- **Offline Indicators**: Visual feedback when app is offline
- **Sync Queue**: Automatic retry with exponential backoff

### Sync Conflict Resolution

1. **Last-write-wins** for simple updates
2. **Merge strategy** for collections (players, events)
3. **User prompt** for complex conflicts
4. **Audit log** of all sync operations

---

## Summary

The storage architecture provides a seamless transition path from localStorage to Supabase while maintaining full offline functionality. The abstraction layer ensures the app works identically regardless of the storage backend, and the migration process preserves all existing user data.

**Last Updated**: 2025-07-27