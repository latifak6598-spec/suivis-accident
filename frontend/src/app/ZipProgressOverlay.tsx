/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Package as PackageIcon } from 'lucide-react';

interface ZipProgressOverlayProps {
  progress: number;
  message: string;
  isVisible: boolean;
}

export const ZipProgressOverlay: React.FC<ZipProgressOverlayProps> = ({ progress, message, isVisible }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[2000] bg-[#0c0d12]/80 backdrop-blur-md flex items-center justify-center p-8"
        >
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 mx-auto mb-6">
              <PackageIcon className="w-8 h-8" />
            </div>

            <h2 className="text-lg font-bold text-gray-100 mb-2">Génération du ZIP en cours…</h2>
            <p className="text-sm text-gray-400 font-mono mb-8">{message || 'Préparation...'}</p>

            <div className="space-y-2">
              <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.2 }}
                />
              </div>
              <div className="text-right">
                <span className="text-xs font-mono text-gray-500">{Math.round(progress)}%</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
