import { normalizeRosterIds } from './idUtils';

describe('idUtils', () => {
  describe('normalizeRosterIds', () => {
    it('should handle null and undefined input', () => {
      expect(normalizeRosterIds(null)).toEqual([]);
      expect(normalizeRosterIds(undefined)).toEqual([]);
    });

    it('should handle empty array input', () => {
      expect(normalizeRosterIds([])).toEqual([]);
    });

    it('should handle array input with valid IDs', () => {
      expect(normalizeRosterIds(['id1', 'id2', 'id3'])).toEqual(['id1', 'id2', 'id3']);
    });

    it('should handle array input with quoted IDs', () => {
      expect(normalizeRosterIds(['"id1"', "'id2'", 'id3'])).toEqual(['id1', 'id2', 'id3']);
    });

    it('should handle array input with empty strings and whitespace', () => {
      expect(normalizeRosterIds(['id1', '', '  ', 'id2', '""', "''"])).toEqual(['id1', 'id2']);
    });

    it('should handle array input with mixed types', () => {
      expect(normalizeRosterIds(['id1', 123, true, 'id2'])).toEqual(['id1', '123', 'true', 'id2']);
    });

    it('should handle string input', () => {
      expect(normalizeRosterIds('single-id')).toEqual(['single-id']);
    });

    it('should handle quoted string input', () => {
      expect(normalizeRosterIds('"quoted-id"')).toEqual(['quoted-id']);
      expect(normalizeRosterIds("'quoted-id'")).toEqual(['quoted-id']);
    });

    it('should handle empty string input', () => {
      expect(normalizeRosterIds('')).toEqual([]);
      expect(normalizeRosterIds('   ')).toEqual([]);
      expect(normalizeRosterIds('""')).toEqual([]);
      expect(normalizeRosterIds("''")).toEqual([]);
    });

    it('should handle JSON-like string input (treated as string)', () => {
      // Strings are NOT parsed as JSON, they are returned as single element arrays
      expect(normalizeRosterIds('["id1", "id2", "id3"]')).toEqual(['["id1", "id2", "id3"]']);
    });

    it('should handle various string inputs', () => {
      expect(normalizeRosterIds('["id1", "id2"]')).toEqual(['["id1", "id2"]']);
      expect(normalizeRosterIds('invalid-json')).toEqual(['invalid-json']);
      expect(normalizeRosterIds('{"not": "array"}')).toEqual(['{"not": "array"}']);
    });

    it('should handle non-string, non-array input via JSON.parse', () => {
      // Non-string inputs get stringified then JSON.parsed
      expect(normalizeRosterIds(123)).toEqual([]);
      expect(normalizeRosterIds(true)).toEqual([]);
      expect(normalizeRosterIds(false)).toEqual([]);
      expect(normalizeRosterIds({ key: 'value' })).toEqual([]);
    });

    it('should handle malformed input (treated as string)', () => {
      expect(normalizeRosterIds('malformed-json')).toEqual(['malformed-json']);
      expect(normalizeRosterIds('id1", "id2"]')).toEqual(['id1", "id2"]']);
    });

    it('should handle edge cases with JSON parsing', () => {
      // Simulate input that might be parsed successfully
      const validArrayAsObject = JSON.stringify(['id1', 'id2']); // This creates a string
      expect(normalizeRosterIds(validArrayAsObject)).toEqual([validArrayAsObject]); // Treated as string
    });
  });
});