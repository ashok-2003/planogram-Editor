'use client';

import { usePlanogramStore } from '@/lib/store';
import { Item, Sku } from '@/lib/types';
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { PIXELS_PER_MM } from '@/lib/config';

interface InfoPanelProps {
  availableSkus: Sku[];
}

export function InfoPanel({ availableSkus }: InfoPanelProps) {
  const selectedItemId = usePlanogramStore((state) => state.selectedItemId);
  const refrigerator = usePlanogramStore((state) => state.refrigerator);
  const actions = usePlanogramStore((state) => state.actions);

  const [isReplacing, setIsReplacing] = useState(false);

  const selectedItem: Item | null = useMemo(() => {
    if (!selectedItemId) {
      setIsReplacing(false); // Reset replace mode when item is deselected
      return null;
    }
    for (const rowId in refrigerator) {
      for (const stack of refrigerator[rowId].stacks) {
        const item = stack.find((i) => i.id === selectedItemId);
        if (item) return item;
      }
    }
    return null;
  }, [selectedItemId, refrigerator]);

  const handleReplace = (sku: Sku) => {
    actions.replaceSelectedItem(sku);
    setIsReplacing(false);
  }

  if (!selectedItem) {
    return (
      <aside className="p-6 bg-white rounded-lg shadow-md h-fit sticky top-8">
        <h2 className="text-xl font-bold text-gray-800">Properties</h2>
        <p className="text-gray-500 mt-2">Select an item to see its details and available actions.</p>
      </aside>
    );
  }

  return (
    <aside className="p-6 bg-white rounded-lg shadow-md h-fit sticky top-8">
      <AnimatePresence mode="wait">
        {isReplacing ? (
          <motion.div
            key="replace-view"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">Replace Item</h2>
              <button onClick={() => setIsReplacing(false)} className="text-sm font-semibold text-gray-600 hover:text-gray-900">&larr; Back</button>
            </div>
            <p className="text-sm text-gray-500 mt-1">Select a new product to replace '{selectedItem.name}'.</p>
            <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
              {availableSkus.map(sku => (
                <button
                  key={sku.skuId}
                  onClick={() => handleReplace(sku)}
                  className="w-full text-left p-2 flex items-center gap-3 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <img src={sku.imageUrl} alt={sku.name} className="w-8 h-12 object-contain flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-700">{sku.name}</span>
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="details-view"
            initial={{ opacity: 0, x: 0 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ duration: 0.2 }}
          >
            <h2 className="text-xl font-bold text-gray-800">Properties</h2>
            <div className="items-center mt-4 max-h-16 max-w-16">
              <img src={selectedItem.imageUrl} alt={selectedItem.name} className="rounded-md border border-gray-200 object-contain max-h-16" />
            </div>
            <div className="mt-4 space-y-2">
              <div>
                <p className="text-sm font-medium text-gray-500">Product Name</p>
                <p className="text-md font-semibold text-gray-900">{selectedItem.name}</p>
                <span className='text-sm font-medium text-gray-700'>{`height: ${selectedItem.height / PIXELS_PER_MM}mm, width: ${selectedItem.width / PIXELS_PER_MM}mm `}</span>
              </div>
            </div>
            
            <div className="mt-6 space-y-3">
              <h3 className="font-semibold text-gray-700">Actions</h3>

              {/* --- ADVANCED DUPLICATE --- */}
              {selectedItem.constraints.stackable ? (
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={actions.duplicateAndStack} className="w-full text-center bg-blue-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors text-sm">
                    Duplicate (Stack)
                  </button>
                   <button onClick={actions.duplicateAndAddNew} className="w-full text-center bg-blue-100 text-blue-800 font-bold py-2 px-4 rounded-lg hover:bg-blue-200 transition-colors text-sm">
                    Duplicate (New)
                  </button>
                </div>
              ) : (
                 <button onClick={actions.duplicateAndAddNew} className="w-full text-center bg-blue-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors">
                    Duplicate
                  </button>
              )}

              {/* --- REPLACE BUTTON --- */}
              <button onClick={() => setIsReplacing(true)} className="w-full text-center bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors">
                Replace
              </button>

              {/* --- DELETE BUTTON --- */}
              {selectedItem.constraints.deletable && (
                  <button onClick={actions.deleteSelectedItem} className="w-full text-center bg-red-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-600 transition-colors">
                    Delete
                  </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}