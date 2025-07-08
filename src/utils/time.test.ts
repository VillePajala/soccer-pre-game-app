import { formatTime } from './time';

describe('formatTime', () => {
  it('formats seconds to mm:ss', () => {
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(5)).toBe('00:05');
    expect(formatTime(65)).toBe('01:05');
  });
});
