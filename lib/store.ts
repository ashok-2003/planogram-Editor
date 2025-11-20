import { create } from 'zustand';
import { Refrigerator, Item, Sku, MultiDoorRefrigerator } from './types';
import { arrayMove } from '@dnd-kit/sortable';
import { produce } from 'immer';
import { PIXELS_PER_MM } from './config';
import { toast } from 'sonner';

type StackLocation = { doorId: string; rowId: string; stackIndex: number; itemIndex: number; };

interface PlanogramState {
  // NEW: Support for multi-door refrigerators
  isMultiDoor: boolean;
  refrigerators: MultiDoorRefrigerator; // e.g., { 'door-1': {...}, 'door-2': {...} }

  // OLD: Keep for backward compatibility (will be populated from refrigerators['door-1'] if single door)
  refrigerator: Refrigerator;

  selectedItemId: string | null;
  // History: Always use MultiDoorRefrigerator format for consistency
  // Single-door layouts are stored as { 'door-1': Refrigerator }
  history: MultiDoorRefrigerator[];
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

  // NEW: Temporary holding for data passed from Upload Page -> Planogram Page
  pendingImportedData: {
    layoutId: string;
    layout: Refrigerator | MultiDoorRefrigerator;
    layoutData?: any;
  } | null;

  findStackLocation: (itemIdOrStackId: string) => StackLocation | null; actions: {
    selectItem: (itemId: string | null) => void;
    deleteSelectedItem: () => void;
    removeItemsById: (itemIds: string[]) => void;
    duplicateAndAddNew: () => void;
    duplicateAndStack: () => void;
    replaceSelectedItem: (newSku: Sku, isRulesEnabled?: boolean) => void;
    moveItem: (itemId: string, targetRowId: string, targetStackIndex?: number, targetDoorId?: string) => void;
    addItemFromSku: (sku: Sku, targetRowId: string, targetStackIndex?: number, doorId?: string) => void;
    reorderStack: (rowId: string, oldIndex: number, newIndex: number, doorId?: string) => void;
    stackItem: (draggedStackId: string, targetStackId: string) => void;
    undo: () => void;
    redo: () => void;

    // NEW: Update blank space width
    updateBlankWidth: (itemId: string, newWidthMM: number) => void;    // Persistence actions
    initializeLayout: (layoutId: string, initialLayout: Refrigerator | MultiDoorRefrigerator, forceInit?: boolean, layoutData?: any) => void;
    switchLayout: (layoutId: string, newLayout: Refrigerator | MultiDoorRefrigerator, layoutData?: any) => void;
    restoreDraft: () => void;
    dismissDraft: () => void;
    clearDraft: () => void;
    manualSync: () => void;
    setPendingImport: (data: { layoutId: string; layout: Refrigerator | MultiDoorRefrigerator; layoutData?: any } | null) => void;
  }
}

