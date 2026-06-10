/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Modal, Button } from '../components/UI';
import { useVehicleStore } from '../store/state';
import { doExcelExport } from '../features/exportExcel';
import { useToast } from '../components/Toast';
import { 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight,
  Download
} from 'lucide-react';

interface ExportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportExcelModal: React.FC<ExportExcelModalProps> = ({ isOpen, onClose }) => {
  const [includeArchive, setIncludeArchive] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { filteredCache, accMap } = useVehicleStore();
  const { showToast } = useToast();

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await doExcelExport(filteredCache, accMap, includeArchive);
      showToast('Export Excel réussi', 'success');
      onClose();
    } catch (err) {
      showToast('Erreur lors de l\'export Excel', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Exporter vers Excel" size="md">
      <div className="space-y-8 p-2">
        <div className="flex items-center gap-6 p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
            <FileSpreadsheet className="w-8 h-8" />
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="text-lg font-bold text-emerald-100">Rapport de flotte</h3>
            <p className="text-xs text-emerald-200/60 leading-relaxed">
              Générez un fichier Excel contenant les données de {filteredCache.length} véhicules filtrés.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-900/50 border border-gray-800 rounded-xl hover:bg-gray-800/50 transition-all cursor-pointer select-none" onClick={() => setIncludeArchive(!includeArchive)}>
            <div className="flex items-center gap-4">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${includeArchive ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-700 bg-gray-950'}`}>
                {includeArchive && <CheckCircle2 className="w-4 h-4" />}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-200">Inclure les archives</p>
                <p className="text-[11px] text-gray-500 font-medium">Ajoute une feuille séparée pour l'historique des accidents</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-4 flex gap-4">
            <AlertCircle className="w-5 h-5 text-blue-400 shrink-0" />
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Le fichier contiendra toutes les colonnes de la base de données, ainsi que le statut actuel de chaque véhicule et les dates d'accidents.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
          <Button variant="ghost" onClick={onClose} className="px-6">Annuler</Button>
          <Button variant="primary" className="gap-2 px-8" onClick={handleExport} loading={isExporting}>
            <Download className="w-4 h-4" />
            Générer le fichier
          </Button>
        </div>
      </div>
    </Modal>
  );
};
