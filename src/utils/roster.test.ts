import { Player } from '@/types';
import logger from '@/utils/logger';

// Constants used in the app
const MASTER_ROSTER_KEY = 'soccerMasterRoster';

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    getStore: () => store // Helper to inspect the mock store
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Utility to create a valid player object
function createPlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: `player-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: 'Test Player',
    jerseyNumber: '10',
    isGoalie: false,
    notes: '',
    ...overrides
  };
}

// Core roster management functions
function getRoster(): Player[] {
  const roster = localStorage.getItem(MASTER_ROSTER_KEY);
  if (!roster) return [];
  
  try {
    return JSON.parse(roster);
  } catch (error) {
    logger.error("Error parsing roster:", error);
    return [];
  }
}

function saveRoster(roster: Player[]): void {
  localStorage.setItem(MASTER_ROSTER_KEY, JSON.stringify(roster));
}

function addPlayer(player: Player): Player {
  const roster = getRoster();
  
  // Check for duplicate ID
  if (roster.some(p => p.id === player.id)) {
    throw new Error(`Player with ID ${player.id} already exists`);
  }
  
  // Add player
  const updatedRoster = [...roster, player];
  saveRoster(updatedRoster);
  
  return player;
}

function updatePlayer(playerId: string, updates: Partial<Player>): Player {
  const roster = getRoster();
  const playerIndex = roster.findIndex(p => p.id === playerId);
  
  if (playerIndex === -1) {
    throw new Error(`Player with ID ${playerId} not found`);
  }
  
  // Update player
  const updatedPlayer = { ...roster[playerIndex], ...updates };
  const updatedRoster = [...roster];
  updatedRoster[playerIndex] = updatedPlayer;
  
  saveRoster(updatedRoster);
  
  return updatedPlayer;
}

function removePlayer(playerId: string): void {
  const roster = getRoster();
  const playerIndex = roster.findIndex(p => p.id === playerId);
  
  if (playerIndex === -1) {
    throw new Error(`Player with ID ${playerId} not found`);
  }
  
  // Remove player
  const updatedRoster = roster.filter(p => p.id !== playerId);
  saveRoster(updatedRoster);
}

function setGoalie(playerId: string, isGoalie: boolean = true): Player {
  // First remove goalie status from any existing goalie
  const roster = getRoster();
  
  // Find current goalie (if any)
  const currentGoalieIndex = roster.findIndex(p => p.isGoalie && p.id !== playerId);
  
  // Update roster with goalie changes
  let updatedRoster = [...roster];
  
  // Remove goalie status from current goalie (if exists)
  if (currentGoalieIndex !== -1) {
    const rosterWithoutOldGoalie = [...updatedRoster];
    rosterWithoutOldGoalie[currentGoalieIndex] = { 
      ...rosterWithoutOldGoalie[currentGoalieIndex], 
      isGoalie: false 
    };
    updatedRoster = rosterWithoutOldGoalie;
  }
  
  // Set goalie status for target player
  const playerIndex = updatedRoster.findIndex(p => p.id === playerId);
  if (playerIndex === -1) {
    throw new Error(`Player with ID ${playerId} not found`);
  }
  
  const finalRoster = [...updatedRoster];
  finalRoster[playerIndex] = { 
    ...finalRoster[playerIndex], 
    isGoalie 
  };
  
  // Save updated roster
  saveRoster(finalRoster);
  
  return finalRoster[playerIndex];
}

function validatePlayer(player: unknown): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Type guard for player object
  if (typeof player !== 'object' || player === null) {
    return { isValid: false, errors: ['Player must be an object'] };
  }
  // Cast to Partial<Player> after type guard for property access
  const playerObj = player as Partial<Player>; 

  // Check required string properties
  if (typeof playerObj.id !== 'string' || playerObj.id.trim() === '') {
    errors.push('Player must have a valid ID');
  }

  if (typeof playerObj.name !== 'string' || playerObj.name.trim() === '') {
    errors.push('Player must have a name');
  }

  // Check optional properties with defaults
  if (playerObj.isGoalie !== undefined && typeof playerObj.isGoalie !== 'boolean') {
    errors.push('isGoalie must be a boolean');
  }

  return { isValid: errors.length === 0, errors };
}

describe('Player Validation', () => {
  it('should validate a complete player object', () => {
    const player = createPlayer();
    const validation = validatePlayer(player);
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should invalidate a player object without an ID', () => {
    const playerWithoutId = createPlayer();
    delete (playerWithoutId as Partial<Player>).id;
    const validation = validatePlayer(playerWithoutId);
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('Player must have a valid ID');
  });

  it('should invalidate a player object without a name', () => {
    const player = createPlayer({ name: '' });
    const validation = validatePlayer(player);
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('Player must have a name');
  });

  it('should invalidate a player object with incorrect property types', () => {
    // Manually construct the invalid object for this test
    const invalidPlayer = {
      id: `player-${Date.now()}`,
      name: 'Invalid Type Player',
      jerseyNumber: '1',
      isGoalie: 'yes', // Intentionally wrong type
      notes: ''
    };
    
    // Cast the whole object to any before passing to validator for the test - REMOVE CAST
    const validation = validatePlayer(invalidPlayer); 
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('isGoalie must be a boolean');
  });
});

describe('Roster Management', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should add a player to an empty roster', () => {
    const player = createPlayer();
    addPlayer(player);
    
    const roster = getRoster();
    expect(roster).toHaveLength(1);
    expect(roster[0].id).toBe(player.id);
    expect(roster[0].name).toBe(player.name);
  });

  it('should add multiple players to the roster', () => {
    const player1 = createPlayer({ name: 'Player 1', jerseyNumber: '1' });
    const player2 = createPlayer({ name: 'Player 2', jerseyNumber: '2' });
    
    addPlayer(player1);
    addPlayer(player2);
    
    const roster = getRoster();
    expect(roster).toHaveLength(2);
    expect(roster[0].name).toBe('Player 1');
    expect(roster[1].name).toBe('Player 2');
  });

  it('should throw an error when adding a player with a duplicate ID', () => {
    const player = createPlayer();
    addPlayer(player);
    
    expect(() => addPlayer(player)).toThrow(`Player with ID ${player.id} already exists`);
  });

  it('should update a player in the roster', () => {
    const player = createPlayer();
    addPlayer(player);
    
    const updates = { name: 'Updated Name', jerseyNumber: '99' };
    const updatedPlayer = updatePlayer(player.id, updates);
    
    expect(updatedPlayer.name).toBe('Updated Name');
    expect(updatedPlayer.jerseyNumber).toBe('99');
    
    const roster = getRoster();
    expect(roster).toHaveLength(1);
    expect(roster[0].name).toBe('Updated Name');
    expect(roster[0].jerseyNumber).toBe('99');
  });

  it('should throw an error when updating a non-existent player', () => {
    expect(() => updatePlayer('non-existent-id', { name: 'New Name' }))
      .toThrow('Player with ID non-existent-id not found');
  });

  it('should remove a player from the roster', () => {
    const player1 = createPlayer({ name: 'Player 1' });
    const player2 = createPlayer({ name: 'Player 2' });
    
    addPlayer(player1);
    addPlayer(player2);
    
    removePlayer(player1.id);
    
    const roster = getRoster();
    expect(roster).toHaveLength(1);
    expect(roster[0].id).toBe(player2.id);
  });

  it('should throw an error when removing a non-existent player', () => {
    expect(() => removePlayer('non-existent-id'))
      .toThrow('Player with ID non-existent-id not found');
  });
});

describe('Goalie Management', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should set a player as goalie', () => {
    const player = createPlayer();
    addPlayer(player);
    
    const updatedPlayer = setGoalie(player.id);
    
    expect(updatedPlayer.isGoalie).toBe(true);
    
    const roster = getRoster();
    expect(roster[0].isGoalie).toBe(true);
  });

  it('should allow only one goalie at a time in the roster', () => {
    const player1 = createPlayer({ name: 'Player 1' });
    const player2 = createPlayer({ name: 'Player 2' });
    
    addPlayer(player1);
    addPlayer(player2);
    
    // Set player1 as goalie
    setGoalie(player1.id);
    
    // Set player2 as goalie - should remove goalie status from player1
    setGoalie(player2.id);
    
    const roster = getRoster();
    const updatedPlayer1 = roster.find(p => p.id === player1.id);
    const updatedPlayer2 = roster.find(p => p.id === player2.id);
    
    expect(updatedPlayer1?.isGoalie).toBe(false);
    expect(updatedPlayer2?.isGoalie).toBe(true);
  });

  it('should unset goalie status', () => {
    const player = createPlayer();
    addPlayer(player);
    
    // Set as goalie
    setGoalie(player.id, true);
    
    // Unset goalie status
    setGoalie(player.id, false);
    
    const roster = getRoster();
    expect(roster[0].isGoalie).toBe(false);
  });

  it('should throw an error when setting a non-existent player as goalie', () => {
    expect(() => setGoalie('non-existent-id'))
      .toThrow('Player with ID non-existent-id not found');
  });
});

describe('Roster Persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should persist the roster in localStorage', () => {
    // Create and add players
    const player1 = createPlayer({ name: 'Player 1' });
    const player2 = createPlayer({ name: 'Player 2' });
    
    addPlayer(player1);
    addPlayer(player2);
    
    // Get raw localStorage data
    const storedData = localStorage.getItem(MASTER_ROSTER_KEY);
    expect(storedData).not.toBeNull();
    
    // Parse the stored data
    const parsedData = JSON.parse(storedData!);
    expect(parsedData).toHaveLength(2);
    expect(parsedData[0].name).toBe('Player 1');
    expect(parsedData[1].name).toBe('Player 2');
  });

  it('should retrieve an empty roster if no data exists', () => {
    const roster = getRoster();
    expect(roster).toEqual([]);
  });

  it('should handle invalid JSON in localStorage', () => {
    // Set invalid JSON for the roster
    localStorage.setItem(MASTER_ROSTER_KEY, '{ invalid json');
    
    // Should return empty array instead of throwing
    const roster = getRoster();
    expect(roster).toEqual([]);
  });

  it('should maintain roster data after multiple operations', () => {
    // Add players
    const player1 = createPlayer({ name: 'Player 1', jerseyNumber: '1' });
    const player2 = createPlayer({ name: 'Player 2', jerseyNumber: '2' });
    const player3 = createPlayer({ name: 'Player 3', jerseyNumber: '3' });
    
    addPlayer(player1);
    addPlayer(player2);
    addPlayer(player3);
    
    // Update a player
    updatePlayer(player2.id, { name: 'Updated Player 2', notes: 'Star player' });
    
    // Remove a player
    removePlayer(player3.id);
    
    // Set a goalie
    setGoalie(player1.id);
    
    // Get final roster
    const roster = getRoster();
    
    // Verify state after all operations
    expect(roster).toHaveLength(2);
    
    const updatedPlayer1 = roster.find(p => p.id === player1.id);
    const updatedPlayer2 = roster.find(p => p.id === player2.id);
    
    expect(updatedPlayer1?.isGoalie).toBe(true);
    expect(updatedPlayer2?.name).toBe('Updated Player 2');
    expect(updatedPlayer2?.notes).toBe('Star player');
    
    // Player3 should be removed
    expect(roster.find(p => p.id === player3.id)).toBeUndefined();
  });

  it('persists roster changes to localStorage', () => {
    // Fix: Pass arguments as override object to createPlayer
    const initialRoster = [
      createPlayer({ id: 'p1', name: 'Alice' }), 
      createPlayer({ id: 'p2', name: 'Bob' })
    ];
    localStorageMock.setItem(MASTER_ROSTER_KEY, JSON.stringify(initialRoster));

    // Fix: Use the correct function name 'addPlayer' and ensure player object matches Player type
    const newPlayer = createPlayer({ name: 'Charlie', jerseyNumber: '3', nickname: 'Chuck', notes: '' });
    addPlayer(newPlayer); 

    const storedRosterJson = localStorageMock.getItem(MASTER_ROSTER_KEY);
    expect(storedRosterJson).not.toBeNull();
    const storedRoster = JSON.parse(storedRosterJson!);
    expect(storedRoster).toHaveLength(3);
    // Find the added player by name/nickname as ID is random
    const addedPlayer = storedRoster.find((p: Player) => p.name === 'Charlie');
    expect(addedPlayer).toBeDefined();
    expect(addedPlayer.nickname).toBe('Chuck');
  });
}); 