# User Interface Design Document

## Layout Structure
- Full-screen soccer field as the central canvas.
- Top horizontal scrollable bar with player disks.
- Bottom fixed bar with minimal controls (Undo, Redo, Toggle Names, optional Reset).

## Core Components
- **Player Disks:** Custom-named circular elements representing players.
- **Field Canvas:** Touchable area for placing/moving players and drawing.
- **Bottom Bar Controls:**
  - Undo
  - Redo
  - Toggle Names (show/hide player names)
  - (Optional) Reset Field

## Interaction patterns
- **Tap on a player disk** in the top bar to rename (inline edit).
- **Drag a disk** from the top bar to place it on the field.
- **Drag a placed player** to reposition.
- **Draw by touching and dragging** on any empty field area (freehand arrows/lines).
- **Undo/Redo** buttons revert drawing or movement steps.
- **Toggle player names** on or off with a single button press—applies to all players on the field.

## Visual Design Elements & Color Scheme
- Green soccer field with clear lines and zones.
- Color-coded player disks (e.g., team colors or default blue/red).
- Thin, smooth freehand lines for drawings (arrows, paths).
- Clean white or light-gray UI controls with soft shadows.
- When names are hidden, disks show only color; when visible, names are centered and bold.

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