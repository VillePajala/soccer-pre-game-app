import React from 'react';
import { render, fireEvent, screen, act } from '@testing-library/react';
import { ToastProvider, useToast } from '../ToastProvider';

const TestComponent = () => {
  const { showToast } = useToast();
  return <button onClick={() => showToast('Saved!')}>Trigger</button>;
};

test('showToast displays and hides a toast message', () => {
  jest.useFakeTimers();
  render(
    <ToastProvider>
      <TestComponent />
    </ToastProvider>
  );

  fireEvent.click(screen.getByText('Trigger'));
  expect(screen.getByText('Saved!')).toBeInTheDocument();

  act(() => {
    jest.advanceTimersByTime(3000);
  });

  expect(screen.queryByText('Saved!')).not.toBeInTheDocument();
});
