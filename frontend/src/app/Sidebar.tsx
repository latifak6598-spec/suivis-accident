/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { useVehicleStore } from '../store/state';
import { syncYears } from '../features/filters';
import { Filter, Calendar, X, ChevronDown, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';
import { Button } from '../components/UI';

export const Sidebar: React.FC = () => {
  const { flt, setFlt, accMap } = useVehicleStore();

  const years = useMemo(() => syncYears(accMap), [accMap]);

  const months = [
    { value: '01', label: 'Janvier' },
    { value: '02', label: 'Février' },
    { value: '03', label: 'Mars' },
    { value: '04', label: 'Avril' },
    { value: '05', label: 'Mai' },
    { value: '06', label: 'Juin' },
    { value: '07', label: 'Juillet' },
    { value: '08', label: 'Août' },
    { value: '09', label: 'Septembre' },
    { value: '10', label: 'Octobre' },
    { value: '11', label: 'Novembre' },
    { value: '12', label: 'Décembre' },
  ];

  const handleReset = () => {
    setFlt({
      status: 'all',
      dateFrom: '',
      dateTo: '',
      month: '',
      year: '',
      search: '',
    });
  };

  return (
    <aside className="w-64 flex flex-col bg-[#0c0d12] border-r border-gray-800 overflow-y-auto p-5 space-y-8">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
          <Filter className="w-3.5 h-3.5" />
          <span>Statut</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <StatusButton 
            active={flt.status === 'all'} 
            onClick={() => setFlt({ status: 'all' })}
            icon={<Filter className="w-4 h-4" />}
            label="Tous"
          />
          <StatusButton 
            active={flt.status === 'c'} 
            onClick={() => setFlt({ status: 'c' })}
            icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
            label="Classé"
          />
          <StatusButton 
            active={flt.status === 'i'} 
            onClick={() => setFlt({ status: 'i' })}
            icon={<HelpCircle className="w-4 h-4 text-red-500" />}
            label="Incomplet"
          />
          <StatusButton 
            active={flt.status === 'a'} 
            onClick={() => setFlt({ status: 'a' })}
            icon={<AlertCircle className="w-4 h-4 text-amber-500" />}
            label="Besoin d'attention"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
          <Calendar className="w-3.5 h-3.5" />
          <span>Date d'accident</span>
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-[10px] text-gray-500 uppercase font-bold pl-1">Du</label>
            <input 
              type="date"
              value={flt.dateFrom}
              onChange={(e) => setFlt({ dateFrom: e.target.value })}
              className="w-full bg-gray-900/50 border border-gray-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] text-gray-500 uppercase font-bold pl-1">Au</label>
            <input 
              type="date"
              value={flt.dateTo}
              onChange={(e) => setFlt({ dateTo: e.target.value })}
              className="w-full bg-gray-900/50 border border-gray-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
          <Calendar className="w-3.5 h-3.5" />
          <span>Période</span>
        </div>
        <div className="space-y-3">
          <div className="relative">
            <select 
              value={flt.month}
              onChange={(e) => setFlt({ month: e.target.value })}
              className="w-full appearance-none bg-gray-900/50 border border-gray-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all pr-8"
            >
              <option value="">Tous les mois</option>
              {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
          </div>
          <div className="relative">
            <select 
              value={flt.year}
              onChange={(e) => setFlt({ year: e.target.value })}
              className="w-full appearance-none bg-gray-900/50 border border-gray-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all pr-8"
            >
              <option value="">Toutes les années</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="pt-4">
        <button 
          onClick={handleReset}
          className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-800 rounded-xl text-xs font-bold text-gray-500 hover:border-red-500/50 hover:text-red-400 hover:bg-red-500/5 transition-all"
        >
          <X className="w-3.5 h-3.5" />
          Réinitialiser
        </button>
      </div>
    </aside>
  );
};

const StatusButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
      active 
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
        : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);
