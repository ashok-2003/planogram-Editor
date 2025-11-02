'use client';
import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePlanogramStore } from '@/lib/store';
import { RowComponent } from './row';
import { DropIndicator, DragValidation } from './planogramEditor';
import { layouts } from '@/lib/planogram-data';
import { PIXELS_PER_MM } from '@/lib/config';

interface RefrigeratorComponentProps {
  dropIndicator: DropIndicator;
  dragValidation: DragValidation;
  conflictIds: string[];
  selectedLayoutId: string;
}

export function RefrigeratorComponent({ 
  dropIndicator, 
  dragValidation, 
  conflictIds, 
  selectedLayoutId 
}: RefrigeratorComponentProps) {
  const refrigerator = usePlanogramStore((state) => state.refrigerator);
  const sortedRowIds = useMemo(() => Object.keys(refrigerator).sort(), [refrigerator]);

  // Get EXACT dimensions from layout - these are the REAL internal dimensions
  const dimensions = useMemo(() => {
    const layout = layouts[selectedLayoutId as keyof typeof layouts];
    if (layout) {
      return { width: layout.width, height : layout.height , name : layout.name};
    }
    return { width: 600, height: 800, name: 'Default' };
  }, [selectedLayoutId]);

  // Calculate total height from actual row heights
  const totalHeight = useMemo(() => {
    return Object.values(refrigerator).reduce((sum, row) => sum + row.maxHeight, 0);
  }, [refrigerator]);

  const hasItems = useMemo(() => 
    sortedRowIds.some(rowId => refrigerator[rowId].stacks.length > 0),
    [sortedRowIds, refrigerator]
  );

  // Border widths for visual frame (these DON'T affect internal dimensions)
  const FRAME_BORDER = 16; // px - visual border around fridge
  const HEADER_HEIGHT = 56; // px - header section
  const GRILLE_HEIGHT = 48; // px - bottom grille

  return (
    <div className="inline-flex flex-col shadow-2xl">
      {/* Outer Frame - Dark border like real fridge */}
      <div 
        className="bg-gradient-to-br from-gray-900 via-gray-800 to-black rounded-sm p-4 shadow-2xl"
        style={{ 
          width: `${dimensions.width + (FRAME_BORDER * 2)}px` 
        }}
      >
        {/* Header Section */}
        <div 
          className="bg-gradient-to-b from-blue-600 to-blue-700 p-3 rounded-t-xl border-b-4 border-blue-900 mb-4"
          style={{ width: `${dimensions.width}px` }}
        >
          <div className="flex flex-col gap-4 items-center justify-between">
            <Badge variant="secondary" className="bg-white/95 text-blue-900 font-bold shadow-sm text-xs">
              {dimensions.name?.toUpperCase()}
            </Badge>
            <span className="text-xs text-white/95 font-semibold bg-black/20 px-2 py-1 rounded">
              {Math.ceil(dimensions.width / PIXELS_PER_MM) }mm × { Math.ceil(dimensions.height / PIXELS_PER_MM) }mm
            </span>
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
                row={refrigerator[rowId]}
                dropIndicator={dropIndicator}
                dragValidation={dragValidation}
                conflictIds={conflictIds}
              />
            ))}
          </div>
        </div>

        {/* Bottom Grille */}
        <div 
          className="bg-gradient-to-b from-gray-800 to-gray-900 mt-4 rounded-b-xl overflow-hidden"
          style={{ width: `${dimensions.width}px` }}
        >
          <div className="flex flex-col gap-2 py-3 px-4">
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