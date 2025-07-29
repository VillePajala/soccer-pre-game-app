// Mock implementation for SessionManager
export const sessionManager = {
  initialize: jest.fn(),
  recordActivity: jest.fn(),
  cleanup: jest.fn(),
  extendSession: jest.fn(),
  getSessionInfo: jest.fn(() => ({
    isActive: false,
    lastActivity: undefined,
    sessionStart: undefined,
  })),
  onSessionEvent: jest.fn(() => () => {}), // Return cleanup function
};