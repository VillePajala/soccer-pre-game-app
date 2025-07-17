import { Buffer } from 'buffer';

const toBase64 = (data: string): string => {
  if (typeof window === 'undefined') {
    return Buffer.from(data, 'utf8').toString('base64');
  }
  return btoa(unescape(encodeURIComponent(data)));
};

export const sendBackupEmail = async (json: string, email: string): Promise<void> => {
  if (typeof window === 'undefined') {
    throw new Error('Email send not supported on server');
  }
  const filename = `SoccerApp_Backup_${new Date()
    .toISOString()
    .replace(/[:.]/g, '-')}.json`;
  const base64 = toBase64(json);
  const subject = encodeURIComponent(`Soccer App Backup - ${filename}`);
  const body = encodeURIComponent(base64);
  const url = `mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`;
  try {
    window.location.href = url;
  } catch {
    throw new Error('Email send failed');
  }
};
