# Dedicated Onboarding Tour

This document outlines a proposed multi-step introduction for first-time users. The TODO list highlights "Create onboarding tour" and contextual help tooltips as pending tasks (see [Project TODO](../project/TODO.md)). Implementing a guided tour will make the starting experience smoother and highlight core workflows.

## 1. Tour Flow
1. **Manage rosters** – Walk users through opening the roster modal, adding players and selecting the match-day lineup.
2. **Start or resume games** – Point to the new game and load game buttons. Explain quick save/resume so progress is never lost.
3. **Access settings and backups** – Show where to open the settings modal for language selection and how to export a full backup.

Each step should appear in sequence with short tooltips and a clear **Next** button.

## 2. Mobile-first Considerations
- Large tap targets (~48px) for navigation buttons and highlighted interface areas.
- Support simple swipe gestures or tapping anywhere on the overlay to advance.
- Keep steps vertically oriented for narrow screens and avoid horizontal scrolling.
- Place progress indicators near the bottom edge for one-handed use.
- Ensure all instructions remain visible above the on-screen keyboard when text input is required.

## 3. Trigger Behavior
- Show the tour immediately after the existing instruction modal when `hasSeenAppGuide` is false.
- Provide a "View Tour" button in the settings modal so users can replay it at any time (see [Settings Modal Plan](../archive/settings-modal-plan.md)).

## 4. Implementation Notes
- Consider a lightweight library like `react-joyride` for positioning tooltips, or build a minimal custom solution that uses portal overlays.
- Internationalize all tour text using the existing `react-i18next` setup.
- Ensure the tour is responsive and keyboard accessible in line with the [Style Guide](../project/STYLE_GUIDE.md).

## Status
- [ ] Onboarding tour implemented
