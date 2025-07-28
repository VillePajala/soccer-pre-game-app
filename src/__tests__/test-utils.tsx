import React from 'react';
import { render, RenderOptions, renderHook, RenderHookOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@/contexts/ToastProvider';

// Mock i18n for tests
const mockI18n = {
  t: (key: string, options?: any) => {
    const translations: { [key: string]: string } = {
      'common.dateFormat': 'dd.MM.yyyy',
      'common.timeFormat': 'HH:mm',
      'common.none': 'Ei mitään',
      'common.home': 'Koti',
      'common.away': 'Vieras',
      'common.edit': 'Muokkaa',
      'common.save': 'Tallenna',
      'common.cancel': 'Peruuta',
      'common.delete': 'Poista',
      'common.close': 'Sulje',
      'common.assist': 'Syöttö',
      'common.locale': 'fi-FI',
      'gameSettingsModal.title': 'Pelin asetukset',
      'gameSettingsModal.gameInfo': 'Pelin tiedot',
      'gameSettingsModal.teamName': 'Joukkueen nimi',
      'gameSettingsModal.opponentName': 'Vastustajan nimi',
      'gameSettingsModal.gameDateLabel': 'Pelin päivämäärä',
      'gameSettingsModal.gameTimeLabel': 'Pelin aika',
      'gameSettingsModal.locationLabel': 'Sijainti',
      'gameSettingsModal.homeOrAwayLabel': 'Koti / Vieras',
      'gameSettingsModal.periodsLabel': 'Erät',
      'gameSettingsModal.numPeriodsLabel': 'Erien määrä',
      'gameSettingsModal.periodDurationLabel': 'Erän kesto',
      'gameSettingsModal.playersHeader': 'Valitse pelaajat',
      'gameSettingsModal.selectPlayers': 'Select Players',
      'gameSettingsModal.playersSelected': 'valittu',
      'gameSettingsModal.notesTitle': 'Muistiinpanot',
      'gameSettingsModal.newSeasonNameRequired': 'Please enter a name for the new season.',
      'gameSettingsModal.newTournamentNameRequired': 'Please enter a name for the new tournament.',
      'gameSettingsModal.errorAddingSeason': 'Error adding season. Please try again.',
      'gameSettingsModal.errorAddingTournament': 'Error adding tournament. Please try again.',
      'gameStatsModal.invalidTimeFormat': 'Invalid time format. MM:SS',
      'gameStatsModal.scorerRequired': 'Scorer must be selected.',
      'gameStatsModal.confirmDeleteEvent': 'Are you sure you want to delete this event? This cannot be undone.',
      'gameStatsModal.titleCurrentGame': 'Ottelutilastot',
      'gameStatsModal.gameInfoTitle': 'Game Information',
      'gameStatsModal.tabs.currentGame': 'Nykyinen',
      'gameStatsModal.tabs.season': 'Kausi',
      'gameStatsModal.tabs.tournament': 'Turnaus',
      'gameStatsModal.tabs.overall': 'Kaikki',
      'gameStatsModal.tabs.player': 'Player',
      'gameStatsModal.goalLogTitle': 'Goal Log',
      'playerStats.totalsRow': 'Yhteensä',
    };
    return translations[key] || key;
  },
  language: 'fi',
  languages: ['fi', 'en'],
  exists: () => true,
  hasResourceBundle: () => true,
  on: () => {},
  off: () => {},
  isInitialized: true,
};

// Mock react-i18next hooks
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: mockI18n.t,
    i18n: mockI18n,
  }),
  I18nextProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock useErrorHandler hook
jest.mock('@/hooks/useErrorHandler', () => ({
  useErrorHandler: () => ({
    handleValidationError: jest.fn(),
    handleStorageError: jest.fn(),
    handleNetworkError: jest.fn(),
    handleGenericError: jest.fn(),
  }),
}));

interface AllTheProvidersProps {
  children: React.ReactNode;
}

const AllTheProviders: React.FC<AllTheProvidersProps> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        {children}
      </ToastProvider>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

const customRenderHook = <TProps, TResult>(
  hook: (props: TProps) => TResult,
  options?: Omit<RenderHookOptions<TProps>, 'wrapper'>
) => renderHook(hook, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render, customRenderHook as renderHook };

// Dummy test to prevent Jest from complaining about no tests
test('test utils should be available', () => {
  expect(customRender).toBeDefined();
});