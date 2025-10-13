'use client';
import { usePlanogramStore } from '@/lib/store';
import { RowComponent } from './row';
import { DropIndicator, DragValidation } from './planogramEditor';

interface RefrigeratorComponentProps {
  dropIndicator: DropIndicator;
  dragValidation: DragValidation;
  conflictIds: string[];
}

export function RefrigeratorComponent({ dropIndicator, dragValidation, conflictIds }: RefrigeratorComponentProps) {
  const refrigerator = usePlanogramStore((state) => state.refrigerator);
  const sortedRowIds = Object.keys(refrigerator).sort();

  return (
    <div 
      // Updated for a more realistic dark interior
      className="bg-gray-900 p-4 rounded-lg shadow-inner flex-grow border border-red-500 h-fit w-fit"
    >
      <div className="bg-black/20 p-2 rounded-t-md mb-4">
        <h2 className="text-2xl font-bold text-white text-center tracking-wider">PEPSICO</h2>
      </div>
      <div className="space-y-4 p-2 sm:p-4 flex flex-col items-center">
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
