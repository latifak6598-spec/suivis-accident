/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useAuthStore } from '../store/state';
import { SessionUser } from '../db/schema';
import { apiClient } from '../api/client';
import { logAction } from '../features/activityLog';
import { Button } from '../components/UI';
import { useToast } from '../components/Toast';
import { Car, Shield, BarChart3, Database, Lock, UserPlus } from 'lucide-react';

const FooterBranding = () => (
  <p className="text-sm text-gray-400 text-center mt-8 font-medium">
    Réalisé par AMROUS Ayham, Propriété de AMROUS Abdallah
  </p>
);

export const AuthScreen: React.FC = () => {
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const { setScreen, setCurrentUser } = useAuthStore();
  const { showToast } = useToast();

  return (
    <div className="min-h-screen flex bg-[#05060a] text-gray-100 overflow-hidden">
      {/* Left Panel */}
      <div className="hidden lg:flex w-[44%] relative flex-col justify-center px-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a0505] via-[#0c0d12] to-[#050d1a]" />
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-500/10 rounded-full blur-[120px]" />
        
        <div className="relative z-10 space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-400 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Car className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Suivi Accidents AMROUS</h1>
              <p className="text-gray-400 font-medium">Gestion de flotte automobile</p>
            </div>
          </div>

          <div className="space-y-6 pt-8">
            <FeatureItem icon={<Database className="w-5 h-5" />} title="Gestion locale" desc="Toutes vos données restent sur votre machine." />
            <FeatureItem icon={<Shield className="w-5 h-5" />} title="Sécurité avancée" desc="Accès restreint et journal d'activité complet." />
            <FeatureItem icon={<BarChart3 className="w-5 h-5" />} title="Exports Excel & ZIP" desc="Générez des rapports détaillés en un clic." />
            <FeatureItem icon={<Lock className="w-5 h-5" />} title="Archivage intelligent" desc="Historique complet des accidents par véhicule." />
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 border-l border-gray-800 bg-[#0c0d12]">
        <div className="w-full max-w-[380px] space-y-8">
          <div className="flex justify-center lg:hidden mb-8">
             <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
               <Car className="w-8 h-8 text-white" />
             </div>
          </div>

          <div className="bg-gray-800/30 p-1 rounded-xl flex">
            <button 
              onClick={() => setTab('signin')}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${tab === 'signin' ? 'bg-gray-700 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'}`}
            >
              Se connecter
            </button>
            <button 
              onClick={() => setTab('signup')}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${tab === 'signup' ? 'bg-gray-700 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'}`}
            >
              S'inscrire
            </button>
          </div>

          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {tab === 'signin' ? <SignInForm /> : <SignUpForm />}
            <FooterBranding />
          </motion.div>
        </div>
      </div>
    </div>
  );
};

const FeatureItem = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
  <div className="flex gap-4">
    <div className="w-10 h-10 rounded-xl bg-gray-800/50 border border-gray-700 flex items-center justify-center text-blue-400">
      {icon}
    </div>
    <div>
      <h3 className="font-semibold text-gray-100">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
    </div>
  </div>
);

const SignInForm = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setScreen, setCurrentUser } = useAuthStore();
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !password) return;
    setLoading(true);

    const normalizedLastName = lastName.trim().toUpperCase();
    const normalizedFirstName = firstName.trim().charAt(0).toUpperCase() + firstName.trim().slice(1).toLowerCase();
    const username = `${normalizedLastName} ${normalizedFirstName}`;

    try {
      const response = await apiClient.post<{
        user: SessionUser;
        appExpiryDate: string;
      }>('/auth/login', { username, password });

      const sessionUser = response.user;
      useAuthStore.getState().setAppExpiryDate(response.appExpiryDate);

      if (sessionUser.role !== 'admin' && response.appExpiryDate) {
        const today = new Date().toISOString().split('T')[0];
        if (today > response.appExpiryDate) {
          setCurrentUser(sessionUser);
          setScreen('expiry');
          return;
        }
      }

      setCurrentUser(sessionUser);
      setScreen('app');
      showToast(`Bienvenue, ${sessionUser.firstName} !`, 'success');
    } catch (err: any) {
      if (err.error === 'blocked') setScreen('blocked');
      else if (err.error === 'pending') setScreen('pending');
      else if (err.error === 'expired') setScreen('expiry');
      else showToast(err.error || 'Erreur lors de la connexion', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Nom</label>
          <input 
            type="text" 
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full bg-gray-900/50 border border-gray-800 rounded-lg px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
            placeholder="Ex: AMROUS"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Prénom</label>
          <input 
            type="text" 
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full bg-gray-900/50 border border-gray-800 rounded-lg px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
            placeholder="Ex: Abdallah"
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Mot de passe</label>
        <input 
          type="password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-gray-900/50 border border-gray-800 rounded-lg px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
          placeholder="••••••••"
          required
        />
      </div>
      <Button type="submit" className="w-full py-3" loading={loading}>
        Se connecter
      </Button>
    </form>
  );
};

const SignUpForm = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const { setScreen } = useAuthStore();
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { firstName, lastName, password, confirmPassword } = formData;

    if (password !== confirmPassword) {
      showToast('Les mots de passe ne correspondent pas', 'error');
      return;
    }

    if (password.length < 8) {
      showToast('Mot de passe trop court (min 8 caractères)', 'error');
      return;
    }

    const normalizedLastName = lastName.trim().toUpperCase();
    const normalizedFirstName = firstName.trim().charAt(0).toUpperCase() + firstName.trim().slice(1).toLowerCase();
    const username = `${normalizedLastName} ${normalizedFirstName}`;

    setLoading(true);
    try {
      await apiClient.post('/auth/register', { firstName, lastName, password });
      showToast('Compte créé ! En attente d\'approbation.', 'success');
      setScreen('pending');
    } catch (err: any) {
      showToast(err.error || 'Erreur lors de l\'inscription', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Prénom</label>
          <input 
            type="text" 
            value={formData.firstName}
            onChange={(e) => setFormData({...formData, firstName: e.target.value})}
            className="w-full bg-gray-900/50 border border-gray-800 rounded-lg px-4 py-2.5 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            required
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Nom</label>
          <input 
            type="text" 
            value={formData.lastName}
            onChange={(e) => setFormData({...formData, lastName: e.target.value})}
            className="w-full bg-gray-900/50 border border-gray-800 rounded-lg px-4 py-2.5 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            placeholder="Ex: AMROUS"
            required
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Mot de passe</label>
        <input 
          type="password" 
          value={formData.password}
          onChange={(e) => setFormData({...formData, password: e.target.value})}
          className="w-full bg-gray-900/50 border border-gray-800 rounded-lg px-4 py-2.5 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          required
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Confirmer</label>
        <input 
          type="password" 
          value={formData.confirmPassword}
          onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
          className="w-full bg-gray-900/50 border border-gray-800 rounded-lg px-4 py-2.5 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          required
        />
      </div>
      <Button type="submit" className="w-full py-3" loading={loading}>
        Créer un compte
      </Button>
      <p className="text-[11px] text-gray-500 text-center italic">
        Votre compte sera actif après approbation de l'administrateur.
      </p>
    </form>
  );
};
