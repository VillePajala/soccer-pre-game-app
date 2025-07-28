import { formatBytes } from '../bytes';

describe('bytes utility', () => {
  describe('formatBytes', () => {
    it('should format bytes to human readable format', () => {
      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(512)).toBe('512 B');
      expect(formatBytes(1024)).toBe('1.0 KB');
      expect(formatBytes(1048576)).toBe('1.0 MB');
      expect(formatBytes(1073741824)).toBe('1.0 GB');
    });

    it('should handle decimal places', () => {
      expect(formatBytes(1536)).toBe('1.5 KB');
      expect(formatBytes(1572864)).toBe('1.5 MB');
      expect(formatBytes(1610612736)).toBe('1.5 GB');
    });

    it('should handle very large numbers (GB max)', () => {
      expect(formatBytes(5368709120)).toBe('5.0 GB');
      expect(formatBytes(1099511627776)).toBe('1024.0 GB');
    });

    it('should handle small values correctly', () => {
      expect(formatBytes(1023)).toBe('1023 B');
      expect(formatBytes(1025)).toBe('1.0 KB');
    });

    it('should handle negative numbers', () => {
      expect(formatBytes(-512)).toBe('-512 B');
      expect(formatBytes(-1536)).toBe('-1.5 KB');
    });
  });
});