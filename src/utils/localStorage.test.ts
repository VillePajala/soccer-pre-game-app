import { getLocalStorageItem, setLocalStorageItem, removeLocalStorageItem, clearLocalStorage } from './localStorage';

describe('localStorage utilities', () => {
  const storageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
  } as unknown as Storage;

  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', { value: storageMock });
    storageMock.getItem.mockReset();
    storageMock.setItem.mockReset();
    storageMock.removeItem.mockReset();
    storageMock.clear.mockReset();
  });

  it('gets item', () => {
    storageMock.getItem.mockReturnValue('value');
    expect(getLocalStorageItem('key')).toBe('value');
  });

  it('sets item', () => {
    setLocalStorageItem('key', 'v');
    expect(storageMock.setItem).toHaveBeenCalledWith('key', 'v');
  });

  it('removes item', () => {
    removeLocalStorageItem('k');
    expect(storageMock.removeItem).toHaveBeenCalledWith('k');
  });

  it('clears storage', () => {
    clearLocalStorage();
    expect(storageMock.clear).toHaveBeenCalled();
  });
});
