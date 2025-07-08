# HEDGE - High-level Enhancement & Development Guide

This document summarizes potential improvements and new feature ideas for the Soccer Pre-Game application after reviewing the current code base.

## 1. Codebase Improvements

- **Unify the translation system**
  - `src/i18n.ts` merges JSON files with programmatic strings. Consolidating these into a single source would simplify maintenance and reduce missing key issues.
- **Remove deprecated components**
  - The TODO list mentions removing `SaveGameModal`. Cleaning up unused code keeps the bundle smaller and easier to navigate.
- **Validation utilities**
  - Implement explicit validation functions for player names and jersey numbers to prevent duplicates and maintain data integrity.
- **Centralized local storage helpers**
  - Several utilities interact directly with `localStorage`. Wrapping all calls through `localStorage.ts` (async helpers) provides consistent error handling and makes a future switch to a different storage mechanism easier.
- **Improve timer reliability**
  - TODO comments in `TimerOverlay.tsx` suggest revisiting timer logic. Investigating Web Worker timers could prevent drift when the app is in the background.

## 2. New Feature Ideas

- **Cloud Sync Option**
  - Offer optional account-based synchronization so coaches can access data across devices. Existing backup utilities provide a foundation for import/export.
- **Advanced Player Analytics**
  - Build on `playerStats.ts` by adding metrics like pass completion or distance covered. Data entry could be manual at first and later expanded to integrate with wearable trackers.
- **AI-Assisted Tactics Suggestions**
  - Integrate a service that analyzes game events and suggests lineup adjustments or formations. This could expand the current tactics board features.
- **Shared Game Links**
  - Allow exporting a game summary to a shareable link for parents or players. A small serverless function could host static summaries generated from existing JSON exports.
- **Video & Image Attachments**
  - Provide an optional way to attach media to games, leveraging browser APIs for file uploads and object URLs. This extends the existing local data model.

## 3. Additional Notes

- Keep performance in mind when adding features. The current PWA works fully offline and should remain lightweight.
- Continue writing unit tests like those found in `src/components` and `src/utils` for any new modules.

