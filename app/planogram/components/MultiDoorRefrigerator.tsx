'use client';
import React, { useMemo } from 'react';
import { usePlanogramStore } from '@/lib/store';
import { RefrigeratorComponent } from './Refrigerator';
import { DropIndicator, DragValidation } from './planogramEditor';
import { layouts } from '@/lib/planogram-data';

interface MultiDoorRefrigeratorProps {
  dropIndicator: DropIndicator;
  dragValidation: DragValidation;
  conflictIds: string[];
  selectedLayoutId: string;
  showBoundingBoxes?: boolean;
}

/**
 * MultiDoorRefrigerator Component
 * 
 * Renders multiple refrigerator doors side-by-side for multi-door layouts.
 * For single-door layouts, renders a single RefrigeratorComponent.
 */
export function MultiDoorRefrigerator({
  dropIndicator,
  dragValidation,
  conflictIds,
  selectedLayoutId,
  showBoundingBoxes = false
}: MultiDoorRefrigeratorProps) {
  const { isMultiDoor, refrigerators } = usePlanogramStore();

  // Get layout data to determine door configuration
  const layoutData = useMemo(() => {
    return layouts[selectedLayoutId as keyof typeof layouts];
  }, [selectedLayoutId]);

  // Get door IDs in sorted order
  const doorIds = useMemo(() => {
    if (!isMultiDoor || !layoutData?.doors) {
      return ['door-1']; // Single door mode
    }
    return layoutData.doors.map(door => door.id).sort();
  }, [isMultiDoor, layoutData]);

  // Single door mode - render one refrigerator
  if (doorIds.length === 1) {
    return (
      <RefrigeratorComponent
        doorId={doorIds[0]}
        doorIndex={0}
        doorConfig={layoutData?.doors?.[0]}
        dropIndicator={dropIndicator}
        dragValidation={dragValidation}
        conflictIds={conflictIds}
        selectedLayoutId={selectedLayoutId}
        showBoundingBoxes={showBoundingBoxes}
      />
    );
  }

  // Multi-door mode - render multiple refrigerators side-by-side
  return (
    <div className="flex gap-8 items-start">
      {doorIds.map((doorId, index) => {
        const doorConfig = layoutData?.doors?.[index];
        
        return (
          <div key={doorId} className="flex flex-col gap-2">            {/* Door Label */}
            <div className="text-center">
              <span className="text-sm font-semibold text-gray-700 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200">
                {doorId.replace('-', ' ').toUpperCase()}
              </span>
            </div>
            
            {/* Refrigerator Door */}
            <RefrigeratorComponent
              doorId={doorId}
              doorIndex={index}
              doorConfig={doorConfig}
              dropIndicator={dropIndicator}
              dragValidation={dragValidation}
              conflictIds={conflictIds}
              selectedLayoutId={selectedLayoutId}
              showBoundingBoxes={showBoundingBoxes}
            />
          </div>
        );
      })}
    </div>
  );
}
