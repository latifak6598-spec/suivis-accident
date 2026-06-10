import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FileText,
  Loader2,
  Maximize2,
} from 'lucide-react';
import { useDocumentViewer } from '../store/documentViewer';
import { fetchFileBlob } from '../features/files';

export const DocumentViewer: React.FC = () => {
  const { fileId, fileName, close } = useDocumentViewer();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const isOpen = !!fileId;

  const loadDocument = useCallback(async () => {
    if (!fileId) return;
    setLoading(true);
    setError('');
    setZoom(1);
    setRotation(0);

    try {
      const [meta, blob] = await Promise.all([
        fetch(`/api/files/${fileId}/meta`, { credentials: 'include' }).then((r) => r.json()),
        fetchFileBlob(fileId),
      ]);

      if (meta.error) throw new Error(meta.error);

      const url = URL.createObjectURL(blob);
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      setMimeType(meta.mimeType || blob.type);
      setDisplayName(meta.fileName || fileName || 'Document');
    } catch {
      setError('Impossible de charger le document');
    } finally {
      setLoading(false);
    }
  }, [fileId, fileName]);

  useEffect(() => {
    if (isOpen) loadDocument();
    return () => {
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [isOpen, loadDocument]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    if (isOpen) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, close]);

  const isImage = mimeType.startsWith('image/');
  const isPdf = mimeType === 'application/pdf';

  const handleDownload = () => {
    if (!blobUrl) return;
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = displayName;
    a.click();
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[8000] flex flex-col bg-[#05060a]/95 backdrop-blur-xl"
      >
        {/* Toolbar */}
        <div className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-gray-800/80 bg-[#0c0d12]/90">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-100 truncate">{displayName}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                {isPdf ? 'PDF' : isImage ? 'Image' : 'Document'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isImage && (
              <>
                <ToolbarBtn onClick={() => setZoom((z) => Math.min(z + 0.25, 4))} title="Zoom +">
                  <ZoomIn className="w-4 h-4" />
                </ToolbarBtn>
                <ToolbarBtn onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))} title="Zoom -">
                  <ZoomOut className="w-4 h-4" />
                </ToolbarBtn>
                <ToolbarBtn onClick={() => setRotation((r) => (r + 90) % 360)} title="Rotation">
                  <RotateCw className="w-4 h-4" />
                </ToolbarBtn>
                <ToolbarBtn onClick={() => setZoom(1)} title="Réinitialiser">
                  <Maximize2 className="w-4 h-4" />
                </ToolbarBtn>
              </>
            )}
            <ToolbarBtn onClick={handleDownload} title="Télécharger" disabled={!blobUrl}>
              <Download className="w-4 h-4" />
            </ToolbarBtn>
            <ToolbarBtn onClick={close} title="Fermer">
              <X className="w-4 h-4" />
            </ToolbarBtn>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-6">
          {loading && (
            <div className="flex flex-col items-center gap-4 text-gray-400">
              <Loader2 className="w-10 h-10 animate-spin text-blue-400" />
              <span className="text-sm font-medium">Chargement du document…</span>
            </div>
          )}

          {error && (
            <div className="text-center space-y-2">
              <p className="text-red-400 font-medium">{error}</p>
              <button onClick={loadDocument} className="text-sm text-blue-400 hover:underline">
                Réessayer
              </button>
            </div>
          )}

          {!loading && !error && blobUrl && isPdf && (
            <div className="w-full h-full max-w-5xl bg-gray-900 rounded-xl border border-gray-800 shadow-2xl overflow-hidden">
              <iframe
                src={blobUrl}
                title={displayName}
                className="w-full h-full min-h-[70vh] bg-white"
              />
            </div>
          )}

          {!loading && !error && blobUrl && isImage && (
            <div className="relative max-w-full max-h-full">
              <img
                src={blobUrl}
                alt={displayName}
                className="max-w-none rounded-lg shadow-2xl border border-gray-800 transition-transform duration-200"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center',
                }}
                draggable={false}
              />
            </div>
          )}

          {!loading && !error && blobUrl && !isPdf && !isImage && (
            <div className="text-center space-y-4 p-8 bg-gray-900/50 rounded-2xl border border-gray-800">
              <FileText className="w-16 h-16 text-gray-500 mx-auto" />
              <p className="text-gray-300">Aperçu non disponible pour ce type de fichier.</p>
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                Télécharger
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

const ToolbarBtn = ({
  children,
  onClick,
  title,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  disabled?: boolean;
}) => (
  <button
    type="button"
    title={title}
    disabled={disabled}
    onClick={onClick}
    className="p-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-40 transition-colors"
  >
    {children}
  </button>
);
