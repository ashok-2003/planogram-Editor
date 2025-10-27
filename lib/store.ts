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
  
  // Persistence state
  currentLayoutId: string | null;
  hasPendingDraft: boolean;
  draftMetadata: {
    layoutId: string;
    timestamp: string;
  } | null;
  
  // Sync status for UI feedback
  syncStatus: 'idle' | 'syncing' | 'synced';
  lastSynced: Date | null;
  
  findStackLocation: (itemIdOrStackId: string) => StackLocation | null;  actions: {
    selectItem: (itemId: string | null) => void;
    deleteSelectedItem: () => void;
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
    
    // Persistence actions
    initializeLayout: (layoutId: string, initialLayout: Refrigerator) => void;
    switchLayout: (layoutId: string, newLayout: Refrigerator) => void;
    restoreDraft: () => void;
    dismissDraft: () => void;
    clearDraft: () => void;
    manualSync: () => void;
  }
}

const generateUniqueId = (skuId: string) => `${skuId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// ============================================================================
// LocalStorage Utilities (Unified in Store)
// ============================================================================

const DRAFT_EXPIRY_DAYS = 2;
const getStorageKey = (layoutId: string) => `planogram-draft-${layoutId}`;

interface StoredDraft {
  refrigerator: Refrigerator;
  history: Refrigerator[];
  historyIndex: number;
  layoutId: string;
  timestamp: string;
}

// Save full state to localStorage
const saveToLocalStorage = (
  refrigerator: Refrigerator,
  history: Refrigerator[],
  historyIndex: number,
  layoutId: string
): void => {
  try {
    const key = getStorageKey(layoutId);
    const draft: StoredDraft = {
      refrigerator,
      history,
      historyIndex,
      layoutId,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem(key, JSON.stringify(draft));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
};

// Load full state from localStorage
const loadFromLocalStorage = (layoutId: string): StoredDraft | null => {
  try {
    const key = getStorageKey(layoutId);
    const data = localStorage.getItem(key);
    if (!data) return null;
    
    const draft: StoredDraft = JSON.parse(data);
    
    // Check if draft is expired (older than 2 days)
    const draftDate = new Date(draft.timestamp);
    const now = new Date();
    const daysDiff = (now.getTime() - draftDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysDiff > DRAFT_EXPIRY_DAYS) {
      // Draft is expired, clear it
      localStorage.removeItem(key);
      return null;
    }
    
    return draft;
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return null;
  }
};

// Clear draft from localStorage
const clearLocalStorage = (layoutId: string): void => {
  try {
    const key = getStorageKey(layoutId);
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to clear localStorage:', error);
  }
};

// Debounced auto-save (1 second delay)
let saveTimeout: NodeJS.Timeout | null = null;
const debouncedPersist = (
  refrigerator: Refrigerator,
  history: Refrigerator[],
  historyIndex: number,
  layoutId: string
): void => {
  if (saveTimeout) clearTimeout(saveTimeout);
  
  saveTimeout = setTimeout(() => {
    saveToLocalStorage(refrigerator, history, historyIndex, layoutId);
  }, 1000);
};

// ============================================================================
// History Management Helpers
// ============================================================================

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
const pushToHistory = (newState: Refrigerator, history: Refrigerator[], historyIndex: number, currentLayoutId: string | null): { history: Refrigerator[]; historyIndex: number } => {
  // Remove any future history if we're not at the end
  const newHistory = history.slice(0, historyIndex + 1);  // Add the new state (Immer produces immutable draft, so we can add directly)
  newHistory.push(produce(newState, () => {}));
  // Limit history to last 50 states to prevent memory issues
  const limitedHistory = newHistory.slice(-50);
  
  // Auto-save to localStorage with debounce (Phase 8)
  if (currentLayoutId) {
    debouncedPersist(newState, limitedHistory, limitedHistory.length - 1, currentLayoutId);
  }
  
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
  
  // Persistence state
  currentLayoutId: null,
  hasPendingDraft: false,
  draftMetadata: null,
  syncStatus: 'idle',
  lastSynced: null,
  
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
        });        if (itemsRemoved) {
          const historyUpdate = pushToHistory(newFridge, state.history, state.historyIndex, state.currentLayoutId);
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
                });                toast.success('Item duplicated successfully!');
                const historyUpdate = pushToHistory(newFridge, state.history, state.historyIndex, state.currentLayoutId);
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
                });                toast.success('Item stacked successfully!');
                const historyUpdate = pushToHistory(newFridge, state.history, state.historyIndex, state.currentLayoutId);
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
        });        toast.success('Item replaced successfully!');
        const historyUpdate = pushToHistory(newFridge, state.history, state.historyIndex, state.currentLayoutId);
        return { refrigerator: newFridge, selectedItemId: newItem.id, ...historyUpdate };
      });
    },    addItemFromSku: (sku, targetRowId, targetStackIndex = -1) => {
        set(state => {
            const targetRow = state.refrigerator[targetRowId];
            if(!targetRow) return state;
            
            const newItem: Item = { ...sku, id: generateUniqueId(sku.skuId) };
            
            const newFridge = produce(state.refrigerator, draft => {
              if (targetStackIndex >= 0 && targetStackIndex <= draft[targetRowId].stacks.length) {
                draft[targetRowId].stacks.splice(targetStackIndex, 0, [newItem]);              } else {
                draft[targetRowId].stacks.push([newItem]);
              }
            });
            
            const historyUpdate = pushToHistory(newFridge, state.history, state.historyIndex, state.currentLayoutId);
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
                  targetRow.stacks.splice(targetStackIndex, 0, draggedStack);              } else {
                  targetRow.stacks.push(draggedStack);
              }
            });

            const historyUpdate = pushToHistory(newFridge, state.history, state.historyIndex, state.currentLayoutId);
            return { refrigerator: newFridge, ...historyUpdate };
        });
    },    reorderStack: (rowId, oldIndex, newIndex) => {
        set(state => {
            const newFridge = produce(state.refrigerator, draft => {
              draft[rowId].stacks = arrayMove(draft[rowId].stacks, oldIndex, newIndex);
            });
            const historyUpdate = pushToHistory(newFridge, state.history, state.historyIndex, state.currentLayoutId);
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
            
            const newFridge = produce(state.refrigerator, draft => {              draft[draggedLocation.rowId].stacks[targetLocation.stackIndex].push(itemToStack);
              draft[draggedLocation.rowId].stacks.splice(draggedLocation.stackIndex, 1);
            });

            const historyUpdate = pushToHistory(newFridge, state.history, state.historyIndex, state.currentLayoutId);
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
    },    redo: () => {
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
    },
    
    // ========================================
    // Persistence Actions
    // ========================================
    
    initializeLayout: (layoutId: string, initialLayout: Refrigerator) => {
      const draft = loadFromLocalStorage(layoutId);
      
      if (draft) {
        // Draft exists - load it and show restore prompt
        set({
          refrigerator: draft.refrigerator,
          history: draft.history,
          historyIndex: draft.historyIndex,
          currentLayoutId: layoutId,
          hasPendingDraft: true,
          draftMetadata: {
            layoutId: draft.layoutId,
            timestamp: draft.timestamp
          },
          syncStatus: 'idle',
          selectedItemId: null
        });
        toast.success('Draft found! You can restore your previous work.', { duration: 4000 });
      } else {
        // No draft - use initial layout
        set({
          refrigerator: initialLayout,
          history: [produce(initialLayout, () => {})],
          historyIndex: 0,
          currentLayoutId: layoutId,
          hasPendingDraft: false,
          draftMetadata: null,
          syncStatus: 'idle',
          selectedItemId: null        });
      }
    },
    
    switchLayout: (layoutId: string, newLayout: Refrigerator) => {
      const state = get();
      
      // Save current layout first
      if (state.currentLayoutId && state.refrigerator) {
        saveToLocalStorage(
          state.refrigerator,
          state.history,
          state.historyIndex,
          state.currentLayoutId
        );
      }
      
      // Load new layout
      const draft = loadFromLocalStorage(layoutId);
      
      if (draft) {
        // Draft exists for new layout
        set({
          refrigerator: draft.refrigerator,
          history: draft.history,
          historyIndex: draft.historyIndex,
          currentLayoutId: layoutId,
          hasPendingDraft: true,
          draftMetadata: {
            layoutId: draft.layoutId,
            timestamp: draft.timestamp
          },
          selectedItemId: null
        });
        toast.success('Draft found for this layout!', { duration: 3000 });
      } else {
        // No draft - use initial layout
        set({
          refrigerator: newLayout,
          history: [produce(newLayout, () => {})],
          historyIndex: 0,
          currentLayoutId: layoutId,
          hasPendingDraft: false,
          draftMetadata: null,
          selectedItemId: null        });
      }
    },
      restoreDraft: () => {
      const state = get();
      
      if (!state.currentLayoutId) {
        toast.error('No layout loaded');
        return;
      }
      
      // Load draft from localStorage
      const draft = loadFromLocalStorage(state.currentLayoutId);
      
      if (!draft) {
        toast.error('No draft found to restore');
        return;
      }
      
      // Restore the draft data
      set({
        refrigerator: draft.refrigerator,
        history: draft.history,
        historyIndex: draft.historyIndex,
        hasPendingDraft: false,
        draftMetadata: null,
        syncStatus: 'synced',
        lastSynced: new Date(),
        selectedItemId: null
      });
      
      toast.success('Draft restored successfully!');
      
      // Reset sync status after 2 seconds
      setTimeout(() => {
        set({ syncStatus: 'idle' });
      }, 2000);
    },
    
    dismissDraft: () => {
      const state = get();
      
      // Delete draft from localStorage
      if (state.currentLayoutId) {
        clearLocalStorage(state.currentLayoutId);
      }
      
      // Keep current state, just clear the prompt
      set({
        hasPendingDraft: false,
        draftMetadata: null
      });
      
      toast.success('Draft dismissed');
    },
    
    clearDraft: () => {
      set(state => {
        // Create empty refrigerator (keep structure, clear all stacks)
        const emptyFridge = produce(state.refrigerator, draft => {
          Object.keys(draft).forEach(rowId => {
            draft[rowId].stacks = [];
          });
        });
        
        // Add to history for undo
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(produce(emptyFridge, () => {}));
        const limitedHistory = newHistory.slice(-50);
        
        // Trigger auto-save
        if (state.currentLayoutId) {
          debouncedPersist(
            emptyFridge,
            limitedHistory,
            limitedHistory.length - 1,
            state.currentLayoutId
          );
        }
        
        return {
          refrigerator: emptyFridge,
          history: limitedHistory,
          historyIndex: limitedHistory.length - 1,
          selectedItemId: null
        };
      });      
      toast.success('All items cleared');
    },
    
    manualSync: () => {
      const state = get();
      
      if (!state.currentLayoutId) {
        toast.error('No layout loaded');
        return;
      }
      
      // Set syncing status
      set({ syncStatus: 'syncing' });
      
      // Save immediately (no debounce)
      saveToLocalStorage(
        state.refrigerator,
        state.history,
        state.historyIndex,
        state.currentLayoutId
      );
      
      // Simulate brief delay for UX (500ms)
      setTimeout(() => {
        set({ 
          syncStatus: 'synced',
          lastSynced: new Date()
        });
        
        toast.success('Changes synced!');
        
        // Reset to idle after 2 seconds
        setTimeout(() => {
          set({ syncStatus: 'idle' });
        }, 2000);
      }, 500);
    },
  },
}));