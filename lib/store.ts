import { create } from 'zustand';
import { Refrigerator, Item, Sku } from './types';
import { arrayMove } from '@dnd-kit/sortable';

type StackLocation = { rowId: string; stackIndex: number; };

interface PlanogramState {
  refrigerator: Refrigerator;
  selectedItemId: string | null;
  findStackLocation: (itemIdOrStackId: string) => StackLocation | null;
  actions: {
    selectItem: (itemId: string | null) => void;
    deleteSelectedItem: () => void;
    duplicateAndAddNew: () => void; // Renamed for clarity
    duplicateAndStack: () => void; // New action
    replaceSelectedItem: (newSku: Sku) => void; // New action
    moveItem: (itemId: string, targetRowId: string, targetStackIndex?: number) => void;
    addItemFromSku: (sku: Sku, targetRowId: string, targetStackIndex?: number) => void;
    reorderStack: (rowId: string, oldIndex: number, newIndex: number) => void;
    stackItem: (draggedStackId: string, targetStackId: string) => void;
  }
}

const generateUniqueId = (skuId: string) => `${skuId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const usePlanogramStore = create<PlanogramState>((set, get) => ({
  refrigerator: {},
  selectedItemId: null,
  findStackLocation: (itemIdOrStackId: string) => {
    const { refrigerator } = get();
    for (const rowId in refrigerator) {
      for (let stackIndex = 0; stackIndex < refrigerator[rowId].stacks.length; stackIndex++) {
        const stack = refrigerator[rowId].stacks[stackIndex];
        if (stack[0]?.id === itemIdOrStackId || stack.some(i => i.id === itemIdOrStackId)) {
          return { rowId, stackIndex };
        }
      }
    }
    return null;
  },
  actions: {
    selectItem: (itemId) => set({ selectedItemId: itemId }),
    deleteSelectedItem: () => {
        const { selectedItemId, findStackLocation } = get();
        if (!selectedItemId) return;
        
        const location = findStackLocation(selectedItemId);
        if (!location) return;

        set(state => {
            const newFridge = JSON.parse(JSON.stringify(state.refrigerator));
            const stack = newFridge[location.rowId].stacks[location.stackIndex];
            const itemIndex = stack.findIndex((i: Item) => i.id === selectedItemId);

            if(itemIndex > -1) {
                stack.splice(itemIndex, 1);
                if (stack.length === 0) {
                    newFridge[location.rowId].stacks.splice(location.stackIndex, 1);
                }
            }
            return { refrigerator: newFridge, selectedItemId: null };
        });
    },
    duplicateAndAddNew: () => {
        const { selectedItemId, findStackLocation } = get();
        if (!selectedItemId) return;
        
        const location = findStackLocation(selectedItemId);
        if (!location) return;

        set(state => {
            const newFridge = JSON.parse(JSON.stringify(state.refrigerator));
            const row = newFridge[location.rowId];
            const stack = row.stacks[location.stackIndex];
            const item = stack.find((i: Item) => i.id === selectedItemId);
            if (!item) return state;

            const newItem = { ...item, id: generateUniqueId(item.skuId) };
            const currentWidth = row.stacks.reduce((acc: number, s: Item[]) => acc + (s[0]?.width || 0), 0);

            if (currentWidth + newItem.width <= row.capacity) {
                row.stacks.push([newItem]);
                return { refrigerator: newFridge };
            } else {
                alert("Not enough space in the row to duplicate!");
                return state;
            }
        });
    },
    duplicateAndStack: () => {
        const { selectedItemId, findStackLocation } = get();
        if (!selectedItemId) return;
        
        const location = findStackLocation(selectedItemId);
        if (!location) return;

        set(state => {
            const newFridge = JSON.parse(JSON.stringify(state.refrigerator));
            const row = newFridge[location.rowId];
            const stack = row.stacks[location.stackIndex];
            const item = stack.find((i: Item) => i.id === selectedItemId);
            if (!item || !item.constraints.stackable) return state;

            const newItem = { ...item, id: generateUniqueId(item.skuId) };
            const currentStackHeight = stack.reduce((acc: number, i: Item) => acc + i.height, 0);

            if (currentStackHeight + newItem.height <= row.maxHeight) {
                stack.push(newItem);
                return { refrigerator: newFridge };
            } else {
                alert("Cannot stack, exceeds maximum row height!");
                return state;
            }
        });
    },
    replaceSelectedItem: (newSku) => {
      const { selectedItemId, findStackLocation } = get();
      if (!selectedItemId) return;

      const location = findStackLocation(selectedItemId);
      if (!location) return;
      
      set(state => {
        const newFridge = JSON.parse(JSON.stringify(state.refrigerator));
        const row = newFridge[location.rowId];
        const stack = row.stacks[location.stackIndex];
        const itemIndex = stack.findIndex((i: Item) => i.id === selectedItemId);
        const oldItem = stack[itemIndex];

        const newItem: Item = { ...newSku, id: generateUniqueId(newSku.skuId) };

        // --- VALIDATION ---
        // 1. Check Product Type
        if (row.allowedProductTypes !== 'all' && !row.allowedProductTypes.includes(newItem.productType)) {
          alert(`Invalid replacement: This row does not accept product type "${newItem.productType}".`);
          return state;
        }

        // 2. Check Width
        const currentWidth = row.stacks.reduce((acc: number, s: Item[]) => acc + (s[0]?.width || 0), 0);
        const widthDifference = newItem.width - oldItem.width;
        if (currentWidth + widthDifference > row.capacity) {
          alert("Invalid replacement: The new item is too wide for the remaining space in this row.");
          return state;
        }

        // 3. Check Height
        const currentStackHeight = stack.reduce((acc: number, i: Item) => acc + i.height, 0);
        const heightDifference = newItem.height - oldItem.height;
        if (currentStackHeight + heightDifference > row.maxHeight) {
          alert("Invalid replacement: The new item is too tall for this stack.");
          return state;
        }

        // --- If all checks pass, replace the item ---
        stack[itemIndex] = newItem;
        return { refrigerator: newFridge, selectedItemId: newItem.id };
      });
    },
    addItemFromSku: (sku, targetRowId, targetStackIndex = -1) => {
        set(state => {
            const newFridge = JSON.parse(JSON.stringify(state.refrigerator));
            const targetRow = newFridge[targetRowId];
            if(!targetRow) return state;
            
            const newItem: Item = { ...sku, id: generateUniqueId(sku.skuId) };
            
            if (targetStackIndex >= 0 && targetStackIndex <= targetRow.stacks.length) {
              targetRow.stacks.splice(targetStackIndex, 0, [newItem]);
            } else {
              targetRow.stacks.push([newItem]);
            }
            
            return { refrigerator: newFridge };
        });
    },
    moveItem: (itemId, targetRowId, targetStackIndex) => {
        set(state => {
            const { findStackLocation } = get();
            const location = findStackLocation(itemId);
            if (!location) return state;

            const newFridge = JSON.parse(JSON.stringify(state.refrigerator));
            const draggedStack = newFridge[location.rowId].stacks[location.stackIndex];
            
            newFridge[location.rowId].stacks.splice(location.stackIndex, 1);
            
            const targetRow = newFridge[targetRowId];
            if (targetStackIndex !== undefined) {
                targetRow.stacks.splice(targetStackIndex, 0, draggedStack);
            } else {
                targetRow.stacks.push(draggedStack);
            }

            return { refrigerator: newFridge };
        });
    },
    reorderStack: (rowId, oldIndex, newIndex) => {
        set(state => {
            const newFridge = JSON.parse(JSON.stringify(state.refrigerator));
            newFridge[rowId].stacks = arrayMove(newFridge[rowId].stacks, oldIndex, newIndex);
            return { refrigerator: newFridge };
        });
    },
    stackItem: (draggedStackId, targetStackId) => {
        set(state => {
            const { findStackLocation } = get();
            const draggedLocation = findStackLocation(draggedStackId);
            const targetLocation = findStackLocation(targetStackId);

            if (!draggedLocation || !targetLocation || draggedLocation.rowId !== targetLocation.rowId) {
                return state;
            }

            const newFridge = JSON.parse(JSON.stringify(state.refrigerator));
            const row = newFridge[draggedLocation.rowId];
            const draggedStack = row.stacks[draggedLocation.stackIndex];
            const targetStack = row.stacks[targetLocation.stackIndex];
            const itemToStack = draggedStack[0];
            
            targetStack.push(itemToStack);
            row.stacks.splice(draggedLocation.stackIndex, 1);

            return { refrigerator: newFridge };
        });
    }
  },
}));