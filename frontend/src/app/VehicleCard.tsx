/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Vehicle, AccidentData } from '../db/schema';
import { useVehicleStore } from '../store/state';
import { DocSlot } from './DocSlot';
import { ArchiveItem } from './ArchiveItem';
import { ZipProgressOverlay } from './ZipProgressOverlay';
import { apiClient } from '../api/client';
import { getStatus, getMissing, DOCS } from '../features/status';
import { fmtDate } from '../utils/fmtDate';
import { 
  ChevronDown, 
  Car, 
  MapPin, 
  Calendar, 
  Info, 
  FileText, 
  Archive, 
  Save, 
  Package,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  MoreVertical
} from 'lucide-react';
import { Button, Badge, Spinner } from '../components/UI';
import { useToast } from '../components/Toast';

const FIELDS: [keyof Vehicle, string][] = [
  ['CODE','Code'],['NEW_CODE','Nouveau code'],['DESIGNATION','Désignation'],
  ['MARQUE','Marque'],['MATRICULE','Immatricule'],['CAPACITE','Capacité'],
  ['CAPACITE_INDIVIDUELLE','Cap. individuelle'],['TYPE','Type'],['REGION','Région'],
  ['NUM_SERIE','N° Série'],['ETAT','État'],['AFFECTATION','Affectation'],
  ['LIBELLE_AFFECTATION','Libellé affectation'],['DATE_AFFECTATION','Date affectation'],
  ['DATE_ACHAT',"Date d'achat"],['AGE_ANNEE_','Âge (années)'],
  ['AGE_MOIS_','Âge (mois)'],['PRIX_ACHAT',"Prix d'achat"],['DUREE_VIE','Durée de vie'],
];

import { ConfirmModal } from '../components/ConfirmModal';

