// app/planogram/_components/Refrigerator.tsx
'use client';
import { usePlanogramStore } from '@/lib/store';
import { RowComponent } from './row';
import { DropIndicator } from './planogramEditor';

// The props for this component now need to be defined
interface RefrigeratorComponentProps {
  dropIndicator: DropIndicator;
}

export function RefrigeratorComponent({ dropIndicator }: RefrigeratorComponentProps) {
  const refrigerator = usePlanogramStore((state) => state.refrigerator);
  const sortedRowIds = Object.keys(refrigerator).sort();

  return (
    <div 
      className="bg-gray-800 p-4 rounded-lg shadow-inner flex-grow"
      style={{ 
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }}
    >
      <div className="bg-gray-900/50 p-2 rounded-t-md">
        <h2 className="text-2xl font-bold text-white text-center tracking-wider">PEPSICO</h2>
      </div>
      <div className="space-y-4 p-2 sm:p-4">
        {sortedRowIds.map(rowId => (
          // The dropIndicator is now passed down to each row
          <RowComponent key={rowId} row={refrigerator[rowId]} dropIndicator={dropIndicator} />
        ))}
      </div>
    </div>
  );
}
