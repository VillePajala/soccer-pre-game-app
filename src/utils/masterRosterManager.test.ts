import { getMasterRoster, addPlayer, updatePlayer, removePlayer, setGoalieStatus, setFairPlayCardStatus } from './masterRosterManager';
import {
  getMasterRoster as utilGetMasterRoster,
  addPlayerToRoster,
  updatePlayerInRoster,
  removePlayerFromRoster,
  setPlayerGoalieStatus,
  setPlayerFairPlayCardStatus
} from './masterRoster';
import type { Player } from '@/types';

jest.mock('./masterRoster');

const mockRoster: Player[] = [
  { id: '1', name: 'A', isGoalie: false, receivedFairPlayCard: false },
];

jest.mock('./logger', () => ({
  __esModule: true,
  default: { log: jest.fn(), warn: jest.fn(), error: jest.fn() }
}));

const mockedUtilGet = utilGetMasterRoster as jest.MockedFunction<typeof utilGetMasterRoster>;
const mockedAdd = addPlayerToRoster as jest.MockedFunction<typeof addPlayerToRoster>;
const mockedUpdate = updatePlayerInRoster as jest.MockedFunction<typeof updatePlayerInRoster>;
const mockedRemove = removePlayerFromRoster as jest.MockedFunction<typeof removePlayerFromRoster>;
const mockedSetGoalie = setPlayerGoalieStatus as jest.MockedFunction<typeof setPlayerGoalieStatus>;
const mockedSetFP = setPlayerFairPlayCardStatus as jest.MockedFunction<typeof setPlayerFairPlayCardStatus>;

beforeEach(() => {
  jest.resetAllMocks();
});

it('returns roster on success', async () => {
  mockedUtilGet.mockResolvedValue(mockRoster);
  await expect(getMasterRoster()).resolves.toEqual(mockRoster);
});

it('returns empty array on get error', async () => {
  mockedUtilGet.mockRejectedValue(new Error('fail'));
  const result = await getMasterRoster();
  expect(result).toEqual([]);
});

it('adds player via util', async () => {
  const player = mockRoster[0];
  mockedAdd.mockResolvedValue(player);
  await expect(addPlayer(player)).resolves.toBe(player);
});

it('returns null when add fails', async () => {
  mockedAdd.mockRejectedValue(new Error('err'));
  await expect(addPlayer(mockRoster[0])).resolves.toBeNull();
});

it('updates player via util', async () => {
  const player = mockRoster[0];
  mockedUpdate.mockResolvedValue(player);
  await expect(updatePlayer('1', { name: 'B' })).resolves.toBe(player);
});

it('returns null when update fails', async () => {
  mockedUpdate.mockRejectedValue(new Error('err'));
  await expect(updatePlayer('1', { name: 'B' })).resolves.toBeNull();
});

it('removes player via util', async () => {
  mockedRemove.mockResolvedValue(true);
  await expect(removePlayer('1')).resolves.toBe(true);
});

it('returns false when remove fails', async () => {
  mockedRemove.mockRejectedValue(new Error('err'));
  await expect(removePlayer('1')).resolves.toBe(false);
});

it('sets goalie via util', async () => {
  const player = mockRoster[0];
  mockedSetGoalie.mockResolvedValue(player);
  await expect(setGoalieStatus('1', true)).resolves.toBe(player);
});

it('returns null when set goalie fails', async () => {
  mockedSetGoalie.mockRejectedValue(new Error('err'));
  await expect(setGoalieStatus('1', true)).resolves.toBeNull();
});

it('sets fair play via util', async () => {
  const player = mockRoster[0];
  mockedSetFP.mockResolvedValue(player);
  await expect(setFairPlayCardStatus('1', true)).resolves.toBe(player);
});

it('returns null when set fair play fails', async () => {
  mockedSetFP.mockRejectedValue(new Error('err'));
  await expect(setFairPlayCardStatus('1', true)).resolves.toBeNull();
});
