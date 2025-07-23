// Mock for next/headers
export const cookies = jest.fn().mockImplementation(() => ({
  get: jest.fn().mockReturnValue({ value: 'mock-cookie-value' }),
  set: jest.fn(),
  delete: jest.fn(),
}));