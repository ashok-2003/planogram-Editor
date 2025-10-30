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

  // Get width from layout
  const dimensions = useMemo(() => {
    const layout = layouts[selectedLayoutId as keyof typeof layouts];
    if (layout) {
      return { width: layout.width };
    }
    return { width: 600 };
  }, [selectedLayoutId]);

  // Calculate height dynamically from actual row heights
  const totalHeight = useMemo(() => {
    return Object.values(refrigerator).reduce((sum, row) => sum + row.maxHeight, 0);
  }, [refrigerator]);
  return (
    <div
      className="bg-blue-200 p-4 rounded-lg shadow-inner border border-gray-700/50 flex flex-col h-fit"
    >      <div className="bg-blue-600/80 p-2 rounded-t-md mb-4 flex-shrink-0 h-12">
        <h2 className="text-2xl font-bold text-black text-center tracking-wider"></h2>
      </div>
      {/* Container height adapts to sum of row heights */}
      <div className="flex flex-col bg-white"
        style={{
          width: `${dimensions.width}px`,
          minHeight: `${totalHeight}px`
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
      
      {/* Bottom Grille/Vent Section */}
      <div 
        className="bg-gray-900 border-t-8 border-gray-800 flex flex-col gap-1 py-3 px-4"
        style={{ width: `${dimensions.width}px` }}
      >
        {/* Horizontal slats */}
        {[...Array(8)].map((_, i) => (
          <div 
            key={i}
            className="h-1 bg-gray-700 rounded-sm shadow-inner"
          />
        ))}
      </div>
    </div>
  );
}