import { getMasterRoster, addPlayer, updatePlayer, removePlayer, setGoalieStatus, setFairPlayCardStatus } from './masterRosterManager';
import type { Player } from '@/types';

// Mock the storage manager instead of masterRoster
jest.mock('@/lib/storage', () => ({
  authAwareStorageManager: {
    getPlayers: jest.fn(),
    savePlayer: jest.fn(),
    updatePlayer: jest.fn(),
    deletePlayer: jest.fn(),
    getProviderName: jest.fn(() => 'mocked'),
  }
}));

const mockRoster: Player[] = [
  { id: '1', name: 'A', isGoalie: false, receivedFairPlayCard: false },
];

jest.mock('./logger', () => ({
  __esModule: true,
  default: { log: jest.fn(), warn: jest.fn(), error: jest.fn() }
}));

import { authAwareStorageManager as storageManager } from '@/lib/storage';

const mockStorageManager = storageManager as jest.Mocked<typeof storageManager>;

beforeEach(() => {
  jest.resetAllMocks();
});

it('returns roster on success', async () => {
  mockStorageManager.getPlayers.mockResolvedValue(mockRoster);
  await expect(getMasterRoster()).resolves.toEqual(mockRoster);
});

it('returns empty array on get error', async () => {
  mockStorageManager.getPlayers.mockRejectedValue(new Error('fail'));
  const result = await getMasterRoster();
  expect(result).toEqual([]);
});

it('adds player via storage manager', async () => {
  const playerData = { name: 'A' };
  const savedPlayer = { id: '1', name: 'A', isGoalie: false, receivedFairPlayCard: false };
  mockStorageManager.savePlayer.mockResolvedValue(savedPlayer);
  await expect(addPlayer(playerData)).resolves.toBe(savedPlayer);
  expect(mockStorageManager.savePlayer).toHaveBeenCalledWith(expect.objectContaining({
    name: 'A',
    isGoalie: false,
    receivedFairPlayCard: false
  }));
});

it('returns null when add fails', async () => {
  mockStorageManager.savePlayer.mockRejectedValue(new Error('err'));
  await expect(addPlayer({ name: 'A' })).resolves.toBeNull();
});

it('updates player via storage manager', async () => {
  const updatedPlayer = { ...mockRoster[0], name: 'B' };
  mockStorageManager.updatePlayer.mockResolvedValue(updatedPlayer);
  await expect(updatePlayer('1', { name: 'B' })).resolves.toBe(updatedPlayer);
  expect(mockStorageManager.updatePlayer).toHaveBeenCalledWith('1', { name: 'B' });
});

it('returns null when update fails', async () => {
  mockStorageManager.updatePlayer.mockRejectedValue(new Error('err'));
  await expect(updatePlayer('1', { name: 'B' })).resolves.toBeNull();
});

it('removes player via storage manager', async () => {
  mockStorageManager.deletePlayer.mockResolvedValue(undefined);
  await expect(removePlayer('1')).resolves.toBe(true);
  expect(mockStorageManager.deletePlayer).toHaveBeenCalledWith('1');
});

it('returns false when remove fails', async () => {
  mockStorageManager.deletePlayer.mockRejectedValue(new Error('err'));
  await expect(removePlayer('1')).resolves.toBe(false);
});

it('sets goalie via storage manager', async () => {
  const updatedPlayer = { ...mockRoster[0], isGoalie: true };
  mockStorageManager.updatePlayer.mockResolvedValue(updatedPlayer);
  await expect(setGoalieStatus('1', true)).resolves.toBe(updatedPlayer);
  expect(mockStorageManager.updatePlayer).toHaveBeenCalledWith('1', { isGoalie: true });
});

it('returns null when set goalie fails', async () => {
  mockStorageManager.updatePlayer.mockRejectedValue(new Error('err'));
  await expect(setGoalieStatus('1', true)).resolves.toBeNull();
});

it('sets fair play via storage manager', async () => {
  const updatedPlayer = { ...mockRoster[0], receivedFairPlayCard: true };
  mockStorageManager.updatePlayer.mockResolvedValue(updatedPlayer);
  await expect(setFairPlayCardStatus('1', true)).resolves.toBe(updatedPlayer);
  expect(mockStorageManager.updatePlayer).toHaveBeenCalledWith('1', { receivedFairPlayCard: true });
});

it('returns null when set fair play fails', async () => {
  mockStorageManager.updatePlayer.mockRejectedValue(new Error('err'));
  await expect(setFairPlayCardStatus('1', true)).resolves.toBeNull();
});
