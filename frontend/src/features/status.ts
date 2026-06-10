/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DocConstant, AccidentData } from '../db/schema';

export const DOCS: DocConstant[] = [
  { key: 'accidentReport', label: "Rapport d'accident", icon: '📋' },
  { key: 'accidentPhoto', label: "Photo d'accident", icon: '📸' },
  { key: 'accidentDocs', label: "Documents de l'accident", icon: '📁' },
  { key: 'caarCashReport', label: 'Rapport CAAR / CASH', icon: '🏦' },
  { key: 'expertiseReport', label: "PV d'expertise", icon: '🔍' },
  { key: 'workRequest', label: 'Demande de travail', icon: '🔧' },
];

export function getStatus(code: string, accMap: Record<string, AccidentData>): 'c' | 'i' | 'a' {
  if (!accMap) return 'i';
  const acc = accMap[code];
  if (!acc || !acc.current) return 'i';

  const uploadedCount = Object.values(acc.current.docs).filter(d => d.uploaded).length;
  if (uploadedCount === 6) return 'c';
  if (uploadedCount > 0) return 'a';
  return 'i';
}

export function getMissing(code: string, accMap: Record<string, AccidentData>): string[] {
  if (!accMap) return DOCS.map(d => d.label);
  const acc = accMap[code];
  if (!acc || !acc.current) return DOCS.map(d => d.label);

  return DOCS.filter(d => !acc.current.docs[d.key]?.uploaded).map(d => d.label);
}