export const VehicleCard = React.memo(({ vehicle }: { vehicle: Vehicle }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { accMap, setAccMap } = useVehicleStore();
  const { showToast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const [zipMessage, setZipMessage] = useState('');

  const acc = accMap ? accMap[vehicle.CODE] : undefined;
  const status = useMemo(() => getStatus(vehicle.CODE, accMap), [vehicle.CODE, accMap]);
  const missing = useMemo(() => getMissing(vehicle.CODE, accMap), [vehicle.CODE, accMap]);

  const handleToggle = useCallback(async () => {
    setIsOpen(!isOpen);
  }, [isOpen]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (acc?.current) {
        await apiClient.post(`/vehicles/${vehicle.CODE}/accidents/current`, {
          dateAccident: acc.current.dateAccident,
          raisonDegat: acc.current.raisonDegat,
          note: acc.current.note
        });
      }
      showToast('Modifications enregistrées', 'success');
    } catch (err) {
      showToast('Erreur lors de l\'enregistrement', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = async () => {
    setIsArchiving(true);
    try {
      const res = await apiClient.post<{ accMap: Record<string, unknown> }>(
        `/vehicles/${encodeURIComponent(vehicle.CODE)}/accidents/archive`,
        {}
      );
      if (res.accMap) setAccMap(res.accMap as never);
      showToast('Accident archivé avec succès', 'success');
      setShowArchiveConfirm(false);
    } catch (err) {
      showToast('Erreur lors de l\'archivage', 'error');
    } finally {
      setIsArchiving(false);
    }
  };

  const handleZip = async () => {
    setIsZipping(true);
    setZipProgress(0);
    setZipMessage('Préparation...');
    try {
      const { doVehicleZip } = await import('../features/exportZip');
      await doVehicleZip(vehicle, accMap, (percent, msg) => {
        setZipMessage(msg);
        setZipProgress(percent);
      });
      showToast('ZIP généré', 'success');
    } catch (err) {
      showToast('Erreur lors de l\'export ZIP', 'error');
    } finally {
      setIsZipping(false);
    }
  };

  const updateCurrent = (field: string, value: string) => {
    if (!acc) return;
    const newAcc = { 
      ...acc, 
      current: { ...(acc.current || {}), [field]: value } 
    } as AccidentData;
    setAccMap({ ...accMap, [vehicle.CODE]: newAcc });
    
    // Debounced silent save
    if ((window as any).saveTimeout) clearTimeout((window as any).saveTimeout);
    (window as any).saveTimeout = setTimeout(async () => {
       try {
         await apiClient.post(`/vehicles/${vehicle.CODE}/accidents/current`, {
            dateAccident: newAcc.current.dateAccident,
            raisonDegat: newAcc.current.raisonDegat,
            note: newAcc.current.note
          });
       } catch(e) {}
    }, 1000);
  };

  const statusColors = {
    c: 'border-l-emerald-500',
    i: 'border-l-red-500',
    a: 'border-l-amber-500'
  };

  const statusIcons = {
    c: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
    i: <HelpCircle className="w-4 h-4 text-red-500" />,
    a: <AlertCircle className="w-4 h-4 text-amber-500" />
  };

  const statusLabels = {
    c: 'Classé',
    i: 'Incomplet',
    a: 'Besoin d\'attention'
  };

  return (
    <div className={`bg-[#16171d] border border-gray-800 rounded-xl overflow-hidden transition-all duration-300 border-l-4 ${statusColors[status]} ${isOpen ? 'shadow-2xl shadow-black/50 ring-1 ring-blue-500/20' : 'hover:bg-[#1c1d25]'}`}>
      {/* Header */}
      <div 
        className="flex items-center px-6 py-4 cursor-pointer select-none gap-4"
        onClick={handleToggle}
      >
        <div className="flex items-center gap-3 min-w-[140px]">
          <span className="font-mono text-sm font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
            {vehicle.CODE}
          </span>
          <span className="text-xs font-bold text-gray-400 font-mono tracking-wider">{vehicle.MATRICULE}</span>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold truncate text-gray-100">
            {vehicle.DESIGNATION} <span className="text-gray-500 font-normal mx-1">·</span> {vehicle.MARQUE}
          </h3>
        </div>

        <div className="flex items-center gap-6">
          {status !== 'c' && (
            <div className="group relative">
              <Badge variant={status === 'i' ? 'danger' : 'warning'} className="cursor-help">
                {missing.length} manquant{missing.length > 1 ? 's' : ''}
              </Badge>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-gray-900 border border-gray-800 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Documents manquants</p>
                <ul className="space-y-1">
                  {missing.map(m => <li key={m} className="text-[11px] text-gray-300 flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-red-500" />{m}</li>)}
                </ul>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 min-w-[140px] justify-end">
            {statusIcons[status]}
            <span className="text-xs font-semibold text-gray-400">{statusLabels[status]}</span>
          </div>

          <div className="w-24 text-right">
            <span className="text-[11px] font-medium text-gray-500 font-mono">
              {acc?.current?.dateAccident ? fmtDate(acc.current.dateAccident) : '—'}
            </span>
          </div>

          {acc && acc.archived.length > 0 && (
            <Badge variant="purple" className="font-mono">
              {acc.archived.length} arch.
            </Badge>
          )}

          <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-400' : ''}`} />
        </div>
      </div>

      {/* Body */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="px-6 pb-6 pt-2 border-t border-gray-800/50 space-y-8">
              {/* Vehicle Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {FIELDS.map(([key, label]) => {
                  const val = vehicle[key];
                  if (!val) return null;
                  return (
                    <div key={key} className="bg-gray-900/30 border border-gray-800/50 rounded-lg p-3 space-y-1">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{label}</p>
                      <p className="text-xs font-semibold text-gray-200 truncate">{val}</p>
                    </div>
                  );
                })}
              </div>

              {/* Accident Section */}
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold text-gray-100">Accident en cours</h4>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Documents uploadés</span>
                        <span className="text-xs font-bold font-mono text-blue-400">
                          {Object.values(acc?.current?.docs || {}).filter(d => d.uploaded).length}/6
                        </span>
                      </div>
                      <div className="w-32 h-1 bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${status === 'c' ? 'bg-emerald-500' : status === 'a' ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${(Object.values(acc?.current?.docs || {}).filter(d => d.uploaded).length / 6) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Date de l'accident</label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <input 
                            type="date"
                            value={acc?.current?.dateAccident || ''}
                            onChange={(e) => updateCurrent('dateAccident', e.target.value)}
                            className="w-full bg-gray-900/50 border border-gray-800 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Raison du dégât</label>
                        <div className="relative">
                          <Info className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <input 
                            type="text"
                            value={acc?.current?.raisonDegat || ''}
                            onChange={(e) => updateCurrent('raisonDegat', e.target.value)}
                            placeholder="Ex: Collision arrière..."
                            className="w-full bg-gray-900/50 border border-gray-800 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {DOCS.map(doc => (
                        <DocSlot 
                          key={doc.key}
                          code={vehicle.CODE}
                          accId="current"
                          doc={doc}
                          docData={acc?.current?.docs?.[doc.key]}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2 h-full flex flex-col">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Notes & Observations</label>
                      <textarea 
                        value={acc?.current?.note || ''}
                        onChange={(e) => updateCurrent('note', e.target.value)}
                        placeholder="Ajouter des détails supplémentaires..."
                        className="flex-1 w-full bg-gray-900/50 border border-gray-800 rounded-lg p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all resize-none min-h-[120px]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Archived Section */}
              {acc && acc.archived.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 border-b border-gray-800 pb-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                      <Archive className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold text-gray-100">Historique des accidents</h4>
                  </div>
                  <div className="space-y-3">
                    {acc.archived.map((arch, idx) => (
                      <ArchiveItem 
                        key={arch.archiveId}
                        code={vehicle.CODE}
                        archivedRecord={arch}
                        index={idx}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Action Row */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                <div className="flex items-center gap-3">
                  <Button variant="primary" size="sm" className="gap-2" onClick={handleSave} loading={isSaving}>
                    <Save className="w-4 h-4" />
                    Enregistrer
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2" onClick={handleZip}>
                    <Package className="w-4 h-4" />
                    ZIP ce véhicule
                  </Button>
                </div>

                <Button variant="secondary" size="sm" className="gap-2 hover:bg-purple-900/20 hover:text-purple-400 hover:border-purple-500/30" onClick={() => setShowArchiveConfirm(true)} loading={isArchiving}>
                  <Archive className="w-4 h-4" />
                  Archiver → Nouvel accident
                </Button>
              </div>

              <ConfirmModal 
                isOpen={showArchiveConfirm}
                onClose={() => setShowArchiveConfirm(false)}
                onConfirm={handleArchive}
                title="Archiver l'accident"
                message="Voulez-vous vraiment archiver cet accident et en créer un nouveau ? Les documents actuels seront déplacés vers l'historique."
                confirmText="Archiver"
                variant="warning"
                loading={isArchiving}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ZipProgressOverlay progress={zipProgress} message={zipMessage} isVisible={isZipping} />
    </div>
  );
});
