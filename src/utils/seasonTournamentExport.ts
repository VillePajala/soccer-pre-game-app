import type { Season, Tournament } from '@/types';

const triggerDownload = (data: string, filename: string, type: string): void => {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.download = filename;
  a.href = url;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportSeasonsJson = (seasons: Season[]): void => {
  const json = JSON.stringify(seasons, null, 2);
  triggerDownload(json, 'seasons.json', 'application/json');
};

export const exportTournamentsJson = (tournaments: Tournament[]): void => {
  const json = JSON.stringify(tournaments, null, 2);
  triggerDownload(json, 'tournaments.json', 'application/json');
};

export const importSeasonsJson = (json: string): Season[] | null => {
  try {
    const data = JSON.parse(json);
    return Array.isArray(data) ? (data as Season[]) : null;
  } catch {
    return null;
  }
};

export const importTournamentsJson = (json: string): Tournament[] | null => {
  try {
    const data = JSON.parse(json);
    return Array.isArray(data) ? (data as Tournament[]) : null;
  } catch {
    return null;
  }
};

