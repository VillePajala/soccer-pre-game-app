export const sendBackupEmail = async (json: string, email: string): Promise<void> => {
  if (typeof window === 'undefined') {
    throw new Error('Email send not supported on server');
  }

  const filename = `SoccerApp_Backup_${new Date()
    .toISOString()
    .replace(/[:.]/g, '-')}.json`;

  const file = new File([json], filename, { type: 'application/json' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: 'Soccer App Backup',
        text: 'Backup file attached',
      });
      return;
    } catch {
      // fall through to mailto fallback
    }
  }

  const subject = encodeURIComponent(`Soccer App Backup - ${filename}`);
  const body = encodeURIComponent('Backup file generated. Attach the downloaded file to this email.');
  const url = `mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`;
  try {
    window.location.href = url;
  } catch {
    throw new Error('Email send failed');
  }
};
