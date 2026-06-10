/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Vehicle, AccidentData } from '../db/schema';
import { getStatus } from './status';

export function filterVehiclesForExport(
  vehicles: Vehicle[],
  accMap: Record<string, AccidentData>,
  incC: boolean,
  incI: boolean,
  incA: boolean,
  dfrom: string,
  dto: string,
  mon: string,
  yr: string
): Vehicle[] {
  return vehicles.filter(v => {
    const st = getStatus(v.CODE, accMap);
    if (st === 'c' && !incC) return false;
    if (st === 'i' && !incI) return false;
    if (st === 'a' && !incA) return false;
    
    const ds = accMap[v.CODE]?.current?.dateAccident || '';
    if (dfrom && ds && ds < dfrom) return false;
    if (dto && ds && ds > dto) return false;
    if (mon && ds && String(new Date(ds).getMonth() + 1) !== mon) return false;
    if (yr && ds && String(new Date(ds).getFullYear()) !== yr) return false;
    
    return true;
  });
}

export function sanitizeFolder(s: string): string {
  return String(s || '')
    .replace(/[\\\/\:\*\?\"\<\>\|]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 60)
    || 'vehicule';
}
