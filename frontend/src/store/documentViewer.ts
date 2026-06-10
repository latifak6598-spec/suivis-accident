import { create } from 'zustand';

interface DocumentViewerState {
  fileId: string | null;
  fileName: string;
  open: (fileId: string, fileName?: string) => void;
  close: () => void;
}

export const useDocumentViewer = create<DocumentViewerState>((set) => ({
  fileId: null,
  fileName: '',
  open: (fileId, fileName = '') => set({ fileId, fileName }),
  close: () => set({ fileId: null, fileName: '' }),
}));
