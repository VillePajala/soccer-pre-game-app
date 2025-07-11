import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import AssessmentSlider from './AssessmentSlider';

describe('AssessmentSlider', () => {
  test('calls onChange when slider value changes', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<AssessmentSlider label="intensity" value={3} onChange={onChange} />);
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '4' } });
    expect(onChange).toHaveBeenCalled();
  });
});
