import React from 'react';
import { render, fireEvent, screen, act } from '@testing-library/react';
import { ToastProvider, useToast } from '../ToastProvider';

const TestComponent = () => {
  const { showToast } = useToast();
  return (
    <>
      <button onClick={() => showToast('Saved!', 'success')}>Success</button>
      <button onClick={() => showToast('Error!', 'error')}>Error</button>
    </>
  );
};

test('showToast displays and hides a toast message', () => {
  jest.useFakeTimers();
  render(
    <ToastProvider>
      <TestComponent />
    </ToastProvider>
  );

  fireEvent.click(screen.getByText('Success'));
  expect(screen.getByText('Saved!')).toHaveClass('bg-green-600');

  fireEvent.click(screen.getByText('Error'));
  expect(screen.getByText('Error!')).toHaveClass('bg-red-600');

  act(() => {
    jest.advanceTimersByTime(3000);
  });

  expect(screen.queryByText('Saved!')).not.toBeInTheDocument();
  expect(screen.queryByText('Error!')).not.toBeInTheDocument();
});
