# Manual Testing Guide

Use this short checklist to manually verify key workflows after making changes to the app:

1. **Start a new game and adjust scores** – Add and remove goals for both teams. Ensure the score never goes below zero and updates instantly in the UI.
2. **Reset the game timer** – Begin a period, let the timer run, then trigger both "Reset Timer" and "Reset Game" actions. Confirm the timer and period values reset as expected.
3. **Open modals sequentially** – Open Game Settings, Load Game and Roster modals one after another. Each should appear without closing the others unexpectedly and allow closing individually.
4. **Switch languages** – Toggle between English and Finnish and verify all visible text changes without reloading the page.
5. **Save and reload a game** – Perform a quick save, refresh the page and load the saved game to confirm state persistence.
6. **Assess players after a game** – After ending a game, open the Player Assessment modal via the new button. Adjust a slider for a player, tap **Save**, then close and reopen the modal to confirm the rating was stored.
7. **Try new assessment UI** – Expand a player card and verify the segmented overall selector, sliders and notes input work. Saving should collapse the card and show a checkmark.
8. **Review assessment progress** – Save ratings for multiple players and ensure the header progress updates and saved players show a ✔ icon.
9. **Check performance averages** – Open a player's stats page and confirm the new Performance Ratings section shows average slider values and number of rated games. In Game Stats, open the Overall tab to see team rating averages.

Running through these steps after updates helps catch regressions before deploying.
