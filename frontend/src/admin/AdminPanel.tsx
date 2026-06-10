/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore } from '../store/state';
import { User } from '../db/schema';
import { logAction } from '../features/activityLog';
import { apiClient } from '../api/client';
import {
  Users,
  ClipboardList,
  Settings,
  ArrowLeft,
  LogOut,
  Shield,
  LayoutDashboard,
  Database,
} from 'lucide-react';
import { Button, Badge } from '../components/UI';
import { AdminOverview } from './AdminOverview';
import { AdminUsers } from './AdminUsers';
import { AdminLog } from './AdminLog';
import { AdminSettings } from './AdminSettings';
import { AdminBackups } from './AdminBackups';

type AdminSection = 'overview' | 'users' | 'log' | 'backups' | 'settings';

export const AdminPanel: React.FC = () => {
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');
  const { setScreen, currentUser, setCurrentUser } = useAuthStore();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const users = await apiClient.get<Array<{ status: string }>>('/users');
        setPendingCount(users.filter((u) => u.status === 'pending').length);
      } catch (e) {}
    };
    fetchPending();
  }, [activeSection]);

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout', {});
    } catch(e) {}
    setCurrentUser(null);
    setScreen('auth');
  };

  return (
    <div className="fixed inset-0 z-[4000] bg-[#0c0d12] flex flex-col overflow-hidden text-gray-100">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-8 border-b border-gray-800 bg-[#0c0d12]/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
            <Shield className="w-6 h-6" />
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold tracking-tight">Panneau Administrateur</h1>
            <Badge variant="purple" className="font-bold tracking-widest text-[10px]">ADMIN</Badge>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 pr-6 border-r border-gray-800">
            <div className="flex flex-col items-end">
              <span className="text-sm font-semibold">{currentUser?.firstName} {currentUser?.lastName}</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-widest">Super Admin</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-sm font-bold text-purple-400">
              {currentUser?.firstName[0]}{currentUser?.lastName[0]}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="gap-2 border-gray-700 hover:border-blue-500/50 hover:text-blue-400" onClick={() => setScreen('app')}>
              <ArrowLeft className="w-4 h-4" />
              Retour à l'app
            </Button>
            <Button variant="ghost" size="sm" className="gap-2 text-red-400 hover:bg-red-500/10 hover:text-red-300" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
              Déconnexion
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-[#0c0d12] border-r border-gray-800 p-6 flex flex-col gap-2">
          <NavButton 
            active={activeSection === 'overview'} 
            onClick={() => setActiveSection('overview')}
            icon={<LayoutDashboard className="w-5 h-5" />}
            label="Vue d'ensemble"
          />
          <NavButton 
            active={activeSection === 'users'} 
            onClick={() => setActiveSection('users')}
            icon={<Users className="w-5 h-5" />}
            label="Utilisateurs"
            badge={pendingCount > 0 ? pendingCount : undefined}
          />
          <NavButton 
            active={activeSection === 'log'} 
            onClick={() => setActiveSection('log')}
            icon={<ClipboardList className="w-5 h-5" />}
            label="Journal d'activité"
          />
          <NavButton
            active={activeSection === 'backups'}
            onClick={() => setActiveSection('backups')}
            icon={<Database className="w-5 h-5" />}
            label="Sauvegardes"
          />
          <NavButton 
            active={activeSection === 'settings'} 
            onClick={() => setActiveSection('settings')}
            icon={<Settings className="w-5 h-5" />}
            label="Paramètres app"
          />
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-[#05060a] p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-6xl mx-auto"
            >
              {activeSection === 'overview' && <AdminOverview />}
              {activeSection === 'users' && <AdminUsers />}
              {activeSection === 'log' && <AdminLog />}
              {activeSection === 'backups' && <AdminBackups />}
              {activeSection === 'settings' && <AdminSettings />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label, badge }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, badge?: number }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all relative ${
      active 
        ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' 
        : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
    }`}
  >
    {icon}
    <span className="flex-1 text-left">{label}</span>
    {badge !== undefined && (
      <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
        {badge}
      </span>
    )}
  </button>
);
