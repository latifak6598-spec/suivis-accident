/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function safeid(s: string): string {
  return s.replace(/[^a-zA-Z0-9]/g, '_');
}
