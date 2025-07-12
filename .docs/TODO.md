# Project TODO List

## 🐛 Bug Fixes & Technical Debt

### Code Cleanup
- [x] **Clean up SaveGameModal**
  - The SaveGameModal is deprecated as we've moved to quick save only
  - Remove component, translations, states, and all related code
  - Impact: Reduces codebase complexity and maintenance burden

- [x] **Refactor Game Settings Data Persistence**
  - Saving logic now lives inside `GameSettingsModal` via `updateGameDetails` mutations
  - Auto-save still exists for ongoing games, but settings edits persist directly
  - Impact: Improves code maintainability and reduces potential for data loss

### Data Validation
- [x] **Player Name/Number Validation**
  - Add warnings for duplicate player names or numbers
  - Implement proper validation in player creation forms
  - Impact: Prevents data inconsistency issues

- [ ] **Game Selection Validation**
  - Improve player selection validation in game setup
  - Enhance season/tournament association logic
  - Impact: Ensures data integrity for game records

## 🧪 Testing Infrastructure

### Setup & Configuration
- [x] **Jest & React Testing Library Setup**
  - Install and configure testing libraries
  - Set up TypeScript support for tests
  - Impact: Enables automated testing capabilities

- [x] **CI Pipeline Setup**
  - Configure GitHub Actions for automated testing
  - Add test scripts to package.json
  - Impact: Ensures code quality on every commit

### Test Implementation
- [x] **Utility Function Tests**
  - Write tests for time formatting functions
  - Test CSV/data export functionality
  - Test game event processing logic
  - Impact: Ensures core utilities work correctly

- [ ] **Component Tests**
  - [x] Test PlayerBar interactions
  - [x] Test GameStatsModal functionality
  - [x] Test SoccerField canvas operations
  - [ ] Test TimerOverlay accuracy
  - Impact: Validates UI component behavior

- [ ] **Integration Tests**
  - Test complete game creation workflow
  - Test save/load game functionality
  - Test player management system
  - Test statistics calculation
  - Impact: Verifies end-to-end functionality

## 🎮 Game Features

### Statistics & Analytics
- [ ] **Enhanced Player Stats**
  - [x] Add totals row to stats table
  - Implement player on-pitch time tracking
  - Add more event types (corners, shots, fouls)
  - Impact: Provides more detailed game analysis

- [ ] **Visual Analytics**
  - Add bar charts for player points
  - Create visual event timeline
  - Add filtering options to goal log
  - Impact: Makes statistics more digestible

### Tactics Board
- [ ] **Animation System**
  - Implement recording mode for tactical movements
  - Add playback controls (play, pause, reset)
  - Create animation saving/loading system
  - Impact: Enables creating tactical play demonstrations

- [ ] **Drawing Tools**
  - Add ball marker
  - Implement arrows and shapes
  - Add multiple colors for drawings
  - Impact: Improves tactical explanation capabilities

- [ ] **Formation Management**
  - Add quick-access formation templates
  - Implement formation save/load
  - Create toggleable formation/tactics views
  - Impact: Streamlines team setup process

### Season & Tournament Management
- [ ] **Season & Tournament Management Enhancements**
  - Add fields for default game parameters (location, number of periods, period duration)
  - Allow setting a date range or list of dates for tournaments
  - Automatically prefill new games with these settings
  - Provide an archive toggle for old seasons or tournaments
  - Enable default roster assignments
  - Include notes or description fields
  - Add color or badge customization options
  - Show quick statistics like total games played and goals scored
  - Implement import and export of season or tournament setups
  - Offer calendar (.ics) file generation when dates are defined

## 🎨 UI/UX Improvements

### Accessibility
- [ ] **Core Accessibility**
  - Improve color contrast ratios
  - Optimize touch target sizes
  - Add keyboard navigation
  - Implement screen reader support
  - Impact: Makes app usable for all users

### Responsive Design
- [ ] **Mobile Optimization**
  - Review modal layouts on small screens
  - Optimize timer and stats displays
  - Improve touch interactions
  - Impact: Ensures good mobile experience

### User Experience
- [ ] **Visual Feedback**
  - Add player status indicators
  - Implement contextual help tooltips
  - Create onboarding tour
  - Impact: Improves user understanding

## 🌐 Internationalization

### Language Support
- [x] **Finnish Translation Completion**
  - Audit existing Finnish translations
  - Fix remaining English text
  - Update translation key structure
  - Impact: Ensures consistent Finnish experience

- [ ] **Additional Languages**
  - Prepare for multi-language support
  - Create translation contribution guide
  - Impact: Makes app accessible to more users

## 📱 PWA Features

### Offline Capabilities
- [ ] **Enhanced Offline Support**
  - Improve data persistence
  - Add offline mode indicators
  - Impact: Ensures app works without internet

### Installation Experience
- [x] **PWA Installation**
  - [x] Add installation prompts
  - [x] Create custom home screen icons
  - [x] Improve app launch experience
  - Impact: Makes app feel more native

## ✅ Recently Completed

### Bug Fixes
- [x] Goal events reset issue
- [x] Player creation duplicates
- [x] Incorrect players in goal logging
- [x] Player selection in new game setup
- [x] Season/Tournament selection issues
- [x] Timer reset on mobile app switch
- [x] Sub interval mid-game changes
- [x] Manual game events reflection
- [x] Score color coding in timer modal
- [x] Game stats player ordering
- [x] Question mark icons on saved game cards
- [x] Player ordering in game stats with filters

### Features
- [x] Initialize Next.js project
- [x] Set up Git repository
- [x] Create basic documentation
- [x] Implement core UI components
- [x] Implement player management
- [x] Implement game timer
- [x] Implement drawing functionality
- [x] Implement Undo/Redo
- [x] Save/Load Multiple Games
- [x] Import Game Data
- [x] Allow sorting Player Stats table
- [x] Add filter input for Player Stats
- [x] Allow editing goal log entries- [x] Add Export Functionality (JSON/CSV)

## 🚀 Major Roadmap

<!-- Removed IndexedDB migration plan -->

- **Introduce Supabase Backend**
  - Add optional user authentication and cloud sync using Supabase.
  - Keep localStorage as the local cache and synchronize on sign in.

- **Player Performance Evaluations**
  - Add a modal with ten sliders to rate each player after a game.
  - Store ratings per player and game to build aggregated stats.
  - Use collected data to generate a player profile/analysis view.