const generateUniqueId = (skuId: string) => `${skuId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// ============================================================================
// Helper: Get Stack Width (widest item in stack)
// ============================================================================

/**
 * Get the width footprint of a stack.
 * For stacked items, we need the WIDEST item's width (max), not the first item.
 * This ensures proper width calculation regardless of stack order.
 */
const getStackWidth = (stack: Item[]): number => {
  if (stack.length === 0) return 0;
  return Math.max(...stack.map(item => item.width));
};

// ============================================================================
// LocalStorage Utilities (Unified in Store)
// ============================================================================

const DRAFT_EXPIRY_DAYS = 2;
const getStorageKey = (layoutId: string) => `planogram-draft-${layoutId}`;

interface StoredDraft {
  refrigerator: Refrigerator | MultiDoorRefrigerator;
  history: (Refrigerator | MultiDoorRefrigerator)[];
  historyIndex: number;
  layoutId: string;
  timestamp: string;
}

// Save full state to localStorage
const saveToLocalStorage = (
  refrigerator: Refrigerator | MultiDoorRefrigerator,
  history: (Refrigerator | MultiDoorRefrigerator)[],
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
  refrigerator: Refrigerator | MultiDoorRefrigerator,
  history: (Refrigerator | MultiDoorRefrigerator)[],
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
const saveToHistory = (currentState: Refrigerator | MultiDoorRefrigerator, history: (Refrigerator | MultiDoorRefrigerator)[], historyIndex: number): { history: (Refrigerator | MultiDoorRefrigerator)[]; historyIndex: number } => {
  // If this is the very first change and history is empty, save the initial state
  if (history.length === 0) {
    const newHistory = [produce(currentState, () => { })];
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

/**
 * Normalize state to MultiDoorRefrigerator format
 * If single Refrigerator is passed, wrap it as { 'door-1': Refrigerator }
 */
const normalizeToMultiDoor = (state: Refrigerator | MultiDoorRefrigerator): MultiDoorRefrigerator => {
  // Check if it's already multi-door format (has nested refrigerator objects)
  const firstKey = Object.keys(state)[0];
  if (!firstKey) return {};

  const firstValue = state[firstKey];
  // If firstValue has 'stacks' property, it's a Row, meaning this is a Refrigerator
  if ('stacks' in firstValue) {
    return { 'door-1': state as Refrigerator };
  }

  // Otherwise, it's already MultiDoorRefrigerator
  return state as MultiDoorRefrigerator;
};

// Helper function to push new state after modification
const pushToHistory = (newState: Refrigerator | MultiDoorRefrigerator, history: MultiDoorRefrigerator[], historyIndex: number, currentLayoutId: string | null): { history: MultiDoorRefrigerator[]; historyIndex: number } => {
  // Remove any future history if we're not at the end
  const newHistory = history.slice(0, historyIndex + 1);

  // Normalize to MultiDoorRefrigerator format before adding to history
  const normalizedState = normalizeToMultiDoor(newState);
  newHistory.push(produce(normalizedState, () => { }));

  // Limit history to last 50 states to prevent memory issues
  const limitedHistory = newHistory.slice(-50);

  // Auto-save to localStorage with debounce (Phase 8)
  if (currentLayoutId) {
    debouncedPersist(normalizedState, limitedHistory, limitedHistory.length - 1, currentLayoutId);
  }

  return {
    history: limitedHistory,
    historyIndex: limitedHistory.length - 1
  };
};

export const usePlanogramStore = create<PlanogramState>((set, get) => ({
  isMultiDoor: false,
  refrigerators: {},
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
  pendingImportedData: null,
  findStackLocation: (itemIdOrStackId: string) => {
    const { isMultiDoor, refrigerators, refrigerator } = get();

    // Multi-door mode: search across all doors
    if (isMultiDoor) {
      for (const doorId in refrigerators) {
        const door = refrigerators[doorId];
        for (const rowId in door) {
          for (let stackIndex = 0; stackIndex < door[rowId].stacks.length; stackIndex++) {
            const stack = door[rowId].stacks[stackIndex];
            // Check if it's a stack ID (first item) or find item in stack
            if (stack[0]?.id === itemIdOrStackId) {
              return { doorId, rowId, stackIndex, itemIndex: 0 };
            }
            // Find item in stack
            const itemIndex = stack.findIndex(i => i.id === itemIdOrStackId);
            if (itemIndex !== -1) {
              return { doorId, rowId, stackIndex, itemIndex };
            }
          }
        }
      }
    } else {
      // Single-door mode: use legacy refrigerator, always return 'door-1' as doorId
      for (const rowId in refrigerator) {
        for (let stackIndex = 0; stackIndex < refrigerator[rowId].stacks.length; stackIndex++) {
          const stack = refrigerator[rowId].stacks[stackIndex];
          // Check if it's a stack ID (first item) or find item in stack
          if (stack[0]?.id === itemIdOrStackId) {
            return { doorId: 'door-1', rowId, stackIndex, itemIndex: 0 };
          }
          // Find item in stack
          const itemIndex = stack.findIndex(i => i.id === itemIdOrStackId);
          if (itemIndex !== -1) {
            return { doorId: 'door-1', rowId, stackIndex, itemIndex };
          }
        }
      }
    }
    return null;
  }, actions: {
    selectItem: (itemId) => set({ selectedItemId: itemId }),
    setPendingImport: (data) => set({ pendingImportedData: data }),
    deleteSelectedItem: () => {
      const { selectedItemId, actions } = get();
      if (!selectedItemId) return;
      actions.removeItemsById([selectedItemId]);
    }, removeItemsById: (itemIds) => {
      const state = get();
      const { findStackLocation, refrigerators, history, historyIndex, currentLayoutId } = state;

      // Find which door(s) contain these items
      const doorsToUpdate = new Set<string>();
      for (const itemId of itemIds) {
        const location = findStackLocation(itemId);
        if (location) {
          doorsToUpdate.add(location.doorId);
        }
      }

      // Update each affected door
      let itemsRemoved = false;
      const updatedRefrigerators = produce(refrigerators, draft => {
        for (const doorId of doorsToUpdate) {
          const doorData = draft[doorId];
          if (!doorData) continue;

          for (const rowId in doorData) {
            // Filter out empty stacks that result from removing items
            doorData[rowId].stacks = doorData[rowId].stacks
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
        }
      });

      if (itemsRemoved) {
        const historyUpdate = pushToHistory(updatedRefrigerators, history, historyIndex, currentLayoutId);
        set({
          refrigerators: updatedRefrigerators,
          refrigerator: updatedRefrigerators['door-1'] || {},
          selectedItemId: null,
          ...historyUpdate
        });
      }
    }, duplicateAndAddNew: () => {
      const state = get();
      const { selectedItemId, findStackLocation, refrigerators, history, historyIndex, currentLayoutId } = state;
      if (!selectedItemId) return;

      const location = findStackLocation(selectedItemId);
      if (!location) return;

      const doorId = location.doorId;
      const currentFridge = refrigerators[doorId] || {};
      const row = currentFridge[location.rowId];
      const stack = row.stacks[location.stackIndex];
      const item = stack.find((i: Item) => i.id === selectedItemId);
      if (!item) return;

      const newItem = { ...item, id: generateUniqueId(item.skuId) };
      const currentWidth = row.stacks.reduce((acc: number, s: Item[]) => acc + getStackWidth(s), 0);

      // Account for gaps between stacks (1px per gap)
      const gapWidth = row.stacks.length; // Will have one more gap after adding new stack

      if (currentWidth + newItem.width + gapWidth <= row.capacity) {
        const updatedRefrigerators = produce(refrigerators, draft => {
          draft[doorId][location.rowId].stacks.push([newItem]);
        });

        const historyUpdate = pushToHistory(updatedRefrigerators, history, historyIndex, currentLayoutId);
        set({
          refrigerators: updatedRefrigerators,
          refrigerator: updatedRefrigerators['door-1'] || {},
          ...historyUpdate
        });

        toast.success('Item duplicated successfully!');
      } else {
        toast.error('Not enough space in the row to duplicate!');
      }
    }, duplicateAndStack: () => {
      const state = get();
      const { selectedItemId, findStackLocation, refrigerators, history, historyIndex, currentLayoutId } = state;
      if (!selectedItemId) return;

      const location = findStackLocation(selectedItemId);
      if (!location) return;

      const doorId = location.doorId;
      const currentFridge = refrigerators[doorId] || {};
      const row = currentFridge[location.rowId];
      const stack = row.stacks[location.stackIndex];
      const item = stack.find((i: Item) => i.id === selectedItemId);
      if (!item || !item.constraints.stackable) return;

      const newItem = { ...item, id: generateUniqueId(item.skuId) };
      const currentStackHeight = stack.reduce((acc: number, i: Item) => acc + i.height, 0);

      if (currentStackHeight + newItem.height <= row.maxHeight) {
        const updatedRefrigerators = produce(refrigerators, draft => {
          draft[doorId][location.rowId].stacks[location.stackIndex].push(newItem);
        });

        const historyUpdate = pushToHistory(updatedRefrigerators, history, historyIndex, currentLayoutId);
        set({
          refrigerators: updatedRefrigerators,
          refrigerator: updatedRefrigerators['door-1'] || {},
          ...historyUpdate
        });

        toast.success('Item stacked successfully!');
      } else {
        toast.error('Cannot stack - exceeds maximum row height!');
      }
    }, replaceSelectedItem: (newSku, isRulesEnabled = true) => {
      const state = get();
      const { selectedItemId, findStackLocation, refrigerators, history, historyIndex, currentLayoutId } = state;
      if (!selectedItemId) return;

      const location = findStackLocation(selectedItemId);
      if (!location) return;

      const doorId = location.doorId;
      const currentFridge = refrigerators[doorId] || {};
      const row = currentFridge[location.rowId];
      const stack = row.stacks[location.stackIndex];
      const itemIndex = stack.findIndex((i: Item) => i.id === selectedItemId);
      const oldItem = stack[itemIndex];
      const newItem: Item = { ...newSku, id: generateUniqueId(newSku.skuId) };

      // Only check product type rules if rules are enabled
      if (isRulesEnabled && row.allowedProductTypes !== 'all' && !row.allowedProductTypes.includes(newItem.productType)) {
        toast.error(`Cannot replace: This row does not accept "${newItem.productType}" products.`);
        return;
      }

      // Always check size constraints (width and height)
      const currentWidth = row.stacks.reduce((acc: number, s: Item[]) => acc + getStackWidth(s), 0);
      const widthDifference = newItem.width - oldItem.width;

      // Account for gaps between stacks (1px per gap)
      const gapWidth = Math.max(0, row.stacks.length - 1);

      if (currentWidth + widthDifference + gapWidth > row.capacity) {
        toast.error('Cannot replace: The new item is too wide for this row.');
        return;
      }

      const currentStackHeight = stack.reduce((acc: number, i: Item) => acc + i.height, 0);
      const heightDifference = newItem.height - oldItem.height;
      if (currentStackHeight + heightDifference > row.maxHeight) {
        toast.error('Cannot replace: The new item is too tall for this stack.');
        return;
      }

      const updatedRefrigerators = produce(refrigerators, draft => {
        draft[doorId][location.rowId].stacks[location.stackIndex][itemIndex] = newItem;
      });

      const historyUpdate = pushToHistory(updatedRefrigerators, history, historyIndex, currentLayoutId);
      set({
        refrigerators: updatedRefrigerators,
        refrigerator: updatedRefrigerators['door-1'] || {},
        selectedItemId: newItem.id,
        ...historyUpdate
      });

      toast.success('Item replaced successfully!');
    }, addItemFromSku: (sku, targetRowId, targetStackIndex = -1, doorId?: string) => {
      const state = get();
      const { refrigerators, history, historyIndex, currentLayoutId } = state;

      // Use provided doorId, or default to door-1
      const finalDoorId = doorId || 'door-1';

      console.log('🔧 addItemFromSku called:', { sku: sku.skuId, targetRowId, targetStackIndex, doorId, finalDoorId });

      const currentFridge = refrigerators[finalDoorId] || {};
      console.log('📦 Current fridge data:', { doorId: finalDoorId, hasRow: !!currentFridge[targetRowId], rowKeys: Object.keys(currentFridge) });

      const targetRow = currentFridge[targetRowId];
      if (!targetRow) {
        console.log('❌ Target row not found!', { targetRowId, availableRows: Object.keys(currentFridge) });
        return;
      }

      // NEW: For BLANK spaces, set height to match row's maxHeight
      const newItem: Item = {
        ...sku,
        id: generateUniqueId(sku.skuId),
        // Auto-fill height for blank spaces
        height: sku.productType === 'BLANK' ? targetRow.maxHeight : sku.height,
        heightMM: sku.productType === 'BLANK' ? targetRow.maxHeight / PIXELS_PER_MM : sku.heightMM,
        widthMM: sku.widthMM,
        customWidth: sku.productType === 'BLANK' ? sku.width : undefined
      };

      const updatedRefrigerators = produce(refrigerators, draft => {
        if (targetStackIndex >= 0 && targetStackIndex <= draft[finalDoorId][targetRowId].stacks.length) {
          draft[finalDoorId][targetRowId].stacks.splice(targetStackIndex, 0, [newItem]);
        } else {
          draft[finalDoorId][targetRowId].stacks.push([newItem]);
        }
      });

      console.log('✅ Item added, updating store:', { doorId: finalDoorId, newStacksCount: updatedRefrigerators[finalDoorId][targetRowId].stacks.length });

      const historyUpdate = pushToHistory(updatedRefrigerators, history, historyIndex, currentLayoutId);
      set({
        refrigerators: updatedRefrigerators,
        refrigerator: updatedRefrigerators['door-1'] || {},
        ...historyUpdate
      });
    }, moveItem: (itemId, targetRowId, targetStackIndex, targetDoorId?: string) => {
      const state = get();
      const { findStackLocation, isMultiDoor, refrigerators, history, historyIndex, currentLayoutId } = state;
      const location = findStackLocation(itemId);
      if (!location) return;

      const sourceDoorId = location.doorId;
      const finalTargetDoorId = targetDoorId || sourceDoorId;

      // Check if it's a cross-door move
      const isCrossDoorMove = isMultiDoor && sourceDoorId !== finalTargetDoorId;

      if (isCrossDoorMove) {
        // Cross-door move: update both doors in one transaction
        const sourceFridge = refrigerators[sourceDoorId] || {};
        const draggedStack = sourceFridge[location.rowId].stacks[location.stackIndex];

        const updatedRefrigerators = produce(refrigerators, draft => {
          // Remove from source door
          draft[sourceDoorId][location.rowId].stacks.splice(location.stackIndex, 1);

          // Add to target door
          const targetRow = draft[finalTargetDoorId][targetRowId];
          if (targetStackIndex !== undefined) {
            targetRow.stacks.splice(targetStackIndex, 0, draggedStack);
          } else {
            targetRow.stacks.push(draggedStack);
          }
        });

        const historyUpdate = pushToHistory(updatedRefrigerators, history, historyIndex, currentLayoutId);
        set({
          refrigerators: updatedRefrigerators,
          refrigerator: updatedRefrigerators['door-1'] || {},
          ...historyUpdate
        });

      } else {
        // Same-door move
        const currentFridge = refrigerators[sourceDoorId] || {};
        const draggedStack = currentFridge[location.rowId].stacks[location.stackIndex];

        const updatedRefrigerators = produce(refrigerators, draft => {
          // Remove from source
          draft[sourceDoorId][location.rowId].stacks.splice(location.stackIndex, 1);

          // Add to target
          const targetRow = draft[sourceDoorId][targetRowId];
          if (targetStackIndex !== undefined) {
            targetRow.stacks.splice(targetStackIndex, 0, draggedStack);
          } else {
            targetRow.stacks.push(draggedStack);
          }
        });

        const historyUpdate = pushToHistory(updatedRefrigerators, history, historyIndex, currentLayoutId);
        set({
          refrigerators: updatedRefrigerators,
          refrigerator: updatedRefrigerators['door-1'] || {},
          ...historyUpdate
        });
      }
    }, reorderStack: (rowId, oldIndex, newIndex, doorId?: string) => {
      const state = get();
      const { isMultiDoor, refrigerators, history, historyIndex, currentLayoutId } = state;

      // Use provided doorId or try to find it
      const finalDoorId = doorId || (isMultiDoor
        ? Object.keys(refrigerators).find(dId =>
          refrigerators[dId][rowId]?.stacks?.[oldIndex]?.[0]?.id
        )
        : undefined) || 'door-1';

      const updatedRefrigerators = produce(refrigerators, draft => {
        draft[finalDoorId][rowId].stacks = arrayMove(draft[finalDoorId][rowId].stacks, oldIndex, newIndex);
      });

      const historyUpdate = pushToHistory(updatedRefrigerators, history, historyIndex, currentLayoutId);
      set({
        refrigerators: updatedRefrigerators,
        refrigerator: updatedRefrigerators['door-1'] || {},
        ...historyUpdate
      });
    }, stackItem: (draggedStackId, targetStackId) => {
      const state = get();
      const { findStackLocation, refrigerators, history, historyIndex, currentLayoutId } = state;
      const draggedLocation = findStackLocation(draggedStackId);
      const targetLocation = findStackLocation(targetStackId);

      if (!draggedLocation || !targetLocation || draggedLocation.rowId !== targetLocation.rowId) {
        return;
      }

      // Ensure both items are in the same door
      if (draggedLocation.doorId !== targetLocation.doorId) {
        toast.error('Cannot stack items across different doors');
        return;
      }

      const doorId = draggedLocation.doorId;
      const currentFridge = refrigerators[doorId] || {};
      const row = currentFridge[draggedLocation.rowId];
      const draggedStack = row.stacks[draggedLocation.stackIndex];
      const itemToStack = draggedStack[0];

      const updatedRefrigerators = produce(refrigerators, draft => {
        // Add item to target stack
        draft[doorId][draggedLocation.rowId].stacks[targetLocation.stackIndex].push(itemToStack);

        // Auto-sort by width: ASCENDING (narrowest first in array)
        // With flex-col-reverse: array[0] (narrow) shows at TOP, array[last] (wide) shows at BOTTOM
        draft[doorId][draggedLocation.rowId].stacks[targetLocation.stackIndex].sort((a, b) => a.width - b.width);

        // Remove the original stack
        draft[doorId][draggedLocation.rowId].stacks.splice(draggedLocation.stackIndex, 1);
      });

      const historyUpdate = pushToHistory(updatedRefrigerators, history, historyIndex, currentLayoutId);
      set({
        refrigerators: updatedRefrigerators,
        refrigerator: updatedRefrigerators['door-1'] || {},
        ...historyUpdate
      });
    }, undo: () => {
      set(state => {
        if (state.historyIndex > 0) {
          const newIndex = state.historyIndex - 1;
          const previousMultiDoor = state.history[newIndex];
          toast.success('Undo successful');

          // History is always MultiDoorRefrigerator format
          return {
            refrigerators: produce(previousMultiDoor, () => { }),
            refrigerator: produce(previousMultiDoor['door-1'] || {}, () => { }),
            historyIndex: newIndex,
            selectedItemId: null
          };
        } else {
          toast.error('Nothing to undo');
          return state;
        }
      });
    }, redo: () => {
      set(state => {
        if (state.historyIndex < state.history.length - 1) {
          const newIndex = state.historyIndex + 1;
          const nextMultiDoor = state.history[newIndex];
          toast.success('Redo successful');

          // History is always MultiDoorRefrigerator format
          return {
            refrigerators: produce(nextMultiDoor, () => { }),
            refrigerator: produce(nextMultiDoor['door-1'] || {}, () => { }),
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
    // Blank Space Width Update
    // ========================================
    updateBlankWidth: (itemId: string, newWidthMM: number) => {
      const state = get();
      const { findStackLocation, refrigerators, history, historyIndex, currentLayoutId } = state;
      const location = findStackLocation(itemId);

      if (!location) {
        toast.error('Item not found');
        return;
      }

      const doorId = location.doorId;
      const currentFridge = refrigerators[doorId] || {};
      const item = currentFridge[location.rowId].stacks[location.stackIndex][location.itemIndex];

      // Only allow width update for BLANK spaces
      if (item.productType !== 'BLANK') {
        toast.error('Width can only be adjusted for blank spaces');
        return;
      }

      const row = currentFridge[location.rowId];

      // CRITICAL FIX: Only count the bottom (first) item of each stack
      // Stacked items (index > 0) don't take horizontal space
      const usedWidth = row.stacks.reduce((sum, stack) => {
        // Only count the first item (bottom of stack)
        const bottomItem = stack[0];
        if (!bottomItem) return sum;

        // If this is the selected item's stack, don't count it
        if (stack.some(stackItem => stackItem.id === itemId)) {
          return sum;
        }

        // Add the bottom item's width (stacked items don't take horizontal space)
        return sum + bottomItem.width;
      }, 0);

      // CRITICAL FIX: Account for 1px gaps between OTHER stacks (excluding the selected one)
      // We need to count gaps between OTHER stacks (excluding the selected one)
      // Example: If there are 3 total stacks and we're editing one:
      //   - Other stacks: 2
      //   - Gaps between other stacks: 2 - 1 = 1px
      const otherStacksCount = row.stacks.filter(stack => !stack.some(stackItem => stackItem.id === itemId)).length;
      const gapWidth = otherStacksCount > 1 ? otherStacksCount - 1 : 0;

      const availableWidth = row.capacity - usedWidth - gapWidth;

      // Clamp to min/max (min: 25mm, max: available space)
      const MIN_WIDTH_MM = 25;
      const MIN_WIDTH = Math.round(MIN_WIDTH_MM * PIXELS_PER_MM);
      const MAX_WIDTH = availableWidth;

      const newWidth = Math.round(newWidthMM * PIXELS_PER_MM);
      const clampedWidth = Math.max(MIN_WIDTH, Math.min(newWidth, MAX_WIDTH));
      const clampedWidthMM = clampedWidth / PIXELS_PER_MM;

      // If no change, don't update
      if (clampedWidth === item.width) {
        return;
      }

      // Update item width
      const updatedRefrigerators = produce(refrigerators, draft => {
        const targetItem = draft[doorId][location.rowId].stacks[location.stackIndex][location.itemIndex];
        targetItem.width = clampedWidth;
        targetItem.widthMM = clampedWidthMM;
        targetItem.customWidth = clampedWidth;
      });

      const historyUpdate = pushToHistory(updatedRefrigerators, history, historyIndex, currentLayoutId);
      set({
        refrigerators: updatedRefrigerators,
        refrigerator: updatedRefrigerators['door-1'] || {},
        ...historyUpdate
      });
    },// ========================================
    // Persistence Actions
    // ========================================
    initializeLayout: (layoutId: string, initialLayout: Refrigerator | MultiDoorRefrigerator, forceInit = false, layoutData?: any) => {
      // If forceInit is true (e.g., from AI import), skip draft check and use provided layout
      if (forceInit) {
        const normalizedLayout = normalizeToMultiDoor(initialLayout);
        const initialHistory = [produce(normalizedLayout, () => { })]; // Create history array

        // 1. Update Zustand State
        set({
          isMultiDoor: layoutData?.doorCount > 1,
          refrigerators: normalizedLayout,
          refrigerator: normalizedLayout['door-1'] || {},
          history: initialHistory,
          historyIndex: 0,
          currentLayoutId: layoutId,
          hasPendingDraft: false,
          draftMetadata: null,
          syncStatus: 'synced', // Mark as synced immediately
          selectedItemId: null
        });

        // 2. CRITICAL FIX: Save to LocalStorage IMMEDIATELY
        // This ensures the data survives a page refresh
        saveToLocalStorage(
          normalizedLayout,
          initialHistory,
          0,
          layoutId
        );

        return;
      }

      const draft = loadFromLocalStorage(layoutId);

      // Check if this is a multi-door layout
      const isMultiDoor = layoutData?.doorCount && layoutData?.doorCount > 1;

      if (draft) {

        const draftNormalized = normalizeToMultiDoor(draft.refrigerator);
        const normalizedHistory = draft.history.map((h: any) => normalizeToMultiDoor(h));

        set({
          isMultiDoor: isMultiDoor,
          refrigerators: draftNormalized,
          refrigerator: draftNormalized['door-1'] || {},
          history: normalizedHistory,
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

        toast.success('Draft found!', { duration: 4000 });
      } else {
        // No draft - use initial layout
        const refrigerators = isMultiDoor
          ? layoutData.doors.reduce((acc: any, door: any) => {
            acc[door.id] = door.layout;
            return acc;
          }, {})
          : normalizeToMultiDoor(initialLayout);

        set({
          isMultiDoor: isMultiDoor,
          refrigerators: refrigerators,
          refrigerator: refrigerators['door-1'] || {},
          history: [JSON.parse(JSON.stringify(refrigerators))],
          historyIndex: 0,
          currentLayoutId: layoutId,
          hasPendingDraft: false,
          draftMetadata: null,
          syncStatus: 'idle',
          selectedItemId: null
        });
      }
    }, switchLayout: (layoutId: string, newLayout: Refrigerator | MultiDoorRefrigerator, layoutData?: any) => {
      const state = get();

      // Save current layout first - always save as MultiDoorRefrigerator format
      if (state.currentLayoutId) {
        saveToLocalStorage(
          state.refrigerators,
          state.history,
          state.historyIndex,
          state.currentLayoutId
        );
      }

      // Check if this is a multi-door layout
      const isMultiDoor = layoutData?.doorCount && layoutData?.doorCount > 1;

      // Load new layout
      const draft = loadFromLocalStorage(layoutId);

      if (draft) {
        // Draft exists - normalize it
        const draftNormalized = normalizeToMultiDoor(draft.refrigerator);
        const normalizedHistory = draft.history.map((h: any) => normalizeToMultiDoor(h));

        set({
          isMultiDoor: isMultiDoor,
          refrigerators: draftNormalized,
          refrigerator: draftNormalized['door-1'] || {},
          history: normalizedHistory,
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
        const refrigerators = isMultiDoor
          ? layoutData.doors.reduce((acc: any, door: any) => {
            acc[door.id] = door.layout;
            return acc;
          }, {})
          : normalizeToMultiDoor(newLayout);

        set({
          isMultiDoor: isMultiDoor,
          refrigerators: refrigerators,
          refrigerator: refrigerators['door-1'] || {},
          history: [JSON.parse(JSON.stringify(refrigerators))],
          historyIndex: 0,
          currentLayoutId: layoutId,
          hasPendingDraft: false,
          draftMetadata: null,
          selectedItemId: null
        });
      }
    }, restoreDraft: () => {
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

      // Normalize draft data
      const draftNormalized = normalizeToMultiDoor(draft.refrigerator);
      const normalizedHistory = draft.history.map((h: any) => normalizeToMultiDoor(h));

      set({
        refrigerators: draftNormalized,
        refrigerator: draftNormalized['door-1'] || {},
        history: normalizedHistory,
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
    }, clearDraft: () => {
      set(state => {
        // Create empty refrigerators (keep structure, clear all stacks)
        const emptyRefrigerators: MultiDoorRefrigerator = {};

        for (const doorId in state.refrigerators) {
          emptyRefrigerators[doorId] = produce(state.refrigerators[doorId], draft => {
            Object.keys(draft).forEach(rowId => {
              draft[rowId].stacks = [];
            });
          });
        }

        // CLEAR localStorage completely (true clear - no undo)
        if (state.currentLayoutId) {
          clearLocalStorage(state.currentLayoutId);
        }

        // Reset to fresh history state (cannot undo clear)
        return {
          refrigerators: emptyRefrigerators,
          refrigerator: emptyRefrigerators['door-1'] || {},
          history: [produce(emptyRefrigerators, () => { })], // Fresh history with only empty state
          historyIndex: 0,
          selectedItemId: null,
          hasPendingDraft: false,
          draftMetadata: null
        };
      });

      toast.success('All items cleared - cannot undo', { duration: 3000 });
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