import { create } from 'zustand';
import { Refrigerator, Item, Sku } from './types';
import { arrayMove } from '@dnd-kit/sortable';

// Helper function to find an item's location
const findItemLocation = (refrigerator: Refrigerator, itemId: string) => {
  for (const rowId in refrigerator) {
    for (let stackIndex = 0; stackIndex < refrigerator[rowId].stacks.length; stackIndex++) {
      const stack = refrigerator[rowId].stacks[stackIndex];
      const itemIndex = stack.findIndex(i => i.id === itemId);
      if (itemIndex !== -1) {
        return { rowId, stackIndex, itemIndex, stack, item: stack[itemIndex] };
      }
    }
  }
  return null;
};

interface PlanogramState {
  refrigerator: Refrigerator;
  selectedItemId: string | null;
  actions: {
    selectItem: (itemId: string | null) => void;
    deleteSelectedItem: () => void;
    duplicateSelectedItem: () => void;
    moveItem: (itemId: string, targetRowId: string, targetStackIndex?: number) => void;
    addItemFromSku: (sku: Sku, targetRowId: string) => void;
    reorderStack: (rowId: string, oldIndex: number, newIndex: number) => void;
  }
}

export const usePlanogramStore = create<PlanogramState>((set, get) => ({
  refrigerator: {},
  selectedItemId: null,
  actions: {
    selectItem: (itemId) => set({ selectedItemId: itemId }),
    deleteSelectedItem: () => {
        const { selectedItemId, refrigerator } = get();
        if (!selectedItemId) return;
        
        const location = findItemLocation(refrigerator, selectedItemId);
        if (!location) return;

        const { rowId, stackIndex, itemIndex } = location;
        const newFridge = JSON.parse(JSON.stringify(refrigerator));

        newFridge[rowId].stacks[stackIndex].splice(itemIndex, 1);
        if (newFridge[rowId].stacks[stackIndex].length === 0) {
            newFridge[rowId].stacks.splice(stackIndex, 1);
        }

        set({ refrigerator: newFridge, selectedItemId: null });
    },
    duplicateSelectedItem: () => {
        const { selectedItemId, refrigerator } = get();
        if (!selectedItemId) return;
        
        const location = findItemLocation(refrigerator, selectedItemId);
        if (!location) return;

        const { rowId, item } = location;
        const newFridge = JSON.parse(JSON.stringify(refrigerator));
        const newItem = { ...item, id: `${item.skuId}-${Date.now()}` };

        const currentWidth = newFridge[rowId].stacks.reduce((acc, stack) => acc + (stack[0]?.width || 0), 0);
        if (currentWidth + newItem.width <= newFridge[rowId].capacity) {
            newFridge[rowId].stacks.push([newItem]);
            set({ refrigerator: newFridge });
        } else {
            alert("Not enough space in the row to duplicate!");
        }
    },
    // Action to add a new SKU to a row
    addItemFromSku: (sku, targetRowId) => {
        const { refrigerator } = get();
        const newFridge = JSON.parse(JSON.stringify(refrigerator));
        const targetRow = newFridge[targetRowId];

        const newItem: Item = {
            ...sku,
            id: `${sku.skuId}-${Date.now()}`,
        };

        const currentWidth = targetRow.stacks.reduce((acc, stack) => acc + (stack[0]?.width || 0), 0);

        if (currentWidth + newItem.width <= targetRow.capacity) {
            targetRow.stacks.push([newItem]);
            set({ refrigerator: newFridge });
        } else {
            console.warn(`Row ${targetRowId} is full. Cannot add new item.`);
        }
    },
    // Action to move an existing item
    moveItem: (itemId, targetRowId, targetStackIndex) => {
         const { refrigerator } = get();
         const location = findItemLocation(refrigerator, itemId);
         if (!location) return;

         const { rowId: fromRowId, stackIndex: fromStackIndex, item } = location;
         const newFridge = JSON.parse(JSON.stringify(refrigerator));

         // Remove from old location
         newFridge[fromRowId].stacks[fromStackIndex].splice(0, 1);
         if (newFridge[fromRowId].stacks[fromStackIndex].length === 0) {
            newFridge[fromRowId].stacks.splice(fromStackIndex, 1);
         }

         // Add to new location
         const targetRow = newFridge[targetRowId];
         const currentWidth = targetRow.stacks.reduce((acc, stack) => acc + (stack[0]?.width || 0), 0);

         if (currentWidth + item.width <= targetRow.capacity) {
            if (targetStackIndex !== undefined) {
                 targetRow.stacks.splice(targetStackIndex, 0, [item]);
            } else {
                 targetRow.stacks.push([item]);
            }
         } else {
            // If it doesn't fit, revert to original state (or handle gracefully)
            console.warn(`Row ${targetRowId} is full. Move reverted.`);
            return;
         }

         set({ refrigerator: newFridge });
    },
    // Action to reorder stacks within the same row
    reorderStack: (rowId, oldIndex, newIndex) => {
        const { refrigerator } = get();
        const newFridge = JSON.parse(JSON.stringify(refrigerator));
        newFridge[rowId].stacks = arrayMove(newFridge[rowId].stacks, oldIndex, newIndex);
        set({ refrigerator: newFridge });
    }
  },
}));