# Settings Modal Plan

This document outlines the proposed Settings modal for the Soccer Pre-Game App. The project already stores a few preferences in `src/utils/appSettings.ts` but has no dedicated UI to modify them. The modal will consolidate all global options in one place and build on existing persistence utilities.

## 1. General
- **Language selection** – toggle language and persist via `updateAppSettings({ language })`.
- **Default team name** – edit and store using `saveLastHomeTeamName()`.
- **Reset app guide** – toggle `hasSeenAppGuide` to show onboarding again.

## 2. Data & Backup
- **Automatic backup** – enable periodic exports and configure interval.
- **Encryption** – optional passphrase to encrypt localStorage and backup files.
- **Manual backup/restore** – links to existing export/import helpers.

## 3. Customization
- **Team branding** – upload logo and choose theme colors.
- **Default game parameters** – set period count, duration and substitution interval.

## 4. Integrations
- **LLM API key** – securely store a token used for player profile generation.
- **Analytics opt-out** – option to disable Vercel analytics.

## Implementation Notes
- Reuse modal patterns from `.docs/STYLE_GUIDE.md` for layout and visual effects.
- Update `ModalProvider` and `ControlBar.tsx` so the existing settings button opens this modal.
- Persist all changes through the helpers in `appSettings.ts`.
