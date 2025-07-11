# Data Security Enhancement Plan

This document summarizes a security audit of the Soccer Pre-Game App and outlines recommended enhancements to better protect user data stored in the browser.

## 1. Current Data Handling

- All roster, season, tournament and game data is stored in the browser's **localStorage** via helpers in `src/utils`. Users can export and import a full backup JSON file manually.
- A **hard reset** or **full backup import** clears existing data after a confirmation dialog. The service worker does not sync any data to a server.
- There is no authentication mechanism; anyone with device access can view or modify the stored data.

## 2. Identified Risks

- **Accidental Deletion**: LocalStorage can be wiped by the browser or by user action. Hard resets and imports overwrite data permanently if confirmed.
- **No Encryption**: Backup files and stored data are plain JSON, readable by anyone with access to the device or exported file.
- **No Automatic Backups**: Users must remember to export backups manually. If localStorage is lost, data is unrecoverable.

## 3. Suggested Improvements

1. **Optional Encryption for LocalStorage**
   - Implement a lightweight encryption utility (e.g., AES via the browser `Crypto` API).
   - Allow users to enable encryption with a passphrase in the settings modal.
   - Encrypt values transparently when storing to localStorage and decrypt on retrieval.
   - Update the full backup process to handle encrypted data when enabled.

2. **Automatic Periodic Backups**
   - Add a `useAutoBackup` hook that triggers `exportFullBackup()` at a configured interval (e.g., once per day).
   - Persist the last-backup timestamp in app settings to avoid excessive prompts.
   - Provide settings to enable or disable automatic backups and adjust the interval.

3. **Soft Delete via Trash Bin**
   - Modify game and roster deletion functions to mark items as "deleted" instead of removing them immediately.
   - Create a Trash view where users can restore or permanently delete these items.
   - Ensure regular lists exclude deleted entries unless viewing the Trash.

4. **Versioning & Migrations**
   - Track a schema version in app settings and perform controlled migrations when localStorage structures change.
   - This reduces the chance of data corruption when updating the app.

Implementing these features will reduce the likelihood of accidental data loss and provide an option for more secure local storage.

## Status
- [x] Optional encryption utilities and secure local-storage helpers added
- [x] Automatic backup hook implemented with configurable interval
