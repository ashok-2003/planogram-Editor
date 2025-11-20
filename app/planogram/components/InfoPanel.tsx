'use client';

import { usePlanogramStore } from '@/lib/store';
import { Item, Sku } from '@/lib/types';
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { PIXELS_PER_MM } from '@/lib/config';

interface InfoPanelProps {
  availableSkus: Sku[];
  isRulesEnabled: boolean;
}

// NEW: Blank Space Width Adjuster Component
interface BlankSpaceWidthAdjusterProps {
  selectedItem: Item;
  refrigerator: { [key: string]: { capacity: number; stacks: Item[][]; } };
  onWidthChange: (itemId: string, newWidthMM: number) => void;
}

function BlankSpaceWidthAdjuster({ selectedItem, refrigerator, onWidthChange }: BlankSpaceWidthAdjusterProps) {
  const [inputValue, setInputValue] = useState(Math.round(selectedItem.width / PIXELS_PER_MM).toString());
  
  // Calculate available width
  const availableWidth = useMemo(() => {
    // Find which row the item is in
    for (const rowId in refrigerator) {
      const row = refrigerator[rowId];
      for (const stack of row.stacks) {
        if (stack.some(item => item.id === selectedItem.id)) {
          // Calculate used width (excluding current item)
          const usedWidth = row.stacks.reduce((sum, st) => {
            return sum + st.reduce((s, item) => 
              item.id === selectedItem.id ? 0 : s + item.width, 0
            );
          }, 0);
          
          return row.capacity - usedWidth;
        }
      }
    }
    return 0;
  }, [selectedItem, refrigerator]);
    const currentWidthMM = Math.round(selectedItem.width / PIXELS_PER_MM);
  const maxWidthMM = Math.floor(availableWidth / PIXELS_PER_MM);
  const minWidthMM = 25;
  
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value);
    setInputValue(newValue.toString());
    onWidthChange(selectedItem.id, newValue);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };
  
  const handleInputBlur = () => {
    const newValue = Number(inputValue);
    if (!isNaN(newValue) && newValue >= minWidthMM && newValue <= maxWidthMM) {
      // Round to nearest 5mm
      const rounded = Math.round(newValue / 5) * 5;
      setInputValue(rounded.toString());
      onWidthChange(selectedItem.id, rounded);
    } else {
      // Reset to current value if invalid
      setInputValue(currentWidthMM.toString());
    }
  };
  
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleInputBlur();
    }
  };
    return (
    <div className="my-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-bold text-blue-900">
          📏 Width Adjustment
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            min={minWidthMM}
            max={maxWidthMM}
            step={5}
            className="w-16 px-2 py-1 text-sm font-semibold text-gray-900 bg-white border-2 border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-xs font-medium text-blue-700">mm</span>
        </div>
      </div>
      
      {/* Visual progress bar */}
      <div className="mb-3 h-6 bg-white rounded-lg border-2 border-blue-300 overflow-hidden relative shadow-inner">
        <div 
          className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-200 ease-out flex items-center justify-center"
          style={{ width: `${(currentWidthMM / maxWidthMM) * 100}%` }}
        >
          <span className="text-xs font-bold text-white drop-shadow">
            {currentWidthMM}mm
          </span>
        </div>
      </div>
      
      {/* Slider */}
      <div className="space-y-2">
        <input
          type="range"
          min={minWidthMM}
          max={maxWidthMM}
          step={5}
          value={currentWidthMM}
          onChange={handleSliderChange}
          className="w-full h-3 bg-blue-200 rounded-lg appearance-none cursor-pointer slider-thumb"
          style={{
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentWidthMM / maxWidthMM) * 100}%, #dbeafe ${(currentWidthMM / maxWidthMM) * 100}%, #dbeafe 100%)`
          }}
        />
        
        <div className="flex justify-between text-xs text-gray-600">
          <span className="font-medium">Min: {minWidthMM}mm</span>
          <span className="font-medium text-blue-600">Available: {maxWidthMM}mm</span>
        </div>
      </div>
      
      <p className="mt-3 text-xs text-blue-700 italic flex items-start gap-1">
        <span>Drag slider or type width. Steps of 5mm.</span>
      </p>
    </div>
  );
}

export function InfoPanel({ availableSkus, isRulesEnabled }: InfoPanelProps) {
  const selectedItemId = usePlanogramStore((state) => state.selectedItemId);
  const refrigerator = usePlanogramStore((state) => state.refrigerator);
  // REFACTOR: Add multi-door support
  const isMultiDoor = usePlanogramStore((state) => state.isMultiDoor);
  const refrigerators = usePlanogramStore((state) => state.refrigerators);
  const actions = usePlanogramStore((state) => state.actions);

  const [isReplacing, setIsReplacing] = useState(false);

  // REFACTOR: Use findStackLocation for multi-door support
  const selectedItem: Item | null = useMemo(() => {
    if (!selectedItemId) {
      setIsReplacing(false); // Reset replace mode when item is deselected
      return null;
    }
    
    const { findStackLocation } = usePlanogramStore.getState();
    const location = findStackLocation(selectedItemId);
    
    if (!location) return null;
    
    // Get the correct refrigerator data (multi-door aware)
    const refrigeratorData = isMultiDoor && location.doorId 
      ? refrigerators[location.doorId] 
      : refrigerator;
    
    const row = refrigeratorData[location.rowId];
    if (!row) return null;
    
    const stack = row.stacks[location.stackIndex];
    if (!stack) return null;
    
    return stack[location.itemIndex] || null;
  }, [selectedItemId, refrigerator, isMultiDoor, refrigerators]);

  const handleReplace = (sku: Sku) => {
    actions.replaceSelectedItem(sku, isRulesEnabled);
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
            </div>            <div className="mt-4 space-y-2">
              <div>
                <p className="text-sm font-medium text-gray-500">Product Name</p>
                <p className="text-md font-semibold text-gray-900">{selectedItem.name}</p>
                <p className="text-xs font-semibold text-gray-700">{`width: ${Math.round(selectedItem.width / PIXELS_PER_MM)}mm, height: ${Math.round(selectedItem.height / PIXELS_PER_MM)}mm`}</p>
              </div>
            </div>
            
            {/* NEW: Width Adjustment for Blank Spaces */}
            {selectedItem.productType === 'BLANK' && (
              <BlankSpaceWidthAdjuster 
                selectedItem={selectedItem} 
                refrigerator={refrigerator}
                onWidthChange={actions.updateBlankWidth}
              />
            )}
            
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