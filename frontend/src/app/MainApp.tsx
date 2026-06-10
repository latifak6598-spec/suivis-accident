/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useVehicleStore, useAuthStore } from '../store/state';
import { Sidebar } from './Sidebar';
import { VehicleList } from './VehicleList';
import { ZipProgressOverlay } from './ZipProgressOverlay';
import { handleImport } from '../features/import';
import { useToast } from '../components/Toast';
import { logAction } from '../features/activityLog';
import { ExcelExportModal } from '../components/ExcelExportModal';
import { apiClient } from '../api/client';
import { ZipExportModal } from '../components/ZipExportModal';
import { UserProfileModal } from '../components/UserProfileModal';
import { getStatus } from '../features/status';
import { getFiltered } from '../features/filters';
import { 
  Car, 
  Search, 
  Upload, 
  FileSpreadsheet, 
  Package, 
  ShieldCheck, 
  LogOut,
  ChevronDown,
  LayoutDashboard,
  Filter,
  RefreshCw,
  Database
} from 'lucide-react';
import { Button, Badge, Spinner } from '../components/UI';

export const MainApp: React.FC = () => {
  const { 
    vehicles, 
    accMap, 
    flt, 
    setFlt, 
    filteredCache, 
    setFilteredCache, 
    setRenderPage 
  } = useVehicleStore();
  const { currentUser, setScreen, setCurrentUser } = useAuthStore();
  const { showToast } = useToast();
  const [isImporting, setIsImporting] = useState(false);

  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const [zipMessage, setZipMessage] = useState('');
  const [isZipVisible, setIsZipVisible] = useState(false);
  
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [isZipModalOpen, setIsZipModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Re-filter when vehicles, accMap or filters change
  useEffect(() => {
    const filtered = getFiltered(vehicles, accMap, flt);
    setFilteredCache(filtered);
    setRenderPage(0);
  }, [vehicles, accMap, flt, setFilteredCache, setRenderPage]);

  const handleImportClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.db,.sqlite';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setIsImporting(true);
        try {
          await handleImport(file);
          showToast('Importation réussie !', 'success');
        } catch (err) {
          showToast('Erreur lors de l\'importation', 'error');
          console.error(err);
        } finally {
          setIsImporting(false);
        }
      }
    };
    input.click();
  };

  const handleExcelExport = async (options: any) => {
    setIsExcelModalOpen(false);
    setIsExportingExcel(true);
    try {
      const { doExcelExport } = await import('../features/exportExcel');
      const count = await doExcelExport(vehicles, accMap, options);
      if (count && count > 0) {
        showToast(`✅ ${count} véhicule(s) exportés`, 'success');
      }
    } catch (err) {
      showToast('Erreur lors de l\'export Excel', 'error');
      console.error(err);
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleZipExport = async (options: any) => {
    setIsZipModalOpen(false);
    setIsZipVisible(true);
    setZipProgress(0);
    setZipMessage('Préparation...');
    try {
      const { doGlobalZip } = await import('../features/exportZip');
      const count = await doGlobalZip(vehicles, accMap, options, (percent, msg) => {
        setZipMessage(msg);
        setZipProgress(percent);
      });
      if (count && count > 0) {
        showToast(`✅ ${count} véhicule(s) exportés`, 'success');
      }
    } catch (err) {
      showToast('Erreur lors de l\'export ZIP', 'error');
      console.error(err);
    } finally {
      setIsZipVisible(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout', {});
    } catch(e) {}
    setCurrentUser(null);
    setScreen('auth');
  };

  const stats = useMemo(() => {
    const total = vehicles.length;
    let classed = 0;
    let incomplete = 0;
    let attention = 0;
    let totalDocs = 0;

    vehicles.forEach(v => {
      const acc = (accMap && v.CODE) ? accMap[v.CODE] : undefined;
      if (acc) {
        const uploaded = Object.values(acc.current?.docs || {}).filter(d => d.uploaded).length;
        if (uploaded === 6) classed++;
        else if (uploaded > 0) attention++;
        else incomplete++;

        totalDocs += uploaded;
        acc.archived.forEach(arch => {
          totalDocs += Object.values(arch.docs).filter(d => d.uploaded).length;
        });
      } else {
        incomplete++;
      }
    });

    return { total, classed, incomplete, attention, totalDocs };
  }, [vehicles, accMap]);

  return (
    <div className="h-screen flex flex-col bg-[#0c0d12] text-gray-100 overflow-hidden font-sans">
      {/* Header */}
      <header className="h-14 flex items-center justify-between px-6 border-b border-gray-800 bg-[#0c0d12]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-400 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Car className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight leading-none">Suivi Accidents</h1>
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mt-0.5">Flotte véhicules</p>
          </div>
        </div>

        <div className="flex-1 max-w-md mx-8 relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
          <input 
            type="text"
            value={flt.search}
            onChange={(e) => setFlt({ search: e.target.value })}
            placeholder="Rechercher par code, matricule, affectation..."
            className="w-full bg-gray-900/50 border border-gray-800 rounded-full pl-10 pr-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all"
          />
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="gap-2 text-xs" onClick={handleImportClick} loading={isImporting}>
            <Upload className="w-4 h-4" />
            Importer .db
          </Button>
          <Button variant="ghost" size="sm" className="gap-2 text-xs" onClick={() => setIsExcelModalOpen(true)} loading={isExportingExcel}>
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </Button>
          <Button variant="ghost" size="sm" className="gap-2 text-xs" onClick={() => setIsZipModalOpen(true)}>
            <Package className="w-4 h-4" />
            ZIP global
          </Button>
          
          <div className="w-px h-6 bg-gray-800 mx-1" />

          <div className="flex items-center gap-3 pl-2">
            <div className="flex flex-col items-end">
              <span className="text-xs font-semibold">{currentUser?.lastName} {currentUser?.firstName}</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-widest">{currentUser?.role}</span>
            </div>
            <div 
              className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-xs font-bold text-blue-400 cursor-pointer hover:bg-gray-700 transition-colors"
              onClick={() => setIsProfileModalOpen(true)}
            >
              {currentUser?.lastName?.[0]}{currentUser?.firstName?.[0]}
            </div>
          </div>

          {currentUser?.role === 'admin' && (
            <Button variant="outline" size="icon" className="w-8 h-8 rounded-full border-purple-500/30 text-purple-400 hover:bg-purple-500/10" onClick={() => setScreen('admin')}>
              <ShieldCheck className="w-4 h-4" />
            </Button>
          )}

          <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="h-8 flex items-center px-6 bg-gray-900/30 border-b border-gray-800 text-[11px] font-medium text-gray-400 gap-6">
        <div className="flex items-center gap-2">
          <span>Total véhicules:</span>
          <span className="text-gray-100 font-bold">{stats.total}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Classés:</span>
          <span className="text-emerald-400 font-bold">{stats.classed}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
          <span>Incomplets:</span>
          <span className="text-red-400 font-bold">{stats.incomplete}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          <span>Besoin d'attention:</span>
          <span className="text-amber-400 font-bold">{stats.attention}</span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <Database className="w-3 h-3 text-blue-400" />
          <span>Docs stockés:</span>
          <span className="text-blue-400 font-bold">{stats.totalDocs}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6 bg-[#0c0d12]">
          <VehicleList />
        </main>
      </div>

      <ZipProgressOverlay progress={zipProgress} message={zipMessage} isVisible={isZipVisible} />

      <ExcelExportModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        onExport={handleExcelExport}
        vehicles={vehicles}
        accMap={accMap}
      />
      
      <ZipExportModal
        isOpen={isZipModalOpen}
        onClose={() => setIsZipModalOpen(false)}
        onExport={handleZipExport}
        vehicles={vehicles}
        accMap={accMap}
      />

      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
      />
    </div>
  );
};
