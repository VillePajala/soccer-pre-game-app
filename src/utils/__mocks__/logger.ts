const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
};

// Reset the mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

export default mockLogger;
