/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function esc(s: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return s.replace(/[&<>"']/g, (m) => map[m]);
}
