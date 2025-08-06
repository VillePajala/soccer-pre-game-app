// Mock for i18n module during tests
const i18nMock = {
  t: (key: string) => {
    // Return specific translations that tests expect
    const translations: Record<string, string> = {
      'fullBackup.exportSuccess': 'Varmuuskopio vietiin onnistuneesti.',
      'fullBackup.exportError': 'Virhe varmuuskopion viennissä',
      'fullBackup.restoreSuccess': 'Varmuuskopio palautettu. Sovellus latautuu uudelleen...',
      'fullBackup.restoreError': 'Virhe varmuuskopion',
      'fullBackup.restoreKeyError': 'Kohteen',
      'installPrompt.message': 'Asenna sovellus laitteellesi parempaa käyttökokemusta varten',
      'installPrompt.installButton': 'Asenna',
      'installPrompt.dismissButton': 'Ei nyt',
    };
    
    // For keys not in our map, check for partial matches
    if (translations[key]) {
      return translations[key];
    }
    
    // Check for partial key matches (for error messages)
    for (const [translationKey, value] of Object.entries(translations)) {
      if (key.includes(translationKey)) {
        return value;
      }
    }
    
    // Return the key itself if no translation found (default behavior)
    return key;
  },
  use: jest.fn().mockReturnThis(),
  init: jest.fn().mockResolvedValue(undefined),
  changeLanguage: jest.fn().mockResolvedValue(undefined),
  language: 'fi',
  isInitialized: true,
  hasResourceBundle: jest.fn().mockReturnValue(true),
  addResourceBundle: jest.fn(),
};

export const initReactI18next = {
  type: '3rdParty',
  init: jest.fn(),
};

export default i18nMock;