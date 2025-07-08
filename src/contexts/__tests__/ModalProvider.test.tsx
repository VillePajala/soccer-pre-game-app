import { renderHook, act } from '@testing-library/react';
import { ModalProvider, useModalContext } from '../ModalProvider';
import React from 'react';

test('modal context toggles state', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ModalProvider>{children}</ModalProvider>
  );
  const { result } = renderHook(() => useModalContext(), { wrapper });

  act(() => {
    result.current.setIsGameSettingsModalOpen(true);
  });

  expect(result.current.isGameSettingsModalOpen).toBe(true);
});

test('modals operate independently when opened sequentially', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ModalProvider>{children}</ModalProvider>
  );
  const { result } = renderHook(() => useModalContext(), { wrapper });

  act(() => {
    result.current.setIsGameSettingsModalOpen(true);
    result.current.setIsLoadGameModalOpen(true);
  });

  expect(result.current.isGameSettingsModalOpen).toBe(true);
  expect(result.current.isLoadGameModalOpen).toBe(true);

  act(() => {
    result.current.setIsGameSettingsModalOpen(false);
    result.current.setIsRosterModalOpen(true);
  });

  expect(result.current.isGameSettingsModalOpen).toBe(false);
  expect(result.current.isLoadGameModalOpen).toBe(true);
  expect(result.current.isRosterModalOpen).toBe(true);
});
