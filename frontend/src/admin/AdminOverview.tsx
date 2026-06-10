import React, { useState, useEffect, useMemo } from 'react';
import { ActivityEntry, Vehicle } from '../db/schema';
import { apiClient } from '../api/client';
import { fmtDateTime } from '../utils/fmtDate';
import { isAppExpired } from '../features/fleetData';
import {
  Users,
  UserCheck,
  UserPlus,
  UserX,
  Car,
  Calendar,
  Activity,
  Clock,
} from 'lucide-react';
import { Badge } from '../components/UI';

interface ApiUser {
  id: number;
  username: string;
  role: string;
  status: string;
}

export const AdminOverview: React.FC = () => {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [logs, setLogs] = useState<ActivityEntry[]>([]);
  const [expiryDate, setExpiryDate] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [u, vData, l, settings] = await Promise.all([
          apiClient.get<ApiUser[]>('/users'),
          apiClient.get<{ vehicles: Vehicle[] }>('/vehicles'),
          apiClient.get<ActivityEntry[]>('/logs'),
          apiClient.get<{ appExpiryDate: string }>('/settings'),
        ]);
        setUsers(u);
        setVehicles(vData.vehicles || []);
        setLogs(
          l
            .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
            .slice(0, 12)
        );
        setExpiryDate(settings.appExpiryDate);
      } catch (e) {}
    };
    fetchData();
  }, []);

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.status === 'approved').length;
    const pending = users.filter((u) => u.status === 'pending').length;
    const blocked = users.filter((u) => u.status === 'blocked').length;

    const now = new Date();
    const exp = new Date(expiryDate || '2099-12-31');
    const diffTime = exp.getTime() - now.getTime();
    const diffDays = isNaN(diffTime) ? 0 : Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
      total,
      active,
      pending,
      blocked,
      vehicleCount: vehicles.length,
      diffDays: isAppExpired(expiryDate) ? 0 : diffDays,
      expired: isAppExpired(expiryDate),
    };
  }, [users, vehicles, expiryDate]);

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={<Users className="w-5 h-5" />} label="Total Utilisateurs" value={stats.total} color="blue" />
        <StatCard icon={<UserCheck className="w-5 h-5" />} label="Actifs" value={stats.active} color="emerald" />
        <StatCard icon={<UserPlus className="w-5 h-5" />} label="En attente" value={stats.pending} color="amber" />
        <StatCard icon={<UserX className="w-5 h-5" />} label="Bloqués" value={stats.blocked} color="red" />
        <StatCard icon={<Car className="w-5 h-5" />} label="Véhicules" value={stats.vehicleCount} color="indigo" />
        <StatCard
          icon={<Calendar className="w-5 h-5" />}
          label={stats.expired ? 'Expiré' : 'Jours restants'}
          value={stats.diffDays}
          color={stats.expired ? 'red' : stats.diffDays > 30 ? 'emerald' : stats.diffDays > 7 ? 'amber' : 'red'}
        />
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Activity className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-gray-100">Activité récente</h2>
          </div>
          <Badge variant="info">Dernières 12 entrées</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {logs.map((log, idx) => (
            <div key={idx} className="bg-gray-900/40 border border-gray-800 rounded-xl p-4 space-y-3 hover:bg-gray-800/40 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-xs font-bold text-blue-400">
                  {log.firstName?.[0]}{log.lastName?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-200 truncate">{log.firstName} {log.lastName}</p>
                  <p className="text-[10px] text-gray-500 font-mono truncate">@{log.username}</p>
                </div>
                <Badge variant="purple" className="text-[9px] px-1.5 py-0">{log.action}</Badge>
              </div>
              <div className="bg-gray-950/50 rounded-lg p-2 border border-gray-800/50">
                <p className="text-[11px] text-gray-400 leading-relaxed line-clamp-2">{log.details || 'Aucun détail'}</p>
              </div>
              <div className="flex items-center justify-end gap-1.5 text-[10px] text-gray-500 font-medium">
                <Clock className="w-3 h-3" />
                {fmtDateTime(log.timestamp)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) => {
  const colors: Record<string, string> = {
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    red: 'text-red-400 bg-red-500/10 border-red-500/20',
    indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  };

  return (
    <div className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center space-y-2 transition-all hover:scale-105 ${colors[color]}`}>
      <div className="w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center">{icon}</div>
      <div className="space-y-0.5">
        <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">{label}</p>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
      </div>
    </div>
  );
};
