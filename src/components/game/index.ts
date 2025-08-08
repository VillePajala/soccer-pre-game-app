/**
 * Game Components
 * 
 * Extracted components from the HomePage refactoring effort.
 * Each component focuses on a specific responsibility.
 * 
 * Migration wrappers are exported as default to use Zustand state management
 * with fallback to legacy React state when needed.
 */

// Migration wrappers (default exports for seamless migration)
export { GameStateProvider, useGameStateContext } from './GameStateProvider';
export { GameControls } from './GameControls';

// Other game components
export { GameView } from './GameView';
export { ModalManager } from './ModalManager';
export { default as HomePage } from '../HomePage';

// Legacy components (available for direct import if needed)
export { GameStateProvider as LegacyGameStateProvider } from './GameStateProvider';
export { GameControls as LegacyGameControls } from './GameControls';

// Migrated components (available for direct import if needed)
export { MigratedGameStateProvider } from './MigratedGameStateProvider';
export { MigratedGameControls } from './MigratedGameControls';