/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArchivedRecord } from '../db/schema';
import { DOCS } from '../features/status';
import { DocSlot } from './DocSlot';
import { fmtDate, fmtDateTime } from '../utils/fmtDate';
import { deleteArchive, restoreArchive, updateArchive } from '../features/archive';
import { useToast } from '../components/Toast';
import { ConfirmModal } from '../components/ConfirmModal';
import { 
  ChevronDown, 
  Package, 
  Calendar, 
  Info, 
  FileText, 
  Clock,
  Trash2,
  RotateCcw,
  Save,
  X
} from 'lucide-react';
import { Badge, Button } from '../components/UI';
import { useAuthStore } from '../store/state';

interface ArchiveItemProps {
  code: string;
  archivedRecord: ArchivedRecord;
  index: number;
}

export const ArchiveItem: React.FC<ArchiveItemProps> = ({ code, archivedRecord, index }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const { showToast } = useToast();
  const isAdmin = useAuthStore((s) => s.currentUser?.role === 'admin');

  const [editData, setEditData] = useState({
    dateAccident: archivedRecord.dateAccident,
    raisonDegat: archivedRecord.raisonDegat,
    note: archivedRecord.note
  });

  const uploadedCount = Object.values(archivedRecord.docs).filter((d: any) => d.uploaded).length;

  const handleSave = async () => {
    try {
      await updateArchive(code, archivedRecord.archiveId, editData);
      showToast('Archive mise à jour', 'success');
      setIsEditing(false);
    } catch (err) {
      showToast('Erreur lors de la mise à jour', 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteArchive(code, archivedRecord.archiveId);
      showToast('Archive supprimée', 'success');
    } catch (err) {
      showToast('Erreur lors de la suppression', 'error');
    }
  };

  const handleRestore = async () => {
    try {
      await restoreArchive(code, archivedRecord.archiveId);
      showToast('Archive restaurée', 'success');
    } catch (err) {
      showToast('Erreur lors de la restauration', 'error');
    }
  };

  return (
    <div className="bg-gray-900/30 border border-gray-800 rounded-xl overflow-hidden transition-all">
      <div 
        className="flex items-center px-4 py-3 cursor-pointer select-none gap-4 hover:bg-gray-800/30 transition-colors"
        onClick={() => !isEditing && setIsOpen(!isOpen)}
      >
        <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
          <Package className="w-4 h-4" />
        </div>

        <div className="flex-1 flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-gray-200">{fmtDate(archivedRecord.dateAccident)}</span>
            <span className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">Date accident</span>
          </div>
          
          <div className="w-px h-6 bg-gray-800" />

          <div className="flex flex-col">
            <span className="text-xs font-bold text-gray-200">{uploadedCount}/6 docs</span>
            <span className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">Documents</span>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2 text-[10px] text-gray-500 font-medium uppercase tracking-widest bg-gray-800/50 px-3 py-1 rounded-full border border-gray-700">
            <Clock className="w-3 h-3" />
            Archivé le {fmtDateTime(archivedRecord.archivedAt)}
          </div>
        </div>

        <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform duration-300 ${isOpen ? 'rotate-180 text-purple-400' : ''}`} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 pb-4 pt-2 border-t border-gray-800/50 space-y-4">
              <div className="flex items-center justify-between">
                <h5 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Détails de l'archive</h5>
                <div className="flex items-center gap-2">
                  {!isEditing ? (
                    <>
                      <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1.5" onClick={() => setIsEditing(true)}>
                        Modifier
                      </Button>
                      {isAdmin && (
                        <>
                          <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => setShowDeleteConfirm(true)}>
                            <Trash2 className="w-3 h-3" />
                            Supprimer
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10" onClick={() => setShowRestoreConfirm(true)}>
                            <RotateCcw className="w-3 h-3" />
                            Restaurer
                          </Button>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1.5" onClick={() => setIsEditing(false)}>
                        <X className="w-3 h-3" />
                        Annuler
                      </Button>
                      <Button variant="primary" size="sm" className="h-7 text-[10px] gap-1.5" onClick={handleSave}>
                        <Save className="w-3 h-3" />
                        Enregistrer
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-900/50 rounded-lg p-3 space-y-1">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    <Calendar className="w-3 h-3" />
                    Date de l'accident
                  </div>
                  {isEditing ? (
                    <input 
                      type="date" 
                      value={editData.dateAccident} 
                      onChange={e => setEditData({...editData, dateAccident: e.target.value})}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white outline-none focus:ring-1 focus:ring-blue-500/50"
                    />
                  ) : (
                    <p className="text-xs text-gray-200">{fmtDate(archivedRecord.dateAccident)}</p>
                  )}
                </div>
                <div className="bg-gray-900/50 rounded-lg p-3 space-y-1">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    <Info className="w-3 h-3" />
                    Raison du dégât
                  </div>
                  {isEditing ? (
                    <input 
                      type="text" 
                      value={editData.raisonDegat} 
                      onChange={e => setEditData({...editData, raisonDegat: e.target.value})}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white outline-none focus:ring-1 focus:ring-blue-500/50"
                    />
                  ) : (
                    <p className="text-xs text-gray-200">{archivedRecord.raisonDegat || 'Non spécifiée'}</p>
                  )}
                </div>
                <div className="bg-gray-900/50 rounded-lg p-3 space-y-1">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    <FileText className="w-3 h-3" />
                    Notes
                  </div>
                  {isEditing ? (
                    <textarea 
                      value={editData.note} 
                      onChange={e => setEditData({...editData, note: e.target.value})}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white outline-none focus:ring-1 focus:ring-blue-500/50 resize-none h-12"
                    />
                  ) : (
                    <p className="text-xs text-gray-200">{archivedRecord.note || 'Aucune note'}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {DOCS.map(doc => (
                  <DocSlot 
                    key={doc.key}
                    code={code}
                    accId={archivedRecord.archiveId}
                    doc={doc}
                    docData={archivedRecord.docs[doc.key]}
                    readOnly={!isEditing}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal 
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Supprimer l'archive"
        message="Voulez-vous vraiment supprimer cette archive ? Tous les documents associés seront définitivement supprimés."
        confirmText="Supprimer"
        variant="danger"
      />

      <ConfirmModal 
        isOpen={showRestoreConfirm}
        onClose={() => setShowRestoreConfirm(false)}
        onConfirm={handleRestore}
        title="Restaurer l'archive"
        message="Voulez-vous restaurer cet accident comme accident actuel ? L'accident actuel sera écrasé (pensez à l'archiver d'abord si vous voulez le conserver)."
        confirmText="Restaurer"
        variant="warning"
      />
    </div>
  );
};
