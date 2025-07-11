import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import OverallRatingSelector from './OverallRatingSelector';

describe('OverallRatingSelector', () => {
  test('calls onChange with selected value', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<OverallRatingSelector value={null} onChange={onChange} />);
    const button = screen.getByRole('button', { name: '5' });
    await user.click(button);
    expect(onChange).toHaveBeenCalledWith(5);
  });
});
