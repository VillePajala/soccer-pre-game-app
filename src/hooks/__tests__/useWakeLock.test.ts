import { renderHook, act } from '@testing-library/react';
import { useWakeLock } from '../useWakeLock';

describe('useWakeLock', () => {
  it('does nothing when not supported', async () => {
    Object.defineProperty(navigator, 'wakeLock', { value: undefined, configurable: true });
    const { result } = renderHook(() => useWakeLock());
    await act(async () => {
      await result.current.syncWakeLock(true);
    });
    expect(result.current.isWakeLockActive).toBe(false);
  });

  it('requests and releases wake lock when supported', async () => {
    const release = jest.fn().mockResolvedValue(undefined);
    const addEventListener = jest.fn();
    const removeEventListener = jest.fn();
    const request = jest.fn().mockResolvedValue({ 
      release, 
      addEventListener, 
      removeEventListener 
    });
    Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true });
    const { result } = renderHook(() => useWakeLock());

    await act(async () => {
      await result.current.syncWakeLock(true);
    });
    expect(request).toHaveBeenCalledWith('screen');

    await act(async () => {
      await result.current.syncWakeLock(false);
    });
    expect(release).toHaveBeenCalled();
  });
});
