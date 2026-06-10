import React, { useEffect, useState } from 'react';
import { useAuthStore, useVehicleStore } from './store/state';
import { apiClient } from './api/client';
import { isAppExpired, reloadFleetData } from './features/fleetData';
import { AuthScreen } from './auth/AuthScreen';
import { PendingScreen, BlockedScreen, ExpiryScreen } from './auth/StatusScreens';
import { MainApp } from './app/MainApp';
import { AdminPanel } from './admin/AdminPanel';
import { Spinner } from './components/UI';
import { DocumentViewer } from './components/DocumentViewer';
import { SessionUser } from './db/schema';

interface MeResponse {
  user: SessionUser & { status?: string };
  appExpiryDate: string;
}

function resolveScreen(user: SessionUser & { status?: string }, expiryDate: string) {
  if (user.status === 'blocked') return 'blocked' as const;
  if (user.status === 'pending') return 'pending' as const;
  if (user.role !== 'admin' && isAppExpired(expiryDate)) return 'expiry' as const;
  return 'app' as const;
}

export default function App() {
  const { screen, setScreen, currentUser, setCurrentUser, setAppExpiryDate } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        try {
          const res = await apiClient.get<MeResponse>('/auth/me');
          if (res.user) {
            setCurrentUser(res.user);
            setAppExpiryDate(res.appExpiryDate);
            setScreen(resolveScreen(res.user, res.appExpiryDate));
          }
        } catch (e: unknown) {
          const err = e as { error?: string };
          if (err?.error === 'expired') {
            setScreen('expiry');
          } else {
            setScreen('auth');
          }
        }

        const currentScreen = useAuthStore.getState().screen;
        if (currentScreen === 'app' || currentScreen === 'admin') {
          await reloadFleetData();
        }
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setIsInitializing(false);
      }
    };

    init();
  }, [setScreen, setCurrentUser, setAppExpiryDate]);

  if (isInitializing) {
    return (
      <div className="fixed inset-0 bg-[#0c0d12] flex flex-col items-center justify-center space-y-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20 relative z-10">
            <Spinner size="lg" className="h-12 w-12" />
          </div>
          <div className="absolute -inset-4 bg-blue-500/20 blur-3xl rounded-full animate-pulse" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-white">Initialisation</h2>
          <p className="text-sm text-gray-500 font-medium uppercase tracking-widest">
            Connexion au serveur sécurisé...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c0d12] text-gray-100 selection:bg-blue-500/30">
      {screen === 'auth' && <AuthScreen />}
      {screen === 'pending' && <PendingScreen />}
      {screen === 'blocked' && <BlockedScreen />}
      {screen === 'expiry' && <ExpiryScreen />}
      {screen === 'app' && <MainApp />}
      {screen === 'admin' && <AdminPanel />}
      <DocumentViewer />
    </div>
  );
}
