# Product Requirements Document

## 1. Elevator Pitch
A mobile-first progressive web app for soccer coaches to manage rosters, log game events and design tactics.  Coaches can drag players onto the field, keep score with a built in timer and record goals or cards as they happen.  Everything is stored locally so the app works offline and remains fast on the sideline.

## 2. Who is this app for
Coaches of youth and amateur teams who need a single tool for pre‑game planning, live event tracking and quick tactical visualization on phones or tablets.

## 3. Functional Requirements
- Visualize player positioning on a drag-and-drop soccer field
- Maintain a persistent master roster with jersey numbers and goalie status
- Select available players for each match
- Log goals, assists and Fair Play cards in real time
- Track score, period and a running game clock with optional substitution timer
- View cumulative player statistics by game, season or tournament
- Export stats to CSV or JSON
- Save and load complete game states
- Dedicated tactics board with freehand drawing tools
- Toggle player name visibility
- Responsive design for mobile and desktop
- Offline first using `localStorage`
- Internationalization for English and Finnish

## 4. User Stories
- As a coach, I want to manage my roster and select players for today’s match.
- As a coach, I want to drag players or opponents onto the field and reposition them freely.
- As a coach, I want to log goals and cards so that stats are accurate later.
- As a coach, I want to save a game and reload it later for review.
- As a coach, I want to export season statistics for sharing with parents.
- As a coach, I want a dedicated tactics board where I can draw quick plays.

## 5. User Interface
- Top bar with timer, score and quick access to modals
- Collapsible player bar containing draggable roster disks
- Main soccer field canvas for placing players and drawing
- Bottom control bar with undo/redo, timer controls and settings
- Modals for roster management, game stats, save/load and instructions
- Dedicated tactics view that hides the scoreboard for a clean drawing space

