import React, { useState, useEffect } from 'react';
import { User } from '../db/schema';
import { logAction } from '../features/activityLog';
import { apiClient } from '../api/client';
import { fmtDateTime } from '../utils/fmtDate';
import { Users, UserCheck, UserX, Trash2, Unlock, KeyRound } from 'lucide-react';
import { Button, Badge, Spinner } from '../components/UI';
import { useToast } from '../components/Toast';
import { ConfirmModal } from '../components/ConfirmModal';

const PROTECTED_ADMIN = 'AMROUS ABDALLAH';

interface ApiUser {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  createdAt: string;
  lastLogin: string | null;
}

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [resetResult, setResetResult] = useState<{ username: string; tempPassword: string } | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const u = await apiClient.get<ApiUser[]>('/users');
      setUsers(u.sort((a, b) => a.username.localeCompare(b.username)));
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleStatusChange = async (userId: number, username: string, status: 'approved' | 'blocked') => {
    try {
      await apiClient.patch(`/users/${userId}/status`, { status });
      await logAction(
        status === 'approved' ? 'Approbation utilisateur' : 'Blocage utilisateur',
        `@${username}`
      );
      showToast(`Utilisateur ${status === 'approved' ? 'approuvé' : 'bloqué'}`, 'success');
      fetchUsers();
    } catch (e: unknown) {
      const err = e as { error?: string };
      showToast(err.error || 'Erreur', 'error');
    }
  };

  const handleResetPassword = async (userId: number, username: string) => {
    try {
      const res = await apiClient.post<{ tempPassword: string }>(
        `/users/${userId}/reset-password`,
        {}
      );
      setResetResult({ username, tempPassword: res.tempPassword });
      await logAction('Réinitialisation mot de passe', `@${username}`);
      showToast('Mot de passe réinitialisé', 'success');
    } catch (e) {
      showToast('Erreur lors de la réinitialisation', 'error');
    }
  };

  const handleDelete = async () => {
    if (confirmDelete === null) return;
    try {
      await apiClient.delete(`/users/${confirmDelete}`);
      await logAction('Suppression utilisateur', `id=${confirmDelete}`);
      showToast('Utilisateur supprimé', 'success');
      setConfirmDelete(null);
      fetchUsers();
    } catch (e: unknown) {
      const err = e as { error?: string };
      showToast(err.error || 'Erreur', 'error');
    }
  };

  if (loading) return <Spinner className="h-64" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
            <Users className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-gray-100">Gestion des utilisateurs</h2>
        </div>
        <Badge variant="info">{users.length} utilisateurs au total</Badge>
      </div>

      <div className="bg-gray-900/40 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-900/60 border-b border-gray-800">
              <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Utilisateur</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Statut</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Dernière connexion</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Créé le</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {users.map((user) => {
              const isProtected = user.username.toUpperCase() === PROTECTED_ADMIN;
              return (
                <tr key={user.id} className="hover:bg-gray-800/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold ${user.role === 'admin' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>
                        {user.firstName[0]}{user.lastName[0]}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-200">{user.firstName} {user.lastName}</p>
                        <p className="text-[10px] text-gray-500 font-mono">@{user.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {user.role === 'admin' ? (
                      <Badge variant="purple">Admin</Badge>
                    ) : (
                      <Badge variant={user.status === 'approved' ? 'success' : user.status === 'pending' ? 'warning' : 'danger'}>
                        {user.status === 'approved' ? 'Approuvé' : user.status === 'pending' ? 'En attente' : 'Bloqué'}
                      </Badge>
                    )}
                  </td>
                  <td className="px-6 py-4 text-[10px] text-gray-500 font-mono">
                    {user.lastLogin ? fmtDateTime(user.lastLogin) : 'Jamais'}
                  </td>
                  <td className="px-6 py-4 text-[10px] text-gray-500 font-mono">
                    {fmtDateTime(user.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {isProtected ? (
                      <span className="text-[10px] font-bold text-purple-500/50 uppercase tracking-widest italic">Protégé</span>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        {user.status === 'pending' && (
                          <button onClick={() => handleStatusChange(user.id, user.username, 'approved')} className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all" title="Approuver">
                            <UserCheck className="w-4 h-4" />
                          </button>
                        )}
                        {user.status === 'approved' && (
                          <button onClick={() => handleStatusChange(user.id, user.username, 'blocked')} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all" title="Bloquer">
                            <UserX className="w-4 h-4" />
                          </button>
                        )}
                        {user.status === 'blocked' && (
                          <button onClick={() => handleStatusChange(user.id, user.username, 'approved')} className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all" title="Débloquer">
                            <Unlock className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => handleResetPassword(user.id, user.username)} className="p-2 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-white transition-all" title="Réinitialiser mot de passe">
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button onClick={() => setConfirmDelete(user.id)} className="p-2 rounded-lg bg-gray-800 text-gray-500 hover:bg-red-500 hover:text-white transition-all" title="Supprimer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Supprimer l'utilisateur"
        message="Voulez-vous vraiment supprimer cet utilisateur ? Cette action est irréversible."
        confirmText="Supprimer"
      />

      <ConfirmModal
        isOpen={!!resetResult}
        onClose={() => setResetResult(null)}
        onConfirm={() => setResetResult(null)}
        title="Mot de passe temporaire"
        message={resetResult ? `Utilisateur @${resetResult.username}\n\nMot de passe temporaire (à communiquer une seule fois) :\n${resetResult.tempPassword}` : ''}
        confirmText="J'ai noté le mot de passe"
        variant="warning"
      />
    </div>
  );
};
