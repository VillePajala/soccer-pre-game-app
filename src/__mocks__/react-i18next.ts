// Mock for react-i18next
import i18nMock from './i18n';

export const initReactI18next = {
  type: '3rdParty',
  init: jest.fn(),
};

export const useTranslation = () => ({
  t: i18nMock.t,
  i18n: i18nMock,
  ready: true,
});

export const Trans = ({ children }: { children: React.ReactNode }) => children;

export const I18nextProvider = ({ children }: { children: React.ReactNode }) => children;

export default {
  initReactI18next,
  useTranslation,
  Trans,
  I18nextProvider,
};