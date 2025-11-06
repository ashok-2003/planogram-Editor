'use client';

import { usePlanogramStore } from '@/lib/store';
import { Item, Sku } from '@/lib/types';
import { useMemo, useState, memo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PIXELS_PER_MM } from '@/lib/config';

interface PropertiesPanelProps {
  availableSkus: Sku[];
  isRulesEnabled: boolean;
}

// Blank Space Width Adjuster Component
interface BlankSpaceWidthAdjusterProps {
  selectedItem: Item;
  historyIndex: number; // Used to trigger recalculation only on commits
  onWidthChange: (itemId: string, newWidthMM: number) => void;
}

function BlankSpaceWidthAdjuster({ selectedItem, historyIndex, onWidthChange }: BlankSpaceWidthAdjusterProps) {
  const [inputValue, setInputValue] = useState(Math.round(selectedItem.width / PIXELS_PER_MM).toString());
  
  // OPTIMIZATION: Calculate available width based on historyIndex instead of refrigerator
  // This prevents recalculation during drag operations
  const availableWidth = useMemo(() => {
    const refrigerator = usePlanogramStore.getState().refrigerator;
    for (const rowId in refrigerator) {
      const row = refrigerator[rowId];
      for (const stack of row.stacks) {
        if (stack.some(item => item.id === selectedItem.id)) {
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
  }, [selectedItem.id, historyIndex]);

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
      const rounded = Math.round(newValue / 5) * 5;
      setInputValue(rounded.toString());
      onWidthChange(selectedItem.id, rounded);
    } else {
      setInputValue(currentWidthMM.toString());
    }
  };
  
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleInputBlur();
    }
  };

  return (
    <div className="my-4 p-3 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold text-blue-900">📏 Width Adjustment</label>
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            min={minWidthMM}
            max={maxWidthMM}
            step={5}
            className="w-14 px-2 py-1 text-xs font-semibold text-gray-900 bg-white border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <span className="text-xs font-medium text-blue-700">mm</span>
        </div>
      </div>
      
      {/* Visual progress bar */}
      <div className="mb-2 h-5 bg-white rounded border border-blue-300 overflow-hidden relative">
        <div 
          className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-200 flex items-center justify-center"
          style={{ width: `${(currentWidthMM / maxWidthMM) * 100}%` }}
        >
          <span className="text-xs font-bold text-white">{currentWidthMM}mm</span>
        </div>
      </div>
      
      {/* Slider */}
      <input
        type="range"
        min={minWidthMM}
        max={maxWidthMM}
        step={5}
        value={currentWidthMM}
        onChange={handleSliderChange}
        className="w-full h-2 bg-blue-200 rounded appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentWidthMM / maxWidthMM) * 100}%, #dbeafe ${(currentWidthMM / maxWidthMM) * 100}%, #dbeafe 100%)`
        }}
      />
      
      <div className="flex justify-between text-xs text-gray-600 mt-1">
        <span>Min: {minWidthMM}mm</span>
        <span className="text-blue-600">Max: {maxWidthMM}mm</span>
      </div>
    </div>
  );
}

