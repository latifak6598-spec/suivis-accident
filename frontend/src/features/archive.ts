import { apiClient } from '../api/client';
import { useVehicleStore } from '../store/state';
import { AccidentData } from '../db/schema';

function applyAccMap(accMap: Record<string, AccidentData>) {
  useVehicleStore.getState().setAccMap(accMap);
}

export async function confirmArchive(code: string) {
  const res = await apiClient.post<{ accMap: Record<string, AccidentData> }>(
    `/vehicles/${encodeURIComponent(code)}/accidents/archive`,
    {}
  );
  if (res.accMap) applyAccMap(res.accMap);
}

export async function updateArchive(
  code: string,
  archiveId: string,
  data: { dateAccident: string; raisonDegat: string; note: string }
) {
  const res = await apiClient.patch<{ accMap: Record<string, AccidentData> }>(
    `/vehicles/${encodeURIComponent(code)}/archives/${archiveId}`,
    data
  );
  if (res.accMap) applyAccMap(res.accMap);
}

export async function deleteArchive(code: string, archiveId: string) {
  const res = await apiClient.delete<{ accMap: Record<string, AccidentData> }>(
    `/vehicles/${encodeURIComponent(code)}/archives/${archiveId}`
  );
  if (res.accMap) applyAccMap(res.accMap);
}

export async function restoreArchive(code: string, archiveId: string) {
  const res = await apiClient.post<{ accMap: Record<string, AccidentData> }>(
    `/vehicles/${encodeURIComponent(code)}/archives/${archiveId}/restore`,
    {}
  );
  if (res.accMap) applyAccMap(res.accMap);
}
