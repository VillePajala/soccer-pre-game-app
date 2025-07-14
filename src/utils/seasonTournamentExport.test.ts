import { exportSeasonsJson, exportTournamentsJson, importSeasonsJson, importTournamentsJson } from './seasonTournamentExport';
import type { Season, Tournament } from '@/types';

interface BlobWithText extends Blob { text: () => Promise<string>; }
const mockBlobStore: Record<string, BlobWithText> = {};

describe('season/tournament export utilities', () => {
  beforeAll(() => {
    window.URL.createObjectURL = jest.fn((blob: Blob): string => {
      const url = `blob:mock/${Math.random()}`;
      const b = blob as BlobWithText;
      b.text = async () => await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsText(blob);
      });
      mockBlobStore[url] = b;
      return url;
    });
    window.URL.revokeObjectURL = jest.fn((url: string) => { delete mockBlobStore[url]; });
    document.body.appendChild = jest.fn();
    document.body.removeChild = jest.fn();
    document.createElement = jest.fn((tag: string) => {
      const el = document.createElementNS('http://www.w3.org/1999/xhtml', tag);
      if (tag === 'a') {
        Object.defineProperty(el, 'click', { value: jest.fn() });
      }
      return el as unknown as HTMLElement;
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exports seasons as JSON', async () => {
    const seasons: Season[] = [{ id: 's1', name: 'Season 1' }];
    exportSeasonsJson(seasons);
    const blob = (window.URL.createObjectURL as jest.Mock).mock.calls[0][0] as BlobWithText;
    const text = await blob.text();
    expect(JSON.parse(text)).toEqual(seasons);
    const anchor = (document.createElement as jest.Mock).mock.results[0].value as HTMLAnchorElement;
    expect(anchor.download).toBe('seasons.json');
  });

  it('imports seasons from JSON', () => {
    const seasons: Season[] = [{ id: 's1', name: 'Season 1' }];
    expect(importSeasonsJson(JSON.stringify(seasons))).toEqual(seasons);
    expect(importSeasonsJson('bad json')).toBeNull();
  });

  it('exports tournaments as JSON', async () => {
    const tournaments: Tournament[] = [{ id: 't1', name: 'Tournament 1' }];
    exportTournamentsJson(tournaments);
    const blob = (window.URL.createObjectURL as jest.Mock).mock.calls[0][0] as BlobWithText;
    const text = await blob.text();
    expect(JSON.parse(text)).toEqual(tournaments);
    const anchor = (document.createElement as jest.Mock).mock.results[0].value as HTMLAnchorElement;
    expect(anchor.download).toBe('tournaments.json');
  });

  it('imports tournaments from JSON', () => {
    const tournaments: Tournament[] = [{ id: 't1', name: 'Tournament 1' }];
    expect(importTournamentsJson(JSON.stringify(tournaments))).toEqual(tournaments);
    expect(importTournamentsJson('bad')).toBeNull();
  });

});

