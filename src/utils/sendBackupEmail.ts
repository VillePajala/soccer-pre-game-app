export const sendBackupEmail = async (json: string, email: string): Promise<void> => {
  const filename = `SoccerApp_Backup_${new Date()
    .toISOString()
    .replace(/[:.]/g, '-')}.json`;
  const res = await fetch('/api/send-backup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, filename, content: btoa(json) }),
  });
  if (!res.ok) {
    throw new Error('Email send failed');
  }
};
