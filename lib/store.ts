import { create } from 'zustand';
import { Refrigerator, Item, Sku } from './types';
import { arrayMove } from '@dnd-kit/sortable';
import toast from 'react-hot-toast';
import { produce } from 'immer';

type StackLocation = { rowId: string; stackIndex: number; };

interface PlanogramState {
  refrigerator: Refrigerator;
  selectedItemId: string | null;
  history: Refrigerator[];
  historyIndex: number;
  findStackLocation: (itemIdOrStackId: string) => StackLocation | null;
  actions: {
    selectItem: (itemId: string | null) => void;    deleteSelectedItem: () => void;
    removeItemsById: (itemIds: string[]) => void;
    duplicateAndAddNew: () => void;
    duplicateAndStack: () => void;
    replaceSelectedItem: (newSku: Sku, isRulesEnabled?: boolean) => void;
    moveItem: (itemId: string, targetRowId: string, targetStackIndex?: number) => void;
    addItemFromSku: (sku: Sku, targetRowId: string, targetStackIndex?: number) => void;
    reorderStack: (rowId: string, oldIndex: number, newIndex: number) => void;
    stackItem: (draggedStackId: string, targetStackId: string) => void;
    undo: () => void;
    redo: () => void;
  }
}

const generateUniqueId = (skuId: string) => `${skuId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Helper function to save state to history BEFORE making changes
const saveToHistory = (currentState: Refrigerator, history: Refrigerator[], historyIndex: number): { history: Refrigerator[]; historyIndex: number } => {
  // If this is the very first change and history is empty, save the initial state
  if (history.length === 0) {
    const newHistory = [produce(currentState, () => {})];
    return {
      history: newHistory,
      historyIndex: 0
    };
  }
  
  // For subsequent changes, the current state is already at historyIndex
  // We don't need to add it again, just move the index forward
  return {
    history,
    historyIndex
  };
};

// Helper function to push new state after modification
const pushToHistory = (newState: Refrigerator, history: Refrigerator[], historyIndex: number): { history: Refrigerator[]; historyIndex: number } => {
  // Remove any future history if we're not at the end
  const newHistory = history.slice(0, historyIndex + 1);
  // Add the new state (Immer produces immutable draft, so we can add directly)
  newHistory.push(produce(newState, () => {}));
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
    },    removeItemsById: (itemIds) => {
      set(state => {
        let itemsRemoved = false;
        
        const newFridge = produce(state.refrigerator, draft => {
          for (const rowId in draft) {
            // Filter out empty stacks that result from removing items
            draft[rowId].stacks = draft[rowId].stacks
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
        });

        if (itemsRemoved) {
          const historyUpdate = pushToHistory(newFridge, state.history, state.historyIndex);
          return { refrigerator: newFridge, selectedItemId: null, ...historyUpdate };
        }
        return state; // No changes
      });
    },    duplicateAndAddNew: () => {
        const { selectedItemId, findStackLocation } = get();
        if (!selectedItemId) return;
        
        const location = findStackLocation(selectedItemId);
        if (!location) return;

        set(state => {
            const row = state.refrigerator[location.rowId];
            const stack = row.stacks[location.stackIndex];
            const item = stack.find((i: Item) => i.id === selectedItemId);
            if (!item) return state;

            const newItem = { ...item, id: generateUniqueId(item.skuId) };
            const currentWidth = row.stacks.reduce((acc: number, s: Item[]) => acc + (s[0]?.width || 0), 0);
            
            if (currentWidth + newItem.width <= row.capacity) {
                const newFridge = produce(state.refrigerator, draft => {
                    draft[location.rowId].stacks.push([newItem]);
                });
                toast.success('Item duplicated successfully!');
                const historyUpdate = pushToHistory(newFridge, state.history, state.historyIndex);
                return { refrigerator: newFridge, ...historyUpdate };
            } else {
                toast.error('Not enough space in the row to duplicate!');
                return state;
            }
        });
    },    duplicateAndStack: () => {
        const { selectedItemId, findStackLocation } = get();
        if (!selectedItemId) return;
        
        const location = findStackLocation(selectedItemId);
        if (!location) return;

        set(state => {
            const row = state.refrigerator[location.rowId];
            const stack = row.stacks[location.stackIndex];
            const item = stack.find((i: Item) => i.id === selectedItemId);
            if (!item || !item.constraints.stackable) return state;

            const newItem = { ...item, id: generateUniqueId(item.skuId) };
            const currentStackHeight = stack.reduce((acc: number, i: Item) => acc + i.height, 0);
            
            if (currentStackHeight + newItem.height <= row.maxHeight) {
                const newFridge = produce(state.refrigerator, draft => {
                    draft[location.rowId].stacks[location.stackIndex].push(newItem);
                });
                toast.success('Item stacked successfully!');
                const historyUpdate = pushToHistory(newFridge, state.history, state.historyIndex);
                return { refrigerator: newFridge, ...historyUpdate };
            } else {
                toast.error('Cannot stack - exceeds maximum row height!');
                return state;
            }
        });
    },    replaceSelectedItem: (newSku, isRulesEnabled = true) => {
      const { selectedItemId, findStackLocation } = get();
      if (!selectedItemId) return;

      const location = findStackLocation(selectedItemId);
      if (!location) return;
      
      set(state => {
        const row = state.refrigerator[location.rowId];
        const stack = row.stacks[location.stackIndex];
        const itemIndex = stack.findIndex((i: Item) => i.id === selectedItemId);
        const oldItem = stack[itemIndex];
        const newItem: Item = { ...newSku, id: generateUniqueId(newSku.skuId) };

        // Only check product type rules if rules are enabled
        if (isRulesEnabled && row.allowedProductTypes !== 'all' && !row.allowedProductTypes.includes(newItem.productType)) {
          toast.error(`Cannot replace: This row does not accept "${newItem.productType}" products.`);
          return state;
        }
        
        // Always check size constraints (width and height)
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
        }
        
        const newFridge = produce(state.refrigerator, draft => {
          draft[location.rowId].stacks[location.stackIndex][itemIndex] = newItem;
        });
        toast.success('Item replaced successfully!');
        const historyUpdate = pushToHistory(newFridge, state.history, state.historyIndex);
        return { refrigerator: newFridge, selectedItemId: newItem.id, ...historyUpdate };
      });
    },    addItemFromSku: (sku, targetRowId, targetStackIndex = -1) => {
        set(state => {
            const targetRow = state.refrigerator[targetRowId];
            if(!targetRow) return state;
            
            const newItem: Item = { ...sku, id: generateUniqueId(sku.skuId) };
            
            const newFridge = produce(state.refrigerator, draft => {
              if (targetStackIndex >= 0 && targetStackIndex <= draft[targetRowId].stacks.length) {
                draft[targetRowId].stacks.splice(targetStackIndex, 0, [newItem]);
              } else {
                draft[targetRowId].stacks.push([newItem]);
              }
            });
            
            const historyUpdate = pushToHistory(newFridge, state.history, state.historyIndex);
            return { refrigerator: newFridge, ...historyUpdate };
        });
    },    moveItem: (itemId, targetRowId, targetStackIndex) => {
        set(state => {
            const { findStackLocation } = get();
            const location = findStackLocation(itemId);
            if (!location) return state;

            const draggedStack = state.refrigerator[location.rowId].stacks[location.stackIndex];
            
            const newFridge = produce(state.refrigerator, draft => {
              draft[location.rowId].stacks.splice(location.stackIndex, 1);
              
              const targetRow = draft[targetRowId];
              if (targetStackIndex !== undefined) {
                  targetRow.stacks.splice(targetStackIndex, 0, draggedStack);
              } else {
                  targetRow.stacks.push(draggedStack);
              }
            });

            const historyUpdate = pushToHistory(newFridge, state.history, state.historyIndex);
            return { refrigerator: newFridge, ...historyUpdate };
        });
    },    reorderStack: (rowId, oldIndex, newIndex) => {
        set(state => {
            const newFridge = produce(state.refrigerator, draft => {
              draft[rowId].stacks = arrayMove(draft[rowId].stacks, oldIndex, newIndex);
            });
            const historyUpdate = pushToHistory(newFridge, state.history, state.historyIndex);
            return { refrigerator: newFridge, ...historyUpdate };
        });
    },    stackItem: (draggedStackId, targetStackId) => {
        set(state => {
            const { findStackLocation } = get();
            const draggedLocation = findStackLocation(draggedStackId);
            const targetLocation = findStackLocation(targetStackId);

            if (!draggedLocation || !targetLocation || draggedLocation.rowId !== targetLocation.rowId) {
                return state;
            }
            
            const row = state.refrigerator[draggedLocation.rowId];
            const draggedStack = row.stacks[draggedLocation.stackIndex];
            const itemToStack = draggedStack[0];
            
            const newFridge = produce(state.refrigerator, draft => {
              draft[draggedLocation.rowId].stacks[targetLocation.stackIndex].push(itemToStack);
              draft[draggedLocation.rowId].stacks.splice(draggedLocation.stackIndex, 1);
            });

            const historyUpdate = pushToHistory(newFridge, state.history, state.historyIndex);
            return { refrigerator: newFridge, ...historyUpdate };
        });
    },    undo: () => {
      set(state => {
        if (state.historyIndex > 0) {
          const newIndex = state.historyIndex - 1;
          const previousState = state.history[newIndex];
          toast.success('Undo successful');
          return {
            refrigerator: produce(previousState, () => {}),
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
            refrigerator: produce(nextState, () => {}),
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