import React, { useState } from 'react';
import { Modal, Button } from './UI';
import { Archive } from 'lucide-react';
import { Vehicle, AccidentData } from '../db/schema';

interface ZipExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: any) => void;
  vehicles: Vehicle[];
  accMap: Record<string, AccidentData>;
}

export const ZipExportModal: React.FC<ZipExportModalProps> = ({ isOpen, onClose, onExport, vehicles, accMap }) => {
  const [incC, setIncC] = useState(true);
  const [incI, setIncI] = useState(true);
  const [incA, setIncA] = useState(true);
  const [dfrom, setDfrom] = useState('');
  const [dto, setDto] = useState('');
  const [currentOnly, setCurrentOnly] = useState(false);
  const [includeExcelInside, setIncludeExcelInside] = useState(true);

  const handleExport = () => {
    onExport({
      incC,
      incI,
      incA,
      dfrom,
      dto,
      currentOnly,
      includeExcelInside
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="📦 Export ZIP global"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button 
            variant="primary" 
            onClick={handleExport} 
            className="gap-2 bg-gradient-to-r from-violet-600 to-blue-600 border-none hover:opacity-90"
          >
            <Archive className="w-4 h-4" />
            📦 Générer le ZIP
          </Button>
        </>
      }
    >
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
        
        <div className="bg-blue-500/10 border-l-4 border-blue-500 rounded-r-xl p-4">
          <p className="text-xs leading-relaxed text-gray-300">
            Le ZIP inclut la base SQLite complète (.db), les documents par véhicule,
            un fichier INFO.txt, un README d'export, et optionnellement un récapitulatif Excel.
          </p>
        </div>

        <div className="msec space-y-2">
          <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Options</h4>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
              <input type="checkbox" checked={currentOnly} onChange={e => setCurrentOnly(e.target.checked)} className="rounded border-gray-700 bg-gray-900 text-blue-500 focus:ring-blue-500/30" />
              Accident actuel uniquement (exclure les archives)
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
              <input type="checkbox" checked={includeExcelInside} onChange={e => setIncludeExcelInside(e.target.checked)} className="rounded border-gray-700 bg-gray-900 text-blue-500 focus:ring-blue-500/30" />
              Inclure un résumé Excel (RECAP.xlsx) à la racine du ZIP
            </label>
          </div>
        </div>

        <div className="msec space-y-2">
          <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Filtrer les véhicules</h4>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
              <input type="checkbox" checked={incC} onChange={e => setIncC(e.target.checked)} className="rounded border-gray-700 bg-gray-900 text-green-500 focus:ring-green-500/30" />
              ✓ Classé
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
              <input type="checkbox" checked={incI} onChange={e => setIncI(e.target.checked)} className="rounded border-gray-700 bg-gray-900 text-yellow-500 focus:ring-yellow-500/30" />
              ⚠ Incomplet
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
              <input type="checkbox" checked={incA} onChange={e => setIncA(e.target.checked)} className="rounded border-gray-700 bg-gray-900 text-red-500 focus:ring-red-500/30" />
              ✗ Besoin d'attention
            </label>
          </div>
        </div>

        <div className="msec space-y-2">
          <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Filtrer par date d'accident</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Du</label>
              <input type="date" value={dfrom} onChange={e => setDfrom(e.target.value)} className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500/20 outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Au</label>
              <input type="date" value={dto} onChange={e => setDto(e.target.value)} className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500/20 outline-none" />
            </div>
          </div>
        </div>

      </div>
    </Modal>
  );
};
