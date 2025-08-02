import { RequestDebouncer } from './requestDebouncer';

describe('RequestDebouncer', () => {
  let debouncer: RequestDebouncer;

  beforeEach(() => {
    debouncer = new RequestDebouncer();
  });

  describe('constructor', () => {
    it('should create instance', () => {
      expect(debouncer).toBeDefined();
      expect(debouncer).toBeInstanceOf(RequestDebouncer);
    });
  });

  describe('debounce', () => {
    it('should be defined', () => {
      expect(typeof debouncer.debounce).toBe('function');
    });
  });

  describe('debouncedPlayerUpdate', () => {
    it('should be defined', () => {
      expect(typeof debouncer.debouncedPlayerUpdate).toBe('function');
    });
  });

  describe('debouncedGameSave', () => {
    it('should be defined', () => {
      expect(typeof debouncer.debouncedGameSave).toBe('function');
    });
  });

  describe('debouncedAutoSave', () => {
    it('should be defined', () => {
      expect(typeof debouncer.debouncedAutoSave).toBe('function');
    });
  });
});