export function PropertiesPanel({ availableSkus, isRulesEnabled }: PropertiesPanelProps) {
  // OPTIMIZATION: Subscribe to selectedItemId and historyIndex instead of refrigerator
  // This prevents re-renders during drag operations (which don't commit to history)
  const selectedItemId = usePlanogramStore((state) => state.selectedItemId);
  const historyIndex = usePlanogramStore((state) => state.historyIndex);
  const actions = usePlanogramStore((state) => state.actions);

  const [isReplacing, setIsReplacing] = useState(false);

  // CRITICAL FIX: Get refrigerator data within useMemo based on historyIndex
  // This prevents re-renders when refrigerator reference changes during drag
  const selectedItem: Item | null = useMemo(() => {
    if (!selectedItemId) {
      setIsReplacing(false);
      return null;
    }
    
    // Get fresh refrigerator data only when historyIndex or selectedItemId changes
    const refrigerator = usePlanogramStore.getState().refrigerator;
    for (const rowId in refrigerator) {
      for (const stack of refrigerator[rowId].stacks) {
        const item = stack.find((i) => i.id === selectedItemId);
        if (item) return item;
      }
    }
    return null;
  }, [selectedItemId, historyIndex]);

  const handleReplace = (sku: Sku) => {
    actions.replaceSelectedItem(sku, isRulesEnabled);
    setIsReplacing(false);
  };

  if (!selectedItem) {
    return (
      <div className="w-full flex items-center justify-center p-6">
        <div className="text-center text-gray-400">
          <svg className="w-16 h-16 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-semibold">No item selected</p>
          <p className="text-xs mt-1">Select an item to view properties</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-4 overflow-y-auto">
      <AnimatePresence mode="wait">
        {isReplacing ? (
          <motion.div
            key="replace-view"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">Replace Item</h2>
              <button 
                onClick={() => setIsReplacing(false)} 
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <span>←</span> Back
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-3">Select a product to replace '{selectedItem.name}'</p>
            
            <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
              {availableSkus.map(sku => (
                <button
                  key={sku.skuId}
                  onClick={() => handleReplace(sku)}
                  className="w-full text-left p-2 flex items-center gap-3 rounded-md hover:bg-gray-100 transition-colors border border-gray-200"
                >
                  <img src={sku.imageUrl} alt={sku.name} className="w-8 h-10 object-contain flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-700">{sku.name}</span>
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="details-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Properties</h2>
              <button
                onClick={() => actions.selectItem(null)}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Product Image */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 mb-4 flex items-center justify-center">
              <img 
                src={selectedItem.imageUrl} 
                alt={selectedItem.name} 
                className="w-20 h-20 object-contain"
              />
            </div>

            {/* Product Info */}
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-1">Product Name</p>
              <p className="text-sm font-semibold text-gray-900 mb-2">{selectedItem.name}</p>
              <p className="text-xs text-gray-600">
                {Math.round(selectedItem.width / PIXELS_PER_MM)}mm × {Math.round(selectedItem.height / PIXELS_PER_MM)}mm
              </p>
            </div>            {/* Width Adjustment for Blank Spaces */}
            {selectedItem.productType === 'BLANK' && (
              <BlankSpaceWidthAdjuster 
                selectedItem={selectedItem} 
                historyIndex={historyIndex}
                onWidthChange={actions.updateBlankWidth}
              />
            )}

            {/* Actions */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-700 mb-2">Actions</h3>

              {/* Duplicate Buttons */}
              {selectedItem.constraints.stackable ? (
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={actions.duplicateAndStack} 
                    className="text-xs bg-blue-500 text-white font-semibold py-2 px-3 rounded-md hover:bg-blue-600 transition-colors"
                  >
                    Stack
                  </button>
                  <button 
                    onClick={actions.duplicateAndAddNew} 
                    className="text-xs bg-blue-100 text-blue-800 font-semibold py-2 px-3 rounded-md hover:bg-blue-200 transition-colors"
                  >
                    New
                  </button>
                </div>
              ) : (
                <button 
                  onClick={actions.duplicateAndAddNew} 
                  className="w-full text-xs bg-blue-500 text-white font-semibold py-2 px-3 rounded-md hover:bg-blue-600 transition-colors"
                >
                  Duplicate
                </button>
              )}

              {/* Replace Button */}
              <button 
                onClick={() => setIsReplacing(true)} 
                className="w-full text-xs bg-gray-200 text-gray-800 font-semibold py-2 px-3 rounded-md hover:bg-gray-300 transition-colors"
              >
                Replace
              </button>

              {/* Delete Button */}              {selectedItem.constraints.deletable && (
                <button 
                  onClick={actions.deleteSelectedItem} 
                  className="w-full text-xs bg-red-500 text-white font-semibold py-2 px-3 rounded-md hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Export with memo to prevent unnecessary re-renders
export const PropertiesPanelMemo = memo(PropertiesPanel, (prevProps, nextProps) => {
  // Only re-render if availableSkus or isRulesEnabled change
  // Internal state changes (selectedItemId, historyIndex) are handled by Zustand subscriptions
  return (
    prevProps.availableSkus === nextProps.availableSkus &&
    prevProps.isRulesEnabled === nextProps.isRulesEnabled
  );
});