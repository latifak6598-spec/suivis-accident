import React, { useState, useEffect } from 'react';
import { logAction } from '../features/activityLog';
import { apiClient } from '../api/client';
import {
  Settings,
  Calendar,
  Trash2,
  AlertTriangle,
  Save,
  ShieldAlert,
  Database,
  Info,
} from 'lucide-react';
import { Button } from '../components/UI';
import { useToast } from '../components/Toast';
import { ConfirmModal } from '../components/ConfirmModal';
import { Modal } from '../components/UI';
import { reloadFleetData } from '../features/fleetData';
import { useAuthStore } from '../store/state';

export const AdminSettings: React.FC = () => {
  const [expiry, setExpiry] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const { showToast } = useToast();
  const { setAppExpiryDate } = useAuthStore();

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await apiClient.get<{ appExpiryDate: string }>('/settings');
        setExpiry(res.appExpiryDate);
      } catch (e) {}
    };
    fetchSettings();
  }, []);

  const handleSaveExpiry = async () => {
    setIsSaving(true);
    try {
      await apiClient.patch('/settings/expiry', { expiryDate: expiry });
      setAppExpiryDate(expiry);
      await logAction('Mise à jour expiration', expiry);
      showToast('Date d\'expiration mise à jour', 'success');
    } catch (err) {
      showToast('Erreur lors de la mise à jour', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDB = async () => {
    if (!adminPassword) {
      showToast('Mot de passe requis', 'error');
      return;
    }

    setIsResetting(true);
    try {
      await apiClient.post('/settings/reset-database', { adminPassword });
      await reloadFleetData();
      await logAction('Réinitialisation base', 'vehicles/accidents/files');
      showToast('Base réinitialisée (sauvegarde chiffrée créée automatiquement)', 'success');
      setShowResetConfirm(false);
      setAdminPassword('');
    } catch (err) {
      showToast('Mot de passe incorrect ou erreur', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
          <Settings className="w-5 h-5" />
        </div>
        <h2 className="text-lg font-bold text-gray-100">Paramètres de l'application</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-8 space-y-6 shadow-xl">
          <div className="flex items-center gap-3 border-b border-gray-800 pb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-100">Expiration de l'application</h3>
              <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">Contrôle d'accès temporel</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex gap-4">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              <p className="text-xs text-amber-200/80 leading-relaxed">
                Une fois la date atteinte, les utilisateurs non-administrateurs verront l'écran d'expiration.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Date d'expiration</label>
              <div className="flex gap-3">
                <input
                  type="date"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="flex-1 bg-gray-950/50 border border-gray-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                />
                <Button variant="primary" className="gap-2 px-6" onClick={handleSaveExpiry} loading={isSaving}>
                  <Save className="w-4 h-4" />
                  Mettre à jour
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-8 space-y-6 shadow-xl">
          <div className="flex items-center gap-3 border-b border-red-500/20 pb-4">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-red-400">Zone de danger</h3>
              <p className="text-[10px] text-red-500/50 font-bold uppercase tracking-widest">Admin uniquement</p>
            </div>
          </div>

          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-4">
            <Info className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-[11px] text-red-300/60 leading-relaxed">
              Une sauvegarde chiffrée est créée automatiquement avant toute réinitialisation.
              Gérez vos sauvegardes dans l'onglet « Sauvegardes ».
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Mot de passe administrateur</label>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Requis pour la réinitialisation"
              className="w-full bg-gray-950/50 border border-gray-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-900/40 border border-gray-800 rounded-xl">
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-gray-500" />
              <span className="text-xs font-semibold text-gray-300">Vider toutes les données métier</span>
            </div>
            <Button variant="danger" size="sm" className="gap-2" onClick={() => setShowResetConfirm(true)} loading={isResetting}>
              <Trash2 className="w-4 h-4" />
              Réinitialiser
            </Button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        title="Réinitialisation totale"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowResetConfirm(false)}>Annuler</Button>
            <Button variant="danger" onClick={handleResetDB} loading={isResetting}>Confirmer la suppression</Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-300">
            Cette action supprime tous les véhicules, accidents et documents. Une sauvegarde chiffrée sera créée d'abord.
          </p>
        </div>
      </Modal>
    </div>
  );
};
