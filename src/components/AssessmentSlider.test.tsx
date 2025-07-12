import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import AssessmentSlider from './AssessmentSlider';

describe('AssessmentSlider', () => {
  it('calls onChange with the slider value', () => {
    const onChange = jest.fn();
    render(<AssessmentSlider label="test" value={3} onChange={onChange} />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('step', '0.5');
    fireEvent.change(slider, { target: { value: '4' } });
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('shows wheel picker on long press', () => {
    jest.useFakeTimers();
    const onChange = jest.fn();
    render(<AssessmentSlider label="test" value={3} onChange={onChange} />);
    const slider = screen.getByRole('slider');
    fireEvent.pointerDown(slider);
    act(() => {
      jest.advanceTimersByTime(600);
    });
    const picker = screen.getByTestId('wheel-picker');
    expect(picker).toBeInTheDocument();
    fireEvent.change(picker, { target: { value: '5.5' } });
    expect(onChange).toHaveBeenCalledWith(5.5);
  });
});
