// app/planogram/_components/InfoPanel.tsx
'use client';

import { usePlanogramStore } from '@/lib/store';
import { Item } from '@/lib/types';
import { useMemo } from 'react';

export function InfoPanel() {
  // --- FIX START ---
  // Apply the same pattern here: select state individually.
  const selectedItemId = usePlanogramStore((state) => state.selectedItemId);
  const refrigerator = usePlanogramStore((state) => state.refrigerator);
  const actions = usePlanogramStore((state) => state.actions);
  // --- FIX END ---

  const selectedItem: Item | null = useMemo(() => {
    if (!selectedItemId) return null;
    for (const rowId in refrigerator) {
      for (const stack of refrigerator[rowId].stacks) {
        const item = stack.find((i) => i.id === selectedItemId);
        if (item) return item;
      }
    }
    return null;
  }, [selectedItemId, refrigerator]);

  if (!selectedItem) {
    return (
      <aside className="p-6 bg-white rounded-lg shadow-md h-fit">
        <h2 className="text-xl font-bold text-gray-800">Properties</h2>
        <p className="text-gray-500 mt-2">Select an item to see its details and available actions.</p>
      </aside>
    );
  }

  return (
    <aside className="p-6 bg-white rounded-lg shadow-md h-fit">
      <h2 className="text-xl font-bold text-gray-800">Properties</h2>
      
      <div className="mt-4">
        <img src={selectedItem.imageUrl} alt={selectedItem.name} className="rounded-md border border-gray-200 object-contain mx-auto" />
      </div>

      <div className="mt-4 space-y-2">
        <div>
            <p className="text-sm font-medium text-gray-500">Product Name</p>
            <p className="text-md font-semibold text-gray-900">{selectedItem.name}</p>
        </div>
         <div>
            <p className="text-sm font-medium text-gray-500">Dimensions (WxH)</p>
            <p className="text-md text-gray-900">{selectedItem.width} x {selectedItem.height}</p>
        </div>
         <div>
            <p className="text-sm font-medium text-gray-500">Instance ID</p>
            <p className="text-xs text-gray-500 break-all">{selectedItem.id}</p>
        </div>
      </div>
      
      <div className="mt-6 space-y-3">
         <h3 className="font-semibold text-gray-700">Actions</h3>
         <button
            onClick={actions.duplicateSelectedItem}
            className="w-full text-center bg-blue-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
         >
            Duplicate
        </button>
        {selectedItem.constraints.deletable && (
             <button
                onClick={actions.deleteSelectedItem}
                className="w-full text-center bg-red-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-600 transition-colors"
             >
                Delete
            </button>
        )}
      </div>
    </aside>
  );
}