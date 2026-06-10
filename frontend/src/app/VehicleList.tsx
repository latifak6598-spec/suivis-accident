/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useVehicleStore } from '../store/state';
import { VehicleCard } from './VehicleCard';
import { Button } from '../components/UI';
import { ChevronDown, LayoutGrid } from 'lucide-react';

const PAGE_SIZE = 60;

export const VehicleList: React.FC = () => {
  const { filteredCache, renderPage, setRenderPage } = useVehicleStore();

  const visibleVehicles = useMemo(() => {
    return filteredCache.slice(0, (renderPage + 1) * PAGE_SIZE);
  }, [filteredCache, renderPage]);

  const hasMore = visibleVehicles.length < filteredCache.length;

  const handleLoadMore = useCallback(() => {
    setRenderPage(renderPage + 1);
  }, [renderPage, setRenderPage]);

  if (filteredCache.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-4">
        <div className="w-16 h-16 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center">
          <LayoutGrid className="w-8 h-8 opacity-20" />
        </div>
        <p className="text-sm font-medium">Aucun véhicule ne correspond à vos critères.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="grid grid-cols-1 gap-4">
        {visibleVehicles.map((v) => (
          <VehicleCard key={v.CODE} vehicle={v} />
        ))}
      </div>

      {hasMore && (
        <div className="flex flex-col items-center pt-8 space-y-4">
          <p className="text-xs text-gray-500 font-medium">
            Affichage de {visibleVehicles.length} sur {filteredCache.length} véhicules
          </p>
          <Button 
            variant="outline" 
            className="gap-2 px-8 py-3 rounded-full border-gray-800 hover:border-blue-500/50 hover:bg-blue-500/5 hover:text-blue-400 transition-all"
            onClick={handleLoadMore}
          >
            <ChevronDown className="w-4 h-4" />
            Charger plus ({filteredCache.length - visibleVehicles.length} restants)
          </Button>
        </div>
      )}
    </div>
  );
};
