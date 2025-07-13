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

const buildEventDates = (gameDates?: string[], startDate?: string, endDate?: string): string[] => {
  if (gameDates && gameDates.length > 0) return gameDates;
  if (startDate && endDate) {
    const dates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  }
  return [];
};

const buildIcs = (
  name: string,
  location: string | undefined,
  notes: string | undefined,
  dates: string[]
): string => {
  const header = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];
  const events = dates.map((date, idx) => {
    const dt = date.replace(/-/g, '');
    return [
      'BEGIN:VEVENT',
      `UID:${Date.now()}_${idx}`,
      `SUMMARY:${name}`,
      `DTSTART;VALUE=DATE:${dt}`,
      location ? `LOCATION:${location}` : '',
      notes ? `DESCRIPTION:${notes.replace(/\n/g, '\\n')}` : '',
      'END:VEVENT'
    ].filter(Boolean).join('\r\n');
  });
  const footer = 'END:VCALENDAR';
  return [...header, ...events, footer].join('\r\n');
};

const createCalendar = (
  name: string,
  location: string | undefined,
  notes: string | undefined,
  dates: string[],
  filename: string
): void => {
  const ics = buildIcs(name, location, notes, dates);
  triggerDownload(ics, filename, 'text/calendar');
};

export const exportSeasonCalendar = (season: Season): void => {
  const dates = buildEventDates(season.gameDates, season.startDate, season.endDate);
  if (dates.length === 0) return;
  createCalendar(season.name, season.location, season.notes, dates, `season_${season.id}.ics`);
};

export const exportTournamentCalendar = (tournament: Tournament): void => {
  const dates = buildEventDates(tournament.gameDates, tournament.startDate, tournament.endDate);
  if (dates.length === 0) return;
  createCalendar(tournament.name, tournament.location, tournament.notes, dates, `tournament_${tournament.id}.ics`);
};

