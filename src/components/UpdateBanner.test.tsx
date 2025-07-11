import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import UpdateBanner from './UpdateBanner';

describe('UpdateBanner', () => {
  it('renders release notes when provided', () => {
    render(<UpdateBanner onUpdate={() => {}} notes="Some fixes" />);
    expect(screen.getByText('Some fixes')).toBeInTheDocument();
  });

  it('does not render notes when not provided', () => {
    render(<UpdateBanner onUpdate={() => {}} />);
    expect(screen.queryByText('Some fixes')).not.toBeInTheDocument();
  });
});
