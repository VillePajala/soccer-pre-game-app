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

});
