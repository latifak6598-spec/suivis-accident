/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Vehicle, AccidentData, FilterState } from '../db/schema';
import { getStatus } from './status';

export function getFiltered(
  vehicles: Vehicle[],
  accMap: Record<string, AccidentData>,
  flt: FilterState
): Vehicle[] {
  if (!accMap || !vehicles) return [];
  return vehicles.filter((v) => {
    const acc = accMap[v.CODE];
    const status = getStatus(v.CODE, accMap);

    // Status filter
    if (flt.status !== 'all' && status !== flt.status) return false;

    // Search filter
    if (flt.search) {
      const s = flt.search.toLowerCase();
      let match = 
        (String(v.CODE || '').toLowerCase().includes(s)) ||
        (String(v.MATRICULE || '').toLowerCase().includes(s)) ||
        (String(v.LIBELLE_AFFECTATION || '').toLowerCase().includes(s)) ||
        (String(v.AFFECTATION || '').toLowerCase().includes(s)) ||
        (String(v.DESIGNATION || '').toLowerCase().includes(s)) ||
        (String(acc?.current?.raisonDegat || '').toLowerCase().includes(s)) ||
        (String(acc?.current?.note || '').toLowerCase().includes(s));
      
      if (!match && acc?.archived) {
        match = acc.archived.some(arch => 
          (String(arch.raisonDegat || '').toLowerCase().includes(s)) ||
          (String(arch.note || '').toLowerCase().includes(s))
        );
      }
      if (!match) return false;
    }

    // Date filters
    const checkDate = (dt: string) => {
      if (flt.dateFrom && dt < flt.dateFrom) return false;
      if (flt.dateTo && dt > flt.dateTo) return false;
      if (flt.month) {
        const m = dt.split('-')[1];
        if (m !== flt.month) return false;
      }
      if (flt.year) {
        const y = dt.split('-')[0];
        if (y !== flt.year) return false;
      }
      return true;
    };

    if (flt.dateFrom || flt.dateTo || flt.month || flt.year) {
      let dateMatch = false;
      if (acc?.current?.dateAccident && checkDate(acc.current.dateAccident)) {
        dateMatch = true;
      }
      if (!dateMatch && acc?.archived) {
        dateMatch = acc.archived.some(arch => arch.dateAccident && checkDate(arch.dateAccident));
      }
      if (!dateMatch) return false;
    }

    return true;
  });
}

export function syncYears(accMap: Record<string, AccidentData>): string[] {
  if (!accMap) return [];
  const years = new Set<string>();
  Object.values(accMap).forEach((acc) => {
    if (acc.current.dateAccident) {
      years.add(acc.current.dateAccident.split('-')[0]);
    }
    acc.archived.forEach((arch) => {
      if (arch.dateAccident) {
        years.add(arch.dateAccident.split('-')[0]);
      }
    });
  });
  return Array.from(years).sort((a, b) => b.localeCompare(a));
}
