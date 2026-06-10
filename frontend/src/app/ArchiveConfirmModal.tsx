/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Modal, Button } from '../components/UI';
import { useUIStore } from '../store/state';
import { confirmArchive } from '../features/archive';
import { useToast } from '../components/Toast';
import { 
  Archive, 
  AlertTriangle, 
  History, 
  ChevronRight,
  ShieldAlert
} from 'lucide-react';

export const ArchiveConfirmModal: React.FC = () => {
  const { pendingArchiveCode, setPendingArchiveCode } = useUIStore();
  const [isArchiving, setIsArchiving] = useState(false);
  const { showToast } = useToast();

  const handleArchive = async () => {
    if (!pendingArchiveCode) return;
    setIsArchiving(true);
    try {
      await confirmArchive(pendingArchiveCode);
      showToast('Accident archivé avec succès', 'success');
      setPendingArchiveCode(null);
    } catch (err) {
      showToast('Erreur lors de l\'archvage', 'error');
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <Modal 
      isOpen={!!pendingArchiveCode} 
      onClose={() => setPendingArchiveCode(null)} 
      title="Confirmer l'archivage" 
      size="md"
    >
      <div className="space-y-8 p-2">
        <div className="flex items-center gap-6 p-6 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
            <Archive className="w-8 h-8" />
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="text-lg font-bold text-amber-100">Archivage de l'accident</h3>
            <p className="text-xs text-amber-200/60 leading-relaxed">
              Vous êtes sur le point de déplacer l'accident actuel vers l'historique.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 flex gap-4">
            <History className="w-5 h-5 text-blue-400 shrink-0" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-gray-200">Ce qui va se passer :</p>
              <ul className="space-y-2 pt-2">
                <li className="flex items-start gap-2 text-[11px] text-gray-400">
                  <ChevronRight className="w-3 h-3 text-blue-500 mt-0.5" />
                  L'accident actuel sera enregistré dans l'historique (archives).
                </li>
                <li className="flex items-start gap-2 text-[11px] text-gray-400">
                  <ChevronRight className="w-3 h-3 text-blue-500 mt-0.5" />
                  Tous les documents associés seront liés à cette archive.
                </li>
                <li className="flex items-start gap-2 text-[11px] text-gray-400">
                  <ChevronRight className="w-3 h-3 text-blue-500 mt-0.5" />
                  Un nouvel accident vide sera créé pour ce véhicule.
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 flex gap-4">
            <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-[11px] text-red-200/60 leading-relaxed">
              Cette action est irréversible. Assurez-vous que toutes les informations sont correctes avant de confirmer.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
          <Button variant="ghost" onClick={() => setPendingArchiveCode(null)} className="px-6">Annuler</Button>
          <Button variant="primary" className="gap-2 px-8 bg-amber-600 hover:bg-amber-500 border-amber-600" onClick={handleArchive} loading={isArchiving}>
            <Archive className="w-4 h-4" />
            Confirmer l'archivage
          </Button>
        </div>
      </div>
    </Modal>
  );
};
