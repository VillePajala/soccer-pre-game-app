import { sendBackupEmail } from './sendBackupEmail';

// Mock window.location
const originalLocation = window.location;
delete (window as unknown as { location?: Location }).location;
window.location = { href: '' } as unknown as Location;

const originalNavigatorShare = navigator.share;
const originalNavigatorCanShare = (navigator as Navigator & { canShare?: (data: unknown) => boolean }).canShare;

afterAll(() => {
  window.location = originalLocation;
  navigator.share = originalNavigatorShare;
  (navigator as Navigator & { canShare?: (data: unknown) => boolean }).canShare =
    originalNavigatorCanShare;
});

describe('sendBackupEmail', () => {
  beforeEach(() => {
    window.location.href = '';
    navigator.share = undefined as unknown as typeof navigator.share;
    (navigator as Navigator & { canShare?: (data: unknown) => boolean }).canShare =
      undefined;
  });

  it('uses Web Share API when available', async () => {
    const shareMock = jest.fn().mockResolvedValue(undefined);
    navigator.share = shareMock;
    (navigator as Navigator & { canShare?: (data: unknown) => boolean }).canShare =
      jest.fn(() => true);

    await sendBackupEmail('{"a":1}', 'test@example.com');

    expect(shareMock).toHaveBeenCalled();
    expect(window.location.href).toBe('');
  });

  it('falls back to mailto when share not supported', async () => {
    await sendBackupEmail('{"a":1}', 'user@example.com');

    expect(window.location.href).toContain('mailto:user%40example.com');
    expect(window.location.href).not.toContain('base64');
  });

  it('falls back to mailto when share throws', async () => {
    const shareMock = jest.fn().mockRejectedValue(new Error('fail'));
    navigator.share = shareMock;
    (navigator as Navigator & { canShare?: (data: unknown) => boolean }).canShare =
      jest.fn(() => true);

    await sendBackupEmail('{"a":1}', 'user2@example.com');

    expect(shareMock).toHaveBeenCalled();
    expect(window.location.href).toContain('mailto:user2%40example.com');
  });
});
