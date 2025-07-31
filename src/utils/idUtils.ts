export function normalizeRosterIds(input: unknown): string[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input
      .map(id => String(id).trim().replace(/^['"]|['"]$/g, ''))
      .filter(id => id !== '');
  }
  if (typeof input === 'string') {
    const trimmed = input.trim().replace(/^['"]|['"]$/g, '');
    return trimmed ? [trimmed] : [];
  }
  try {
    const parsed = JSON.parse(String(input));
    if (Array.isArray(parsed)) {
      return parsed
        .map((id: unknown) => String(id).trim().replace(/^['"]|['"]$/g, ''))
        .filter((id: string) => id !== '');
    }
  } catch {
    // ignore JSON parse errors
  }
  return [];
}
