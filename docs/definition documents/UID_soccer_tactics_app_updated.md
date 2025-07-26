# User Interface Design Document

## Layout Structure
- Full-screen soccer field as the primary canvas
- Top horizontal player bar with draggable roster disks
- Fixed bottom control bar with Undo, Redo, Timer controls and Settings
- Overlay timer for large clock display
- Optional tactics view that hides the score for clean drawing

## Core Components
- **Player Disks:** Custom-named circular elements representing players
- **Field Canvas:** Interactive area for placing players and drawing tactics
- **Info Bar:** Shows team names, current period and score
- **Bottom Bar Controls:**
  - Undo / Redo
  - Timer start, pause and reset
  - Toggle player names
  - Open modals (stats, roster, settings, save/load)

## Interaction patterns
- **Tap a roster disk** to rename or edit jersey number
- **Drag players** from the bar onto the field or move them to new positions
- **Draw on the field** to illustrate movement or set pieces
- **Toggle tactics view** to focus on drawing only
- **Undo/Redo** revert the latest drawing or movement
- **Open stats or roster modals** from the control bar

## Visual Design Elements & Color Scheme
- Green soccer field with clear pitch markings
- Color-coded player disks for home, away and goalie
- Smooth freehand lines for drawings
- Light UI controls with subtle shadows
- Player names centered and bold when visible

## Mobile, Web App, Desktop considerations
- **Mobile-first design** optimized for single-hand use and touch input.
- **Tablet view** uses more space for player bar and larger touch zones.
- **Web/Desktop** supports mouse interactions for dragging and drawing.

## Typography
- Simple, readable sans-serif font (e.g., Roboto, Open Sans).
- Player names inside disks: bold, centered, and auto-scaled to fit when visible.
- UI labels kept minimal or icon-only to reduce visual load.

## Accessibility
- High-contrast field and player disks for visibility in sunlight.
- Touch targets large enough for easy dragging.
- Support for both left- and right-handed users (drag from top center).
- Font sizes and contrast adhere to WCAG AA minimums.
- Name toggle state is programmatically labeled for screen readers.

