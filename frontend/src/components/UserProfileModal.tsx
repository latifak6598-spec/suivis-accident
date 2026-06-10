import React, { useState, useEffect } from 'react';
import { useToast } from './Toast';
import { Button, Modal } from './UI';
import { ShieldCheck, Key, Calendar } from 'lucide-react';
import { fmtDate } from '../utils/fmtDate';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/state';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: { username: string; firstName: string; lastName: string; role: string } | null;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose, currentUser }) => {
  const { appExpiryDate } = useAuthStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  }, [isOpen]);

  const getPasswordStrength = (pass: string) => {
    if (pass.length === 0) return 0;
    if (pass.length < 8) return 1;
    if (pass.length < 12) return 2;
    return 3;
  };

  const strength = getPasswordStrength(newPassword);
  const strengthColors = ['bg-gray-800', 'bg-red-500', 'bg-amber-500', 'bg-emerald-500'];
  const strengthLabels = ['', 'Faible', 'Moyen', 'Fort'];

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (newPassword !== confirmPassword) {
      showToast('Les mots de passe ne correspondent pas', 'error');
      return;
    }

    if (newPassword.length < 8) {
      showToast('Le nouveau mot de passe doit faire au moins 8 caractères', 'error');
      return;
    }

    setIsSaving(true);
    try {
      await apiClient.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      showToast('Mot de passe mis à jour', 'success');
      onClose();
    } catch (err) {
      showToast('Mot de passe actuel incorrect', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentUser) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Profil Utilisateur">
      <div className="space-y-8">
        <div className="flex items-center gap-4 bg-gray-900/50 p-4 rounded-xl border border-gray-800">
          <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-lg font-bold text-blue-400">
            {currentUser.lastName?.[0]}{currentUser.firstName?.[0]}
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-100">{currentUser.lastName} {currentUser.firstName}</h3>
            <div className="flex items-center gap-2 mt-1">
              <ShieldCheck className="w-3 h-3 text-purple-400" />
              <span className="text-xs font-medium text-gray-400 uppercase tracking-widest">{currentUser.role}</span>
            </div>
          </div>
        </div>

        {currentUser.role !== 'admin' && appExpiryDate && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
            <Calendar className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-amber-400">Expiration de l'application</h4>
              <p className="text-xs text-amber-200/70 mt-1">
                Votre accès expire le <strong className="text-amber-200">{fmtDate(appExpiryDate)}</strong>.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4 pt-4 border-t border-gray-800">
          <div className="flex items-center gap-2 mb-4">
            <Key className="w-4 h-4 text-gray-400" />
            <h4 className="text-sm font-bold text-gray-200">Changer le mot de passe</h4>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Mot de passe actuel</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-gray-950/50 border border-gray-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Nouveau mot de passe</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-gray-950/50 border border-gray-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                required
                minLength={8}
              />
              {newPassword.length > 0 && (
                <div className="flex items-center gap-2 mt-2 px-1">
                  <div className="flex-1 flex gap-1 h-1.5">
                    {[1, 2, 3].map((level) => (
                      <div
                        key={level}
                        className={`flex-1 rounded-full transition-colors ${strength >= level ? strengthColors[strength] : 'bg-gray-800'}`}
                      />
                    ))}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${strengthColors[strength].replace('bg-', 'text-')}`}>
                    {strengthLabels[strength]}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Confirmer le mot de passe</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full bg-gray-950/50 border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all ${
                  confirmPassword.length > 0
                    ? newPassword === confirmPassword
                      ? 'border-emerald-500/50 focus:ring-emerald-500/30'
                      : 'border-red-500/50 focus:ring-red-500/30'
                    : 'border-gray-800 focus:ring-blue-500/30'
                }`}
                required
              />
            </div>

            <Button type="submit" variant="primary" className="w-full mt-2" loading={isSaving}>
              Mettre à jour le mot de passe
            </Button>
          </form>
        </div>
      </div>
    </Modal>
  );
};
