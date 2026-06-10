/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ActivityEntry, User } from '../db/schema';
import { fmtDateTime } from '../utils/fmtDate';
import { apiClient } from '../api/client';
import { 
  ClipboardList, 
  Search, 
  Filter, 
  Calendar, 
  FileSpreadsheet, 
  X,
  ChevronDown,
  Clock,
  User as UserIcon
} from 'lucide-react';
import { Button, Badge, Spinner } from '../components/UI';
import { useToast } from '../components/Toast';
import * as XLSX from 'xlsx';

export const AdminLog: React.FC = () => {
  const [logs, setLogs] = useState<ActivityEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const [filters, setFilters] = useState({
    search: '',
    username: '',
    action: '',
    dateFrom: '',
    dateTo: ''
  });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const [l, u] = await Promise.all([
        apiClient.get<ActivityEntry[]>('/logs'),
        apiClient.get<User[]>('/users')
      ]);
      setLogs(l.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || '')));
      setUsers(u);
    } catch(e) {}
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (filters.search && !log.details.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.username && log.username !== filters.username) return false;
      if (filters.action && log.action !== filters.action) return false;
      if (filters.dateFrom && log.timestamp < filters.dateFrom) return false;
      if (filters.dateTo && log.timestamp > filters.dateTo + 'T23:59:59') return false;
      return true;
    });
  }, [logs, filters]);

  const actions = useMemo(() => {
    const set = new Set<string>();
    logs.forEach(l => set.add(l.action));
    return Array.from(set).sort();
  }, [logs]);

  const handleExport = () => {
    const data = filteredLogs.map(l => ({
      'Date & Heure': fmtDateTime(l.timestamp),
      'Utilisateur': `${l.firstName} ${l.lastName} (@${l.username})`,
      'Action': l.action,
      'Détails': l.details
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Journal");
    XLSX.writeFile(wb, `journal_activite_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast('Journal exporté avec succès', 'success');
  };

  if (loading) return <Spinner className="h-64" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
            <ClipboardList className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-gray-100">Journal d'activité</h2>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="info">{filteredLogs.length} entrées filtrées</Badge>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
            <FileSpreadsheet className="w-4 h-4" />
            Exporter Excel
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Recherche</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input 
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              placeholder="Détails..."
              className="w-full bg-gray-950/50 border border-gray-800 rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Utilisateur</label>
          <div className="relative">
            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <select 
              value={filters.username}
              onChange={(e) => setFilters({...filters, username: e.target.value})}
              className="w-full appearance-none bg-gray-950/50 border border-gray-800 rounded-lg pl-9 pr-8 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
            >
              <option value="">Tous</option>
              {users.map(u => <option key={u.username} value={u.username}>{u.firstName} {u.lastName}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Action</label>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <select 
              value={filters.action}
              onChange={(e) => setFilters({...filters, action: e.target.value})}
              className="w-full appearance-none bg-gray-950/50 border border-gray-800 rounded-lg pl-9 pr-8 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
            >
              <option value="">Toutes</option>
              {actions.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Du</label>
          <input 
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
            className="w-full bg-gray-950/50 border border-gray-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Au</label>
          <div className="flex gap-2">
            <input 
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
              className="flex-1 bg-gray-950/50 border border-gray-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
            />
            <button 
              onClick={() => setFilters({ search: '', username: '', action: '', dateFrom: '', dateTo: '' })}
              className="p-2 rounded-lg bg-gray-800 text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
              title="Réinitialiser"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-gray-900/40 border border-gray-800 rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-900/60 border-b border-gray-800">
              <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Date & Heure</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Utilisateur</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Action</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Détails</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {filteredLogs.map((log, idx) => (
              <tr key={idx} className="hover:bg-gray-800/10 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-[11px] text-gray-400 font-mono">
                    <Clock className="w-3.5 h-3.5 opacity-50" />
                    {fmtDateTime(log.timestamp)}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-[10px] font-bold text-blue-400">
                      {log.firstName[0]}{log.lastName[0]}
                    </div>
                    <span className="text-xs font-semibold text-gray-200">{log.firstName} {log.lastName}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <Badge variant="purple" className="text-[9px] px-1.5 py-0">{log.action}</Badge>
                </td>
                <td className="px-6 py-4">
                  <p className="text-xs text-gray-400 line-clamp-1" title={log.details}>{log.details || '—'}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
