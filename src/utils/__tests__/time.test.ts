import { formatTime } from '../time';

describe('time utility', () => {
  describe('formatTime', () => {
    it('should format seconds to MM:SS format', () => {
      expect(formatTime(0)).toBe('00:00');
      expect(formatTime(30)).toBe('00:30');
      expect(formatTime(60)).toBe('01:00');
      expect(formatTime(90)).toBe('01:30');
      expect(formatTime(3661)).toBe('61:01');
    });

    it('should handle negative numbers', () => {
      expect(formatTime(-30)).toBe('-01:30');
      expect(formatTime(-90)).toBe('-02:30');
    });

    it('should handle large numbers', () => {
      expect(formatTime(7200)).toBe('120:00');
      expect(formatTime(3723)).toBe('62:03');
    });

    it('should pad single digits correctly', () => {
      expect(formatTime(5)).toBe('00:05');
      expect(formatTime(65)).toBe('01:05');
      expect(formatTime(605)).toBe('10:05');
    });
  });
});