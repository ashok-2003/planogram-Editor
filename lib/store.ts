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
    duplicateSelectedItem: () => void;
    moveItem: (itemId: string, targetRowId: string, targetStackIndex?: number) => void;
    addItemFromSku: (sku: Sku, targetRowId: string) => void;
    reorderStack: (rowId: string, oldIndex: number, newIndex: number) => void;
    stackItem: (draggedStackId: string, targetStackId: string) => void;
  }
}

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
    duplicateSelectedItem: () => {
        const { selectedItemId, refrigerator, findStackLocation } = get();
        if (!selectedItemId) return;
        
        const location = findStackLocation(selectedItemId);
        if (!location) return;

        set(state => {
            const newFridge = JSON.parse(JSON.stringify(state.refrigerator));
            const stack = newFridge[location.rowId].stacks[location.stackIndex];
            const item = stack.find((i: Item) => i.id === selectedItemId);
            if (!item) return state;

            const newItem = { ...item, id: `${item.skuId}-${Date.now()}` };
            const currentWidth = newFridge[location.rowId].stacks.reduce((acc: number, s: Item[]) => acc + (s[0]?.width || 0), 0);

            if (currentWidth + newItem.width <= newFridge[location.rowId].capacity) {
                newFridge[location.rowId].stacks.push([newItem]);
                return { refrigerator: newFridge };
            } else {
                alert("Not enough space in the row to duplicate!");
                return state;
            }
        });
    },
    addItemFromSku: (sku, targetRowId) => {
        set(state => {
            const newFridge = JSON.parse(JSON.stringify(state.refrigerator));
            const targetRow = newFridge[targetRowId];
            if(!targetRow) return state;
            
            const newItem: Item = { ...sku, id: `${sku.skuId}-${Date.now()}` };
            const currentWidth = targetRow.stacks.reduce((acc: number, s: Item[]) => acc + (s[0]?.width || 0), 0);

            if (currentWidth + newItem.width <= targetRow.capacity) {
                targetRow.stacks.push([newItem]);
                return { refrigerator: newFridge };
            } else {
                console.warn(`Row ${targetRowId} is full. Cannot add new item.`);
                return state;
            }
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
             const currentWidth = targetRow.stacks.reduce((acc: number, s: Item[]) => acc + (s[0]?.width || 0), 0);
             const draggedStackWidth = draggedStack[0]?.width || 0;

             if (currentWidth + draggedStackWidth <= targetRow.capacity) {
                 if (targetStackIndex !== undefined) {
                     targetRow.stacks.splice(targetStackIndex, 0, draggedStack);
                 } else {
                     targetRow.stacks.push(draggedStack);
                 }
             } else {
                 console.warn(`Row ${targetRowId} is full. Move reverted.`);
                 newFridge[location.rowId].stacks.splice(location.stackIndex, 0, draggedStack);
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

            if (!draggedStack || draggedStack.length !== 1) {
                console.warn("Can only stack single items.");
                return state;
            }

            const itemToStack = draggedStack[0];
            if (!itemToStack.constraints.stackable) {
                console.warn("Item is not stackable.");
                return state;
            }

            const currentTargetHeight = targetStack.reduce((acc: number, item: Item) => acc + item.height, 0);
            if (currentTargetHeight + itemToStack.height > row.maxHeight) {
                console.warn("Stacking exceeds max row height.");
                return state;
            }
            
            targetStack.push(itemToStack);
            row.stacks.splice(draggedLocation.stackIndex, 1);

            return { refrigerator: newFridge };
        });
    }
  },
}));
