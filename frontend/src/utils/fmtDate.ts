/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function fmtDate(s: string): string {
  if (!s) return '';
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return d.toLocaleDateString('fr-DZ', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  } catch {
    return s;
  }
}

export function fmtDateTime(s: string): string {
  if (!s) return '';
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return d.toLocaleDateString('fr-DZ', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    }) + ' ' + d.toLocaleTimeString('fr-DZ', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  } catch {
    return s;
  }
}
