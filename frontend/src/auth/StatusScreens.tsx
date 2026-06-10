/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { useAuthStore } from '../store/state';
import { apiClient } from '../api/client';
import { Button } from '../components/UI';
import { Clock, Ban, Lock, LogOut, Phone, Mail } from 'lucide-react';

const FooterBranding = () => (
  <p className="text-sm text-gray-400 text-center mt-8 font-medium">
    Réalisé par AMROUS Ayham, Propriété de AMROUS Abdallah
  </p>
);

const StatusScreen: React.FC<{ 
  icon: React.ReactNode; 
  title: string; 
  message: string; 
  colorClass: string;
}> = ({ icon, title, message, colorClass }) => {
  const { setScreen, setCurrentUser } = useAuthStore();

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout', {});
    } catch(e) {}
    setCurrentUser(null);
    setScreen('auth');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#05060a] p-6">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-red-500/5" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-[440px] bg-[#0c0d12] border border-gray-800 rounded-2xl shadow-2xl p-8 text-center space-y-8"
      >
        <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center bg-gray-900 border border-gray-800 shadow-xl ${colorClass}`}>
          {icon}
        </div>

        <div className="space-y-3">
          <h1 className={`text-2xl font-bold tracking-tight ${colorClass}`}>{title}</h1>
          <p className="text-gray-400 leading-relaxed">{message}</p>
        </div>

        <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800 space-y-4">
          <div className="flex items-center justify-center gap-3 text-gray-300">
            <Phone className="w-4 h-4 text-blue-400" />
            <span className="font-medium">0699407036</span>
          </div>
          <div className="flex items-center justify-center gap-3 text-gray-300">
            <Mail className="w-4 h-4 text-blue-400" />
            <span className="font-medium">abdallahamrous@gmail.com</span>
          </div>
        </div>

        <Button 
          variant="secondary" 
          className="w-full py-3 gap-2"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4" />
          Se déconnecter
        </Button>
        <FooterBranding />
      </motion.div>
    </div>
  );
};

export const PendingScreen = () => (
  <StatusScreen 
    icon={<Clock className="w-10 h-10" />}
    title="Compte en attente"
    message="Votre compte a été créé avec succès. Il doit maintenant être approuvé par l'administrateur avant que vous puissiez accéder à l'application."
    colorClass="text-amber-400"
  />
);

export const BlockedScreen = () => (
  <StatusScreen 
    icon={<Ban className="w-10 h-10" />}
    title="Accès bloqué"
    message="Votre accès à cette application a été suspendu par l'administrateur. Veuillez contacter le support pour plus d'informations."
    colorClass="text-red-400"
  />
);

export const ExpiryScreen = () => (
  <StatusScreen 
    icon={<Lock className="w-10 h-10" />}
    title="Application expirée"
    message="Votre accès à cette application a expiré. Veuillez contacter le propriétaire pour renouveler votre accès."
    colorClass="text-red-400"
  />
);
