import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { 
  useSeasonTournamentModalState,
  useSeasonTournamentModalWithHandlers
} from '../useSeasonTournamentModalState';
import { useUIStore } from '@/stores/uiStore';

// Mock dependencies
jest.mock('@/utils/logger');
jest.mock('@/stores/uiStore');

const mockUseUIStore = useUIStore as jest.MockedFunction<typeof useUIStore>;

// Mock store state
const mockStore = {
  modals: { seasonTournamentModal: false },
  openModal: jest.fn(),
  closeModal: jest.fn(),
};

describe('useSeasonTournamentModalState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mock store
    mockStore.modals.seasonTournamentModal = false;
    mockStore.openModal = jest.fn();
    mockStore.closeModal = jest.fn();
    
    // Setup useUIStore mock to handle selector pattern
    mockUseUIStore.mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector(mockStore);
      }
      return mockStore;
    });
  });

  it('should return closed state initially', () => {
    const { result } = renderHook(() => useSeasonTournamentModalState());

    expect(result.current.isOpen).toBe(false);
    expect(typeof result.current.open).toBe('function');
    expect(typeof result.current.close).toBe('function');
    expect(typeof result.current.toggle).toBe('function');
  });

  it('should open modal when open is called', () => {
    const { result } = renderHook(() => useSeasonTournamentModalState());
    
    act(() => {
      result.current.open();
    });
    
    expect(mockStore.openModal).toHaveBeenCalledWith('seasonTournamentModal');
  });

  it('should close modal when close is called', () => {
    // Set up modal as open
    mockStore.modals.seasonTournamentModal = true;
    
    const { result } = renderHook(() => useSeasonTournamentModalState());
    
    act(() => {
      result.current.close();
    });
    
    expect(mockStore.closeModal).toHaveBeenCalledWith('seasonTournamentModal');
  });

  it('should toggle modal state', () => {
    const { result } = renderHook(() => useSeasonTournamentModalState());
    
    // Start with closed modal, toggle should open
    act(() => {
      result.current.toggle();
    });
    
    expect(mockStore.openModal).toHaveBeenCalledWith('seasonTournamentModal');
    
    // Set up modal as open for second toggle
    mockStore.modals.seasonTournamentModal = true;
    
    const { result: result2 } = renderHook(() => useSeasonTournamentModalState());
    
    // Now toggle should close
    act(() => {
      result2.current.toggle();
    });
    
    expect(mockStore.closeModal).toHaveBeenCalledWith('seasonTournamentModal');
  });

  it('should return open state when modal is open', () => {
    // Set up modal as open
    mockStore.modals.seasonTournamentModal = true;
    
    const { result } = renderHook(() => useSeasonTournamentModalState());

    expect(result.current.isOpen).toBe(true);
  });
});

describe('useSeasonTournamentModalWithHandlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mock store
    mockStore.modals.seasonTournamentModal = false;
    mockStore.openModal = jest.fn();
    mockStore.closeModal = jest.fn();
    
    // Setup useUIStore mock
    mockUseUIStore.mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector(mockStore);
      }
      return mockStore;
    });
  });

  it('should provide modal state and handlers', () => {
    const { result } = renderHook(() => useSeasonTournamentModalWithHandlers());

    expect(result.current.isOpen).toBe(false);
    expect(typeof result.current.handleClose).toBe('function');
    expect(typeof result.current.handleOpen).toBe('function');
    expect(typeof result.current.handleToggle).toBe('function');
  });

  it('should call close when handleClose is called', () => {
    const { result } = renderHook(() => useSeasonTournamentModalWithHandlers());
    
    act(() => {
      result.current.handleClose();
    });
    
    expect(mockStore.closeModal).toHaveBeenCalledWith('seasonTournamentModal');
  });
});

