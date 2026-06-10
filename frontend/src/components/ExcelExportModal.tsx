import React, { useState, useEffect } from 'react';
import { Modal, Button } from './UI';
import { FileSpreadsheet } from 'lucide-react';
import { Vehicle, AccidentData } from '../db/schema';

interface ExcelExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: any) => void;
  vehicles: Vehicle[];
  accMap: Record<string, AccidentData>;
}

export const ExcelExportModal: React.FC<ExcelExportModalProps> = ({ isOpen, onClose, onExport, vehicles, accMap }) => {
  const [incC, setIncC] = useState(true);
  const [incI, setIncI] = useState(true);
  const [incA, setIncA] = useState(true);
  const [dfrom, setDfrom] = useState('');
  const [dto, setDto] = useState('');
  const [mon, setMon] = useState('');
  const [yr, setYr] = useState('');
  const [includeArchives, setIncludeArchives] = useState(false);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  useEffect(() => {
    const years = new Set<number>();
    for (const code in accMap) {
      const ds = accMap[code]?.current?.dateAccident;
      if (ds) {
        const y = new Date(ds).getFullYear();
        if (!isNaN(y)) years.add(y);
      }
    }
    setAvailableYears(Array.from(years).sort((a, b) => b - a));
  }, [accMap]);

  const handleExport = () => {
    onExport({
      incC,
      incI,
      incA,
      dfrom,
      dto,
      mon,
      yr,
      includeArchives
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="📊 Exporter récapitulatif Excel"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button 
            variant="success" 
            onClick={handleExport} 
            className="gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            ⬇ Télécharger Excel
          </Button>
        </>
      }
    >
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
        
        <div className="msec space-y-2">
          <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Statuts à inclure</h4>
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

        <div className="msec space-y-2">
          <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Période</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Mois</label>
              <select value={mon} onChange={e => setMon(e.target.value)} className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500/20 outline-none">
                <option value="">Tous les mois</option>
                <option value="1">Janvier</option>
                <option value="2">Février</option>
                <option value="3">Mars</option>
                <option value="4">Avril</option>
                <option value="5">Mai</option>
                <option value="6">Juin</option>
                <option value="7">Juillet</option>
                <option value="8">Août</option>
                <option value="9">Septembre</option>
                <option value="10">Octobre</option>
                <option value="11">Novembre</option>
                <option value="12">Décembre</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Année</label>
              <select value={yr} onChange={e => setYr(e.target.value)} className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500/20 outline-none">
                <option value="">Toutes les années</option>
                {availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="msec space-y-2">
          <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Accidents archivés</h4>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
            <input type="checkbox" checked={includeArchives} onChange={e => setIncludeArchives(e.target.checked)} className="rounded border-gray-700 bg-gray-900 text-blue-500 focus:ring-blue-500/30" />
            Inclure dans des feuilles séparées
          </label>
        </div>

      </div>
    </Modal>
  );
};
