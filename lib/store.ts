import { create } from 'zustand';
import { Refrigerator, Item, Sku } from './types';
import { arrayMove } from '@dnd-kit/sortable';
import toast from 'react-hot-toast';

type StackLocation = { rowId: string; stackIndex: number; };

interface PlanogramState {
  refrigerator: Refrigerator;
  selectedItemId: string | null;
  history: Refrigerator[];
  historyIndex: number;
  findStackLocation: (itemIdOrStackId: string) => StackLocation | null;
  actions: {
    selectItem: (itemId: string | null) => void;
    deleteSelectedItem: () => void;
    removeItemsById: (itemIds: string[]) => void;
    duplicateAndAddNew: () => void;
    duplicateAndStack: () => void;
    replaceSelectedItem: (newSku: Sku) => void;
    moveItem: (itemId: string, targetRowId: string, targetStackIndex?: number) => void;
    addItemFromSku: (sku: Sku, targetRowId: string, targetStackIndex?: number) => void;
    reorderStack: (rowId: string, oldIndex: number, newIndex: number) => void;
    stackItem: (draggedStackId: string, targetStackId: string) => void;
    undo: () => void;
    redo: () => void;
  }
}

const generateUniqueId = (skuId: string) => `${skuId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Helper function to save state to history
const saveToHistory = (currentState: Refrigerator, history: Refrigerator[], historyIndex: number): { history: Refrigerator[]; historyIndex: number } => {
  // Remove any future history if we're not at the end
  const newHistory = history.slice(0, historyIndex + 1);
  // Add current state
  newHistory.push(JSON.parse(JSON.stringify(currentState)));
  // Limit history to last 50 states to prevent memory issues
  const limitedHistory = newHistory.slice(-50);
  return {
    history: limitedHistory,
    historyIndex: limitedHistory.length - 1
  };
};

export const usePlanogramStore = create<PlanogramState>((set, get) => ({
  refrigerator: {},
  selectedItemId: null,
  history: [],
  historyIndex: -1,
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
        const { selectedItemId, actions } = get();
        if (!selectedItemId) return;
        actions.removeItemsById([selectedItemId]);
    },
    removeItemsById: (itemIds) => {      set(state => {
        const newFridge = JSON.parse(JSON.stringify(state.refrigerator));
        let itemsRemoved = false;
        
        for (const rowId in newFridge) {
          // Filter out empty stacks that result from removing items
          newFridge[rowId].stacks = newFridge[rowId].stacks
            .map((stack: Item[]) => {
              // Filter out the items to be removed from this stack
              return stack.filter(item => {
                const shouldRemove = itemIds.includes(item.id);
                if (shouldRemove) itemsRemoved = true;
                return !shouldRemove;
              });
            })
            // After filtering items, filter out any stacks that are now empty
            .filter((stack: Item[]) => stack.length > 0);
        }

        if (itemsRemoved) {
          const historyUpdate = saveToHistory(state.refrigerator, state.history, state.historyIndex);
          return { refrigerator: newFridge, selectedItemId: null, ...historyUpdate };
        }
        return state; // No changes
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
            const currentWidth = row.stacks.reduce((acc: number, s: Item[]) => acc + (s[0]?.width || 0), 0);            if (currentWidth + newItem.width <= row.capacity) {
                row.stacks.push([newItem]);
                toast.success('Item duplicated successfully!');
                const historyUpdate = saveToHistory(state.refrigerator, state.history, state.historyIndex);
                return { refrigerator: newFridge, ...historyUpdate };
            } else {
                toast.error('Not enough space in the row to duplicate!');
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
            const currentStackHeight = stack.reduce((acc: number, i: Item) => acc + i.height, 0);            if (currentStackHeight + newItem.height <= row.maxHeight) {
                stack.push(newItem);
                toast.success('Item stacked successfully!');
                const historyUpdate = saveToHistory(state.refrigerator, state.history, state.historyIndex);
                return { refrigerator: newFridge, ...historyUpdate };
            } else {
                toast.error('Cannot stack - exceeds maximum row height!');
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
        const oldItem = stack[itemIndex];        const newItem: Item = { ...newSku, id: generateUniqueId(newSku.skuId) };

        if (row.allowedProductTypes !== 'all' && !row.allowedProductTypes.includes(newItem.productType)) {
          toast.error(`Cannot replace: This row does not accept "${newItem.productType}" products.`);
          return state;
        }
        const currentWidth = row.stacks.reduce((acc: number, s: Item[]) => acc + (s[0]?.width || 0), 0);
        const widthDifference = newItem.width - oldItem.width;
        if (currentWidth + widthDifference > row.capacity) {
          toast.error('Cannot replace: The new item is too wide for this row.');
          return state;
        }
        const currentStackHeight = stack.reduce((acc: number, i: Item) => acc + i.height, 0);
        const heightDifference = newItem.height - oldItem.height;
        if (currentStackHeight + heightDifference > row.maxHeight) {
          toast.error('Cannot replace: The new item is too tall for this stack.');
          return state;
        }        stack[itemIndex] = newItem;
        toast.success('Item replaced successfully!');
        const historyUpdate = saveToHistory(state.refrigerator, state.history, state.historyIndex);
        return { refrigerator: newFridge, selectedItemId: newItem.id, ...historyUpdate };
      });
    },    addItemFromSku: (sku, targetRowId, targetStackIndex = -1) => {
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
            
            const historyUpdate = saveToHistory(state.refrigerator, state.history, state.historyIndex);
            return { refrigerator: newFridge, ...historyUpdate };
        });
    },    moveItem: (itemId, targetRowId, targetStackIndex) => {
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

            const historyUpdate = saveToHistory(state.refrigerator, state.history, state.historyIndex);
            return { refrigerator: newFridge, ...historyUpdate };
        });
    },    reorderStack: (rowId, oldIndex, newIndex) => {
        set(state => {
            const newFridge = JSON.parse(JSON.stringify(state.refrigerator));
            newFridge[rowId].stacks = arrayMove(newFridge[rowId].stacks, oldIndex, newIndex);
            const historyUpdate = saveToHistory(state.refrigerator, state.history, state.historyIndex);
            return { refrigerator: newFridge, ...historyUpdate };
        });
    },
    stackItem: (draggedStackId, targetStackId) => {
        set(state => {
            const { findStackLocation } = get();
            const draggedLocation = findStackLocation(draggedStackId);
            const targetLocation = findStackLocation(targetStackId);

            if (!draggedLocation || !targetLocation || draggedLocation.rowId !== targetLocation.rowId) {
                return state;
            }            const newFridge = JSON.parse(JSON.stringify(state.refrigerator));
            const row = newFridge[draggedLocation.rowId];
            const draggedStack = row.stacks[draggedLocation.stackIndex];
            const targetStack = row.stacks[targetLocation.stackIndex];
            const itemToStack = draggedStack[0];
            
            targetStack.push(itemToStack);
            row.stacks.splice(draggedLocation.stackIndex, 1);

            const historyUpdate = saveToHistory(state.refrigerator, state.history, state.historyIndex);
            return { refrigerator: newFridge, ...historyUpdate };
        });
    },
    undo: () => {
      set(state => {
        if (state.historyIndex > 0) {
          const newIndex = state.historyIndex - 1;
          const previousState = state.history[newIndex];
          toast.success('Undo successful');
          return {
            refrigerator: JSON.parse(JSON.stringify(previousState)),
            historyIndex: newIndex,
            selectedItemId: null
          };
        } else {
          toast.error('Nothing to undo');
          return state;
        }
      });
    },
    redo: () => {
      set(state => {
        if (state.historyIndex < state.history.length - 1) {
          const newIndex = state.historyIndex + 1;
          const nextState = state.history[newIndex];
          toast.success('Redo successful');
          return {
            refrigerator: JSON.parse(JSON.stringify(nextState)),
            historyIndex: newIndex,
            selectedItemId: null
          };
        } else {
          toast.error('Nothing to redo');
          return state;
        }
      });
    }
  },
}));