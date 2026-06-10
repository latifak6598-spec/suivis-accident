import { apiClient } from '../api/client';
import { logAction } from './activityLog';
import { useVehicleStore } from '../store/state';
import { syncYears } from './filters';

export async function handleImport(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const data = await apiClient.upload<{
    vehicles: unknown[];
    accMap: Record<string, unknown>;
    added: number;
    updated: number;
  }>('/import/vehicles', formData);

  const { setVehicles, setAccMap } = useVehicleStore.getState();
  setVehicles(data.vehicles as never);
  setAccMap(data.accMap as never);
  syncYears(data.accMap as never);

  await logAction(
    'Import base de données',
    `Fichier: ${file.name}, traités: ${data.added + data.updated}`
  );
}
