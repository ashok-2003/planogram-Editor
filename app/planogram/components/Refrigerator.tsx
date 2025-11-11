'use client';
import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePlanogramStore } from '@/lib/store';
import { RowComponent } from './row';
import { DropIndicator, DragValidation } from './planogramEditor';
import { layouts } from '@/lib/planogram-data';
import { PIXELS_PER_MM } from '@/lib/config';
import { BoundingBoxOverlay } from './BoundingBoxOverlay';
import { DoorConfig } from '@/lib/types';

interface RefrigeratorComponentProps {
  doorId?: string;
  doorIndex?: number;
  doorConfig?: DoorConfig;
  dropIndicator: DropIndicator;
  dragValidation: DragValidation;
  conflictIds: string[];
  selectedLayoutId: string;
  showBoundingBoxes?: boolean;
  headerHeight?: number;
  grilleHeight?: number;
}

// NEW: Export these constants so BoundingBoxOverlay can use them
export const DEFAULT_HEADER_HEIGHT = 100; // px
export const DEFAULT_GRILLE_HEIGHT = 90; // px
export const FRAME_BORDER = 16; // px

export function RefrigeratorComponent({ 
  doorId,
  doorIndex = 0,
  doorConfig,
  dropIndicator, 
  dragValidation, 
  conflictIds, 
  selectedLayoutId,
  showBoundingBoxes = false,
  headerHeight = DEFAULT_HEADER_HEIGHT,
  grilleHeight = DEFAULT_GRILLE_HEIGHT
}: RefrigeratorComponentProps) {
  const { refrigerator, refrigerators, isMultiDoor } = usePlanogramStore();
  // Get the correct refrigerator data based on door mode
  const currentRefrigerator = useMemo(() => {
    if (isMultiDoor && doorId && refrigerators[doorId]) {
      return refrigerators[doorId];
    }
    return refrigerator;
  }, [isMultiDoor, doorId, refrigerators, refrigerator]);
  
  const sortedRowIds = useMemo(() => Object.keys(currentRefrigerator).sort(), [currentRefrigerator]);
  // Get EXACT dimensions from layout or door config
  const dimensions = useMemo(() => {
    if (doorConfig) {
      return { width: doorConfig.width, height: doorConfig.height, name: doorConfig.id };
    }
    const layout = layouts[selectedLayoutId as keyof typeof layouts];
    if (layout) {
      // Handle both single-door and multi-door layouts
      const width = layout.width || (layout.doors?.[0]?.width ?? 600);
      const height = layout.height || (layout.doors?.[0]?.height ?? 800);
      return { width, height, name: layout.name };
    }
    return { width: 600, height: 800, name: 'Default' };
  }, [selectedLayoutId, doorConfig]);
  // Calculate total height from actual row heights
  const totalHeight = useMemo(() => {
    return Object.values(currentRefrigerator).reduce((sum, row) => sum + row.maxHeight, 0);
  }, [currentRefrigerator]);
  const hasItems = useMemo(() => 
    sortedRowIds.some(rowId => currentRefrigerator[rowId].stacks.length > 0),
    [sortedRowIds, currentRefrigerator]
  );

  // NEW: Calculate vertical offset for products (header pushes content down)
  const contentYOffset = headerHeight;

  return (
    <div id="refrigerator-capture" className="inline-flex flex-col shadow-2xl">
      {/* Outer Frame - Dark border like real fridge */}
      <div 
        className="bg-gradient-to-br from-gray-900 via-gray-800 to-black rounded-none p-4 shadow-2xl"
        style={{ 
          width: `${dimensions.width + (FRAME_BORDER * 2)}px` 
        }}
      >
        {/* Header Section - NOW CONFIGURABLE */}
        <div 
          className="bg-gradient-to-b from-blue-600 to-blue-700 p-3 rounded-t-xl border-b-4 border-blue-900 mb-4"
          style={{ 
            width: `${dimensions.width}px`,
            height: `${headerHeight}px` // NEW: Configurable height
          }}
        >
          <div className="flex flex-col gap-2 items-center justify-between h-full">
            <Badge variant="default" className="bg-white/95 text-blue-900 font-bold shadow-sm text-xs">
              {dimensions.name?.toUpperCase()}
            </Badge>
            <span className='text-xs text-white/80'>internal dimensions</span>
            <span className="text-xs text-white/95 font-semibold bg-black/20 px-2 py-1 rounded">
              {Math.ceil(dimensions.width / PIXELS_PER_MM)}mm × {Math.ceil(dimensions.height / PIXELS_PER_MM)}mm
            </span>
            {/* <span className="text-xs text-white/95 font-semibold bg-black/20 px-2 py-1 rounded">
              {Math.ceil(dimensions.width + 32)}mm × {Math.ceil(dimensions.height + headerHeight + grilleHeight + 32)}mm
            </span> */}
          </div>
        </div>
        
        {/* INTERNAL WORKING AREA - Uses EXACT real dimensions */}
        <div 
          className="relative bg-gradient-to-b from-slate-50 to-slate-100 rounded-sm"
          style={{
            width: `${dimensions.width}px`,  // EXACT internal width
            height: `${totalHeight}px`        // EXACT internal height
          }}
        >
          {/* Empty state overlay */}
          {!hasItems && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
              <div className="text-center text-muted-foreground/50">
                <p className="text-sm font-semibold">Drag products here</p>
                <p className="text-xs opacity-70">Start building your planogram</p>
              </div>
            </div>
          )}
          {/* Rows - Each uses exact height from row.maxHeight */}
          <div className="flex flex-col">
            {sortedRowIds.map((rowId) => (
              <RowComponent
                key={rowId}
                row={currentRefrigerator[rowId]}
                doorId={doorId}
                dropIndicator={dropIndicator}
                dragValidation={dragValidation}
                conflictIds={conflictIds}
              />
            ))}
          </div>

          {/* Bounding Box Debug Overlay - NOW RECEIVES OFFSET INFO */}
          <BoundingBoxOverlay 
            isVisible={showBoundingBoxes} 
            selectedLayoutId={selectedLayoutId}
            headerHeight={headerHeight}
            grilleHeight={grilleHeight}
            contentYOffset={contentYOffset}
          />
        </div>

        {/* Bottom Grille - NOW CONFIGURABLE */}
        <div 
          className="bg-gradient-to-b from-gray-800 to-gray-900 mt-4 rounded-b-xl overflow-hidden"
          style={{ 
            width: `${dimensions.width}px`,
            height: `${grilleHeight}px` // NEW: Configurable height
          }}
        >
          <div className="flex flex-col gap-2 py-3 px-4 h-full justify-center">
            {[...Array(5)].map((_, i) => (
              <div 
                key={i}
                className="h-1 bg-gradient-to-r from-transparent via-gray-700 to-transparent rounded-full"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}