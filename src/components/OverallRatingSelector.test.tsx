import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import OverallRatingSelector from './OverallRatingSelector';

describe('OverallRatingSelector', () => {
  it('calls onChange when a button is clicked', () => {
    const onChange = jest.fn();
    render(<OverallRatingSelector value={5} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    expect(onChange).toHaveBeenCalledWith(3);
  });
});
