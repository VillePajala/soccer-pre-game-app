import logger from './logger';

export const sendBackupEmail = async (file: Blob, email: string): Promise<void> => {
  try {
    const formData = new FormData();
    formData.append('file', file, 'backup.json');
    formData.append('email', email);

    const res = await fetch('/api/send-backup', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`Server responded with ${res.status}`);
    }
  } catch (error) {
    logger.error('Failed to send backup email:', error);
    throw error;
  }
};

export default sendBackupEmail;
