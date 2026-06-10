import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import { logAction } from '../features/activityLog';
import { reloadFleetData } from '../features/fleetData';
import { formatBytes } from '../utils/formatBytes';
import { fmtDateTime } from '../utils/fmtDate';
import {
  Archive,
  HardDrive,
  RotateCcw,
  Trash2,
  Plus,
  Shield,
  AlertTriangle,
  Database,
} from 'lucide-react';
import { Button, Badge, Spinner } from '../components/UI';
import { useToast } from '../components/Toast';
import { ConfirmModal } from '../components/ConfirmModal';

interface BackupEntry {
  name: string;
  size: number;
  createdAt: string;
}

export const AdminBackups: React.FC = () => {
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminPassword, setAdminPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { showToast } = useToast();

  const fetchBackups = useCallback(async () => {
    setLoading(true);
    try {
      const list = await apiClient.get<BackupEntry[]>('/settings/backups');
      setBackups(list);
    } catch {
      showToast('Erreur chargement des sauvegardes', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  const handleCreate = async () => {
    if (!adminPassword) {
      showToast('Saisissez votre mot de passe administrateur', 'error');
      return;
    }
    setIsCreating(true);
    try {
      const res = await apiClient.post<{ filename: string }>('/settings/backups', {
        adminPassword,
      });
      await logAction('Sauvegarde chiffrée', res.filename);
      showToast(`Sauvegarde créée : ${res.filename}`, 'success');
      setAdminPassword('');
      fetchBackups();
    } catch {
      showToast('Échec de la sauvegarde', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreTarget || !adminPassword) return;
    setIsRestoring(true);
    try {
      await apiClient.post(`/settings/backups/${encodeURIComponent(restoreTarget)}/restore`, {
        adminPassword,
      });
      await reloadFleetData();
      await logAction('Restauration sauvegarde', restoreTarget);
      showToast('Sauvegarde restaurée avec succès', 'success');
      setRestoreTarget(null);
      setAdminPassword('');
    } catch (e: unknown) {
      const err = e as { error?: string };
      showToast(err.error || 'Restauration échouée (mot de passe ?)', 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/settings/backups/${encodeURIComponent(deleteTarget)}`);
      await logAction('Suppression sauvegarde', deleteTarget);
      showToast('Sauvegarde supprimée', 'success');
      setDeleteTarget(null);
      fetchBackups();
    } catch {
      showToast('Suppression échouée', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const totalSize = backups.reduce((s, b) => s + b.size, 0);

  if (loading) return <Spinner className="h-64" />;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-100">Sauvegardes de l'application</h2>
            <p className="text-xs text-gray-500">
              {backups.length} sauvegarde(s) · {formatBytes(totalSize)} au total
            </p>
          </div>
        </div>
        <Badge variant="purple">Admin uniquement</Badge>
      </div>

      <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-5 flex gap-4">
        <Shield className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <p className="text-xs text-indigo-200/70 leading-relaxed">
          Chaque sauvegarde (.sabak) contient la base SQLite complète et tous les fichiers chiffrés.
          La restauration remplace l'état actuel de l'application. Les sauvegardes sont protégées par
          votre mot de passe administrateur.
        </p>
      </div>

      {/* Create backup */}
      <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2">
          <Plus className="w-4 h-4 text-emerald-400" />
          Nouvelle sauvegarde
        </h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            placeholder="Mot de passe administrateur"
            className="flex-1 bg-gray-950/50 border border-gray-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
          <Button variant="primary" className="gap-2 shrink-0" onClick={handleCreate} loading={isCreating}>
            <Archive className="w-4 h-4" />
            Créer une sauvegarde
          </Button>
        </div>
      </div>

      {/* Backup list */}
      {backups.length === 0 ? (
        <div className="text-center py-16 text-gray-500 space-y-3">
          <HardDrive className="w-12 h-12 mx-auto opacity-30" />
          <p className="text-sm">Aucune sauvegarde pour le moment</p>
        </div>
      ) : (
        <div className="space-y-3">
          {backups.map((backup) => (
            <div
              key={backup.name}
              className="flex items-center gap-4 p-4 bg-gray-900/40 border border-gray-800 rounded-xl hover:bg-gray-800/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-indigo-400">
                <Archive className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-mono font-semibold text-gray-200 truncate">{backup.name}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {fmtDateTime(backup.createdAt)} · {formatBytes(backup.size)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                  onClick={() => setRestoreTarget(backup.name)}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restaurer
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-red-400 hover:bg-red-500/10"
                  onClick={() => setDeleteTarget(backup.name)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={!!restoreTarget}
        onClose={() => setRestoreTarget(null)}
        onConfirm={handleRestore}
        title="Restaurer cette sauvegarde"
        message={`Voulez-vous restaurer "${restoreTarget}" ? L'état actuel sera remplacé par celui de cette sauvegarde. Confirmez avec votre mot de passe administrateur (déjà saisi ci-dessus).`}
        confirmText="Restaurer"
        variant="warning"
        loading={isRestoring}
      />

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Supprimer la sauvegarde"
        message={`Supprimer définitivement "${deleteTarget}" ? Cette action libère de l'espace disque et est irréversible.`}
        confirmText="Supprimer"
        variant="danger"
        loading={isDeleting}
      />
    </div>
  );
};
