import { apiClient } from '../api/client';
import { useVehicleStore } from '../store/state';

export async function uploadFile(
  file: File,
  code: string,
  accId: string,
  docKey: string
) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('vehicleCode', code);
  formData.append('docKey', docKey);
  if (accId !== 'current') {
    formData.append('accidentId', accId);
  }

  const response = await apiClient.upload<{
    fileId: number;
    fileName: string;
  }>('/files/upload', formData);

  const { accMap, setAccMap } = useVehicleStore.getState();
  const acc = accMap[code];
  if (!acc) return;

  const target =
    accId === 'current'
      ? acc.current
      : acc.archived.find((a) => a.archiveId === accId);

  if (target) {
    target.docs[docKey] = {
      uploaded: true,
      fileName: response.fileName,
      fileId: String(response.fileId),
    };
    setAccMap({ ...accMap, [code]: { ...acc } });
  }
}

export function viewFile(fileId: string, fileName?: string) {
  import('../store/documentViewer').then(({ useDocumentViewer }) => {
    useDocumentViewer.getState().open(fileId, fileName);
  });
}

export async function delFile(code: string, accId: string, docKey: string) {
  await apiClient.delete('/files', {
    vehicleCode: code,
    docKey,
    ...(accId !== 'current' ? { accidentId: Number(accId) } : {}),
  });

  const { accMap, setAccMap } = useVehicleStore.getState();
  const acc = accMap[code];
  if (!acc) return;

  const target =
    accId === 'current'
      ? acc.current
      : acc.archived.find((a) => a.archiveId === accId);

  if (target) {
    target.docs[docKey] = { uploaded: false, fileName: null, fileId: null };
    setAccMap({ ...accMap, [code]: { ...acc } });
  }
}

export async function fetchFileBlob(fileId: string): Promise<Blob> {
  const res = await fetch(`/api/files/${fileId}/download`, { credentials: 'include' });
  if (!res.ok) throw new Error('Download failed');
  return res.blob();
}
