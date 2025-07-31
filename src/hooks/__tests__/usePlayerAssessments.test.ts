import { renderHook, act } from '@testing-library/react';
import usePlayerAssessments, { validateAssessment } from '../usePlayerAssessments';
import { getPlayerAssessments, savePlayerAssessment, deletePlayerAssessment } from '@/utils/playerAssessments';
import type { AppState } from '@/types';

jest.mock('@/utils/playerAssessments');

const mockedGet = getPlayerAssessments as jest.MockedFunction<typeof getPlayerAssessments>;
const mockedSave = savePlayerAssessment as jest.MockedFunction<typeof savePlayerAssessment>;
const mockedDelete = deletePlayerAssessment as jest.MockedFunction<typeof deletePlayerAssessment>;

const assessment = {
  overall: 5,
  sliders: { intensity: 5, courage: 5, duels: 5, technique: 5, creativity: 5, decisions: 5, awareness: 5, teamwork: 5, fair_play: 5, impact: 5 },
  notes: '',
  minutesPlayed: 0,
  createdAt: 1,
  createdBy: 'me'
};

describe('usePlayerAssessments', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedSave.mockReset();
    mockedDelete.mockReset();
  });

  it('loads assessments', async () => {
    mockedGet.mockResolvedValue({ p1: assessment });
    const { result } = renderHook(() => usePlayerAssessments('g1'));
    await act(async () => {});
    expect(result.current.assessments.p1).toEqual(assessment);
  });

  it('saves assessment', async () => {
    mockedGet.mockResolvedValue({});
    mockedSave.mockResolvedValue({ assessments: { p1: assessment } } as unknown as AppState);
    const { result } = renderHook(() => usePlayerAssessments('g1'));
    await act(async () => {
      await result.current.saveAssessment('p1', assessment);
    });
    expect(mockedSave).toHaveBeenCalled();
    expect(result.current.assessments.p1).toEqual(assessment);
  });

  it('deletes assessment', async () => {
    mockedGet.mockResolvedValue({ p1: assessment });
    mockedDelete.mockResolvedValue({ assessments: {} } as AppState);
    const { result } = renderHook(() => usePlayerAssessments('g1'));
    await act(async () => {
      await result.current.deleteAssessment('p1');
    });
    expect(mockedDelete).toHaveBeenCalled();
    expect(result.current.assessments.p1).toBeUndefined();
  });
});

describe('validateAssessment', () => {
  it('validates ranges', () => {
    expect(validateAssessment(assessment)).toBe(true);
    expect(validateAssessment({ ...assessment, overall: 11 })).toBe(false);
    expect(validateAssessment({ ...assessment, sliders: { ...assessment.sliders, intensity: 0 } })).toBe(false);
    expect(validateAssessment({ ...assessment, sliders: { ...assessment.sliders, intensity: 11 } })).toBe(false);
  });
});
