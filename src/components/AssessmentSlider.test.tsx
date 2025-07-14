import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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

  it('supports custom min, max and step', () => {
    const onChange = jest.fn();
    render(
      <AssessmentSlider label="level" value={1} onChange={onChange} min={0.5} max={1.5} step={0.05} />
    );
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('min', '0.5');
    expect(slider).toHaveAttribute('max', '1.5');
    expect(slider).toHaveAttribute('step', '0.05');
    fireEvent.change(slider, { target: { value: '1.2' } });
    expect(onChange).toHaveBeenCalledWith(1.2);
  });

  it('applies reversed color when reverseColor is true', () => {
    render(
      <AssessmentSlider
        label="level"
        value={1.5}
        onChange={() => {}}
        min={0.5}
        max={1.5}
        step={0.05}
        reverseColor
      />
    );
    const slider = screen.getByRole('slider');
    expect(slider.style.accentColor).toBe('hsl(0, 70%, 50%)');
  });

});
