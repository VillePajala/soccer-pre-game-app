/**
 * Game Components
 * 
 * Extracted components from the HomePage refactoring effort.
 * Each component focuses on a specific responsibility.
 */

export { GameStateProvider, useGameStateContext } from './GameStateProvider';
export { GameView } from './GameView';
export { GameControls } from './GameControls';  
export { ModalManager } from './ModalManager';
export { HomePage } from './HomePage';

// TODO: Export other components as they are created
// export { DataSyncManager } from './DataSyncManager';