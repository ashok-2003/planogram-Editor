'use client';

import { usePlanogramStore } from '@/lib/store';
import { Item, Sku } from '@/lib/types';
import { useMemo, useState, memo, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PIXELS_PER_MM } from '@/lib/config';
import { Slider } from '@/components/ui/slider';

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
  const currentWidthMM = Math.round(selectedItem.width / PIXELS_PER_MM);
  const [inputValue, setInputValue] = useState(currentWidthMM.toString());
  const [sliderValue, setSliderValue] = useState([currentWidthMM]);

  // OPTIMIZATION: Calculate available width based on historyIndex instead of refrigerator
  // This prevents recalculation during drag operations
  const availableWidth = useMemo(() => {
    const refrigerator = usePlanogramStore.getState().refrigerator;
    for (const rowId in refrigerator) {
      const row = refrigerator[rowId];
      for (const stack of row.stacks) {
        if (stack.some(item => item.id === selectedItem.id)) {
          // FIXED: Only count the bottom (first) item of each stack
          // Stacked items (index > 0) don't take horizontal space
          const usedWidth = row.stacks.reduce((sum, st) => {
            // Only count the first item (bottom of stack)
            const bottomItem = st[0];
            if (!bottomItem) return sum;

            // If this is the selected item's stack, don't count it
            if (st.some(item => item.id === selectedItem.id)) {
              return sum;
            }

            // Add the bottom item's width (stacked items don't take horizontal space)
            return sum + bottomItem.width;
          }, 0);

          const otherStacksCount = row.stacks.filter(st => !st.some(item => item.id === selectedItem.id)).length;
          const gapsWidth = otherStacksCount > 1 ? otherStacksCount - 1 : 0;

          return row.capacity - usedWidth - gapsWidth;
        }
      }
    }
    return 0;
  }, [selectedItem.id, historyIndex]);

  const maxWidthMM = Math.floor(availableWidth / PIXELS_PER_MM);
  const minWidthMM = 25;

  // Sync slider value when selectedItem changes
  useEffect(() => {
    const newWidthMM = Math.round(selectedItem.width / PIXELS_PER_MM);
    setSliderValue([newWidthMM]);
    setInputValue(newWidthMM.toString());
  }, [selectedItem.width, selectedItem.id]);

  const handleSliderChange = (value: number[]) => {
    const newValue = value[0];
    setSliderValue(value);
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
    <div className="my-4 p-3 bg-gradient-to-br bg-gray-50  border rounded-sm">
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold text-gray-900"> Width Adjustment</label>
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
            className="w-14 px-2 py-1 text-xs font-semibold text-gray-900 bg-white border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <span className="text-xs font-medium text-gray-700">mm</span>
        </div>
      </div>      {/* Visual progress bar */}
      <div className="mb-2 h-4 bg-white rounded border border-gray-300 overflow-hidden relative">
        <div
          className="h-full bg-gradient-to-r from-gray-400 to-gray-600 transition-all duration-200 flex items-center justify-center"
          style={{ width: `${(sliderValue[0] / maxWidthMM) * 100}%` }}
        >
          <span className="text-xs font-bold text-white">{sliderValue[0]}mm</span>
        </div>
      </div>

      {/* Shadcn Slider */}
      <Slider
        min={minWidthMM}
        max={maxWidthMM}
        step={5}
        value={sliderValue}
        onValueChange={handleSliderChange}
        className="w-full my-2"
      />

      <div className="flex justify-between text-xs text-gray-600 mt-1">
        <span>Min: {minWidthMM}mm</span>
        <span className="text-gray-600">Max: {maxWidthMM}mm</span>
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
  const [replaceSearchQuery, setReplaceSearchQuery] = useState('');

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
    setReplaceSearchQuery(''); // Clear search on replace
  };

  // Filter available SKUs based on search query
  const filteredSkus = useMemo(() => {
    if (!replaceSearchQuery.trim()) {
      return availableSkus;
    }
    const query = replaceSearchQuery.toLowerCase();
    return availableSkus.filter(sku =>
      sku.name.toLowerCase().includes(query) ||
      sku.productType.toLowerCase().includes(query) ||
      sku.skuId.toLowerCase().includes(query)
    );
  }, [availableSkus, replaceSearchQuery]);

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
          >            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">Replace Item</h2>
              <button
                onClick={() => {
                  setIsReplacing(false);
                  setReplaceSearchQuery(''); // Clear search when closing
                }}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <span>←</span> Back
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-3">Select a product to replace '{selectedItem.name}'</p>

            {/* Search Input */}
            <div className="relative mb-3">
              <input
                type="text"
                value={replaceSearchQuery}
                onChange={(e) => setReplaceSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-9 pr-8 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {replaceSearchQuery && (
                <button
                  onClick={() => setReplaceSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Results count */}
            {replaceSearchQuery && (
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-600">
                  {filteredSkus.length} {filteredSkus.length === 1 ? 'result' : 'results'} found
                </span>
              </div>
            )}

            {/* Products List */}
            <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
              {filteredSkus.length > 0 ? (
                filteredSkus.map(sku => (
                  <button
                    key={sku.skuId}
                    onClick={() => handleReplace(sku)}
                    className="w-full text-left p-2 flex items-center gap-3 rounded-md hover:bg-gray-100 transition-colors border border-gray-200"
                  >
                    <img src={sku.imageUrl} alt={sku.name} className="w-8 h-10 object-contain flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">{sku.name}</p>
                      <p className="text-xs text-gray-500">{sku.productType}</p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-8 px-4">
                  <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="text-sm font-semibold text-gray-700 mb-1">No products found</p>
                  <p className="text-xs text-gray-500 text-center mb-3">
                    No results for "{replaceSearchQuery}"
                  </p>
                  <button
                    onClick={() => setReplaceSearchQuery('')}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Clear search
                  </button>
                </div>
              )}
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