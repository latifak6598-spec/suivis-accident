/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Vehicle {
  CODE: string;
  NEW_CODE?: string;
  DESIGNATION?: string;
  MARQUE?: string;
  MATRICULE?: string;
  CAPACITE?: string;
  CAPACITE_INDIVIDUELLE?: string;
  TYPE?: string;
  REGION?: string;
  NUM_SERIE?: string;
  ETAT?: string;
  AFFECTATION?: string;
  LIBELLE_AFFECTATION?: string;
  DATE_AFFECTATION?: string;
  DATE_ACHAT?: string;
  AGE_ANNEE_?: string;
  AGE_MOIS_?: string;
  PRIX_ACHAT?: string;
  DUREE_VIE?: string;
  [key: string]: string | undefined; // extra columns
}

export interface DocEntry {
  uploaded: boolean;
  fileName: string | null;
  fileId: string | null;
}

export interface AccRecord {
  dateAccident: string;
  raisonDegat: string;
  note: string;
  docs: Record<string, DocEntry>;
}

export interface ArchivedRecord extends AccRecord {
  archiveId: string;
  archivedAt: string;
}

export interface AccidentData {
  vehicleCode: string;
  current: AccRecord;
  archived: ArchivedRecord[];
}

export interface StoredFile {
  id: string;
  name: string;
  type: string;
  size: number;
  data: ArrayBuffer;
}

export type UserRole = 'admin' | 'user';
export type UserStatus = 'approved' | 'pending' | 'blocked';

export interface User {
  id?: number;
  username: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  lastLogin: string | null;
}

export interface AppSettings {
  key: string;
  value: string;
}

export interface ActivityEntry {
  id?: number; // auto-increment
  username: string;
  firstName: string;
  lastName: string;
  action: string;
  details: string;
  timestamp: string; // ISO string;
}

export interface FilterState {
  status: 'all' | 'c' | 'i' | 'a';
  dateFrom: string;
  dateTo: string;
  month: string;
  year: string;
  search: string;
}

export interface SessionUser {
  username: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export type AppScreen =
  | 'auth'
  | 'pending'
  | 'blocked'
  | 'expiry'
  | 'admin'
  | 'app';

export type DocStatus = 'c' | 'i' | 'a';

export interface DocConstant {
  key: string;
  label: string;
  icon: string;
}
