/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { 
  Vehicle, 
  AccidentData, 
  FilterState, 
  SessionUser, 
  AppScreen 
} from '../db/schema';

interface VehicleStore {
  vehicles: Vehicle[];
  accMap: Record<string, AccidentData>;
  filteredCache: Vehicle[];
  renderPage: number;
  flt: FilterState;
  setVehicles: (vehicles: Vehicle[]) => void;
  setAccMap: (accMap: Record<string, AccidentData>) => void;
  setFlt: (flt: Partial<FilterState>) => void;
  setFilteredCache: (filteredCache: Vehicle[]) => void;
  setRenderPage: (renderPage: number) => void;
}

export const useVehicleStore = create<VehicleStore>((set) => ({
  vehicles: [],
  accMap: {},
  filteredCache: [],
  renderPage: 0,
  flt: {
    status: 'all',
    dateFrom: '',
    dateTo: '',
    month: '',
    year: '',
    search: '',
  },
  setVehicles: (vehicles) => set({ vehicles }),
  setAccMap: (accMap) => set({ accMap }),
  setFlt: (flt) => set((state) => ({ flt: { ...state.flt, ...flt } })),
  setFilteredCache: (filteredCache) => set({ filteredCache }),
  setRenderPage: (renderPage) => set({ renderPage }),
}));

interface AuthStore {
  currentUser: SessionUser | null;
  screen: AppScreen;
  appExpiryDate: string;
  setCurrentUser: (currentUser: SessionUser | null) => void;
  setScreen: (screen: AppScreen) => void;
  setAppExpiryDate: (appExpiryDate: string) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  currentUser: null,
  screen: 'auth',
  appExpiryDate: '',
  setCurrentUser: (currentUser) => set({ currentUser }),
  setScreen: (screen) => set({ screen }),
  setAppExpiryDate: (appExpiryDate) => set({ appExpiryDate }),
}));

interface UIStore {
  pendingArchiveCode: string | null;
  setPendingArchiveCode: (pendingArchiveCode: string | null) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  pendingArchiveCode: null,
  setPendingArchiveCode: (pendingArchiveCode) => set({ pendingArchiveCode }),
}));
