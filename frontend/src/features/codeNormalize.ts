/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function normalizeCode(code: string): string {
  const s = String(code).trim();
  if (/^\d+$/.test(s) && s.length < 7) return s.padStart(7, '0');
  return s;
}
