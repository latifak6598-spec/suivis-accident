import { apiClient } from '../api/client';
import { useVehicleStore } from '../store/state';
import { syncYears } from './filters';

export async function reloadFleetData() {
  const data = await apiClient.get<{ vehicles: unknown[]; accMap: Record<string, unknown> }>(
    '/vehicles'
  );
  useVehicleStore.getState().setVehicles(data.vehicles as never);
  useVehicleStore.getState().setAccMap(data.accMap as never);
  syncYears(data.accMap as never);
  return data;
}

export function isAppExpired(expiryDate: string): boolean {
  const today = new Date().toISOString().split('T')[0];
  return today > expiryDate;
}
