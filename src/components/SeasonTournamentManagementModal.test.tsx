import React from 'react';
import { render } from '@testing-library/react';
import SeasonTournamentManagementModal from './SeasonTournamentManagementModal';
import { UseMutationResult } from '@tanstack/react-query';
import { Season, Tournament } from '@/types';

const mockMutation = () => ({
  mutate: jest.fn(),
  isPending: false,
});

describe('SeasonTournamentManagementModal', () => {
  it('renders without crashing when open', () => {
    render(<SeasonTournamentManagementModal 
      isOpen={true} 
      onClose={() => {}} 
      seasons={[]} 
      tournaments={[]} 
      addSeasonMutation={mockMutation() as unknown as UseMutationResult<Season | null, Error, { name: string; }>} 
      addTournamentMutation={mockMutation() as unknown as UseMutationResult<Tournament | null, Error, { name: string; }>} 
    />);
  });

  it('does not render when closed', () => {
    const { container } = render(<SeasonTournamentManagementModal 
      isOpen={false} 
      onClose={() => {}} 
      seasons={[]} 
      tournaments={[]} 
      addSeasonMutation={mockMutation() as unknown as UseMutationResult<Season | null, Error, { name: string; }>} 
      addTournamentMutation={mockMutation() as unknown as UseMutationResult<Tournament | null, Error, { name: string; }>} 
    />);
    expect(container).toBeEmptyDOMElement();
  });
}); 