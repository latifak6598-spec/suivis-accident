import React, { useState, useRef } from 'react';
import { DocConstant, DocEntry } from '../db/schema';
import { uploadFile, viewFile, delFile } from '../features/files';
import { useAuthStore } from '../store/state';
import { useToast } from '../components/Toast';
import { ConfirmModal } from '../components/ConfirmModal';
import {
  Upload,
  Eye,
  Trash2,
  FileCheck,
  Loader2,
} from 'lucide-react';
import { cn } from '../components/UI';

interface DocSlotProps {
  code: string;
  accId: string;
  doc: DocConstant;
  docData?: DocEntry;
  readOnly?: boolean;
}

export const DocSlot: React.FC<DocSlotProps> = ({ code, accId, doc, docData, readOnly }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const isAdmin = useAuthStore((s) => s.currentUser?.role === 'admin');
  const canModify = !readOnly;
  const canDelete = isAdmin && canModify;

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    try {
      await uploadFile(file, code, accId, doc.key);
      showToast('Document uploadé avec succès', 'success');
    } catch (err) {
      showToast('Erreur lors de l\'upload', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = '';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!canModify) return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const onView = () => {
    if (docData?.fileId) {
      viewFile(docData.fileId, docData.fileName ?? undefined);
    }
  };

  const onDelete = async () => {
    try {
      await delFile(code, accId, doc.key);
      showToast('Document supprimé', 'success');
    } catch (err) {
      showToast('Erreur lors de la suppression', 'error');
    } finally {
      setShowConfirmDelete(false);
    }
  };

  const isUploaded = docData?.uploaded;

  return (
    <>
      <div
        className={cn(
          'relative group h-24 rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center p-2 text-center overflow-hidden',
          isUploaded
            ? 'bg-emerald-500/5 border-emerald-500/30 text-emerald-100'
            : 'bg-gray-900/50 border-dashed border-gray-800 text-gray-400 hover:border-blue-500/50 hover:bg-blue-500/5',
          isDragOver && canModify && 'border-blue-500 bg-blue-500/10 scale-105 z-10',
          !canModify && 'cursor-default'
        )}
        onDragOver={(e) => {
          e.preventDefault();
          if (canModify) setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={onDrop}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Upload...</span>
          </div>
        ) : isUploaded ? (
          <>
            <div className="flex flex-col items-center gap-1.5 w-full">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <FileCheck className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest truncate w-full px-2">
                {doc.label}
              </span>
              <span className="text-[9px] text-emerald-500 font-mono truncate w-full px-2">
                {docData.fileName}
              </span>
            </div>

            <div className="absolute inset-0 bg-gray-900/90 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={onView}
                className="p-2 rounded-full bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white transition-all"
              >
                <Eye className="w-4 h-4" />
              </button>
              {canDelete && (
                <button
                  onClick={() => setShowConfirmDelete(true)}
                  className="p-2 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </>
        ) : (
          <div
            className={cn(
              'flex flex-col items-center gap-1.5',
              canModify ? 'cursor-pointer' : 'cursor-default'
            )}
            onClick={() => canModify && fileInputRef.current?.click()}
          >
            <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-gray-500 group-hover:text-blue-400 group-hover:bg-blue-500/10 transition-all">
              <Upload className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest">{doc.label}</span>
            {canModify && (
              <input type="file" ref={fileInputRef} onChange={onFileChange} className="hidden" />
            )}
          </div>
        )}
      </div>

      {canDelete && (
        <ConfirmModal
          isOpen={showConfirmDelete}
          onClose={() => setShowConfirmDelete(false)}
          onConfirm={onDelete}
          title="Supprimer le document"
          message={`Voulez-vous vraiment supprimer le document "${doc.label}" ? Cette action est irréversible.`}
          confirmText="Supprimer"
          variant="danger"
        />
      )}
    </>
  );
};
