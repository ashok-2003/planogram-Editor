'use client';
import { usePlanogramStore } from '@/lib/store';
import { RowComponent } from './row';
import { DropIndicator, DragValidation } from './planogramEditor';
import { layouts } from '@/lib/planogram-data';
import { useMemo } from 'react';

interface RefrigeratorComponentProps {
  dropIndicator: DropIndicator;
  dragValidation: DragValidation;
  conflictIds: string[];
  selectedLayoutId: string; // Need to know which layout is active
}

export function RefrigeratorComponent({ dropIndicator, dragValidation, conflictIds, selectedLayoutId }: RefrigeratorComponentProps) {
  const refrigerator = usePlanogramStore((state) => state.refrigerator);
  const sortedRowIds = Object.keys(refrigerator).sort();

  // Get the dimensions for the currently selected layout
  const dimensions = useMemo(() => {
    const layout = layouts[selectedLayoutId as keyof typeof layouts];
    if (layout) {
      return { width: layout.width, height: layout.height };
    }
    // Fallback dimensions
    return { width: 600, height: 800 };
  }, [selectedLayoutId]);

  return (
    <div
      className="bg-black/20 p-4 rounded-lg shadow-inner border border-gray-700/50 flex flex-col"
    >
      <div className="bg-blue-600/60 p-2 rounded-t-md mb-4 flex-shrink-0">
        <h2 className="text-2xl font-bold text-black text-center tracking-wider">PEPSICO</h2>
      </div>
      {/* This container now grows to fill the remaining space */}
      <div className="space-y-0 flex flex-col items-center bg-white"
        // Apply the dynamic dimensions here
        style={{
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`
        }}
      >
        {sortedRowIds.map(rowId => (
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
  );
}