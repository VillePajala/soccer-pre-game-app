# Manual Testing Guide

Use this short checklist to manually verify key workflows after making changes to the app:

1. **Start a new game and adjust scores** – Add and remove goals for both teams. Ensure the score never goes below zero and updates instantly in the UI.
2. **Reset the game timer** – Begin a period, let the timer run, then trigger both "Reset Timer" and "Reset Game" actions. Confirm the timer and period values reset as expected.
3. **Open modals sequentially** – Open Game Settings, Load Game and Roster modals one after another. Each should appear without closing the others unexpectedly and allow closing individually.
4. **Switch languages** – Toggle between English and Finnish and verify all visible text changes without reloading the page.
5. **Save and reload a game** – Perform a quick save, refresh the page and load the saved game to confirm state persistence.
6. **Assess players after a game** – After ending a game, open the Player Assessment modal via the new button. Rate at least one player and ensure the data persists after closing and reopening the modal.

Running through these steps after updates helps catch regressions before deploying.
