import { apiClient } from '../api/client';

export async function logAction(action: string, details: string = ''): Promise<void> {
  try {
    await apiClient.post('/logs', { action, details });
  } catch (error) {
    console.error('Failed to log action:', error);
  }
}
