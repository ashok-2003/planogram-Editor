# Step-by-Step Implementation Planner
## Unified Store & Persistence Refactor

---

## 📋 Overview

We're going to unify the store and persistence logic in **10 phases**, each with specific, small changes that you can review and test.

**Total Estimated Time:** ~90 minutes
**Phases:** 10
**Files Modified:** 2 main files (`lib/store.ts`, `app/planogram/components/planogramEditor.tsx`)
**Files Deleted:** 1 file (`lib/persistence.ts`)

---

## Phase 1: Add Persistence State to Store
**Time:** 5 minutes
**File:** `lib/store.ts`

### What we're doing:
Adding new state properties for persistence tracking (no logic yet, just structure)

### Changes:
1. Add to `PlanogramState` interface:
   ```typescript
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
   ```

2. Initialize these in the store:
   ```typescript
   currentLayoutId: null,
   hasPendingDraft: false,
   draftMetadata: null,
   syncStatus: 'idle',
   lastSynced: null,
   ```

### Testing:
- Run `npm run dev`
- Check for TypeScript errors
- App should still work (no functionality change yet)

**Status:** ⏳ Not started

---

## Phase 2: Add LocalStorage Utilities to Store
**Time:** 10 minutes
**File:** `lib/store.ts`

### What we're doing:
Adding helper functions for localStorage operations (above the store creation)

### Changes:
1. Add storage key helper
2. Add `StoredDraft` interface
3. Add `saveToLocalStorage()` function
4. Add `loadFromLocalStorage()` function
5. Add `clearLocalStorage()` function
6. Add `debouncedPersist()` function

### Code to add (before `export const usePlanogramStore = create<PlanogramState>(...)`):
```typescript
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
```

### Testing:
- TypeScript should compile without errors
- Functions are defined but not used yet
- App should still work normally

**Status:** ⏳ Not started

---

## Phase 3: Add Action Signatures to Interface
**Time:** 3 minutes
**File:** `lib/store.ts`

### What we're doing:
Adding function signatures for new persistence actions (declarations only)

### Changes:
Add to `actions` in `PlanogramState` interface:
```typescript
actions: {
  // ...existing actions
  
  // NEW: Persistence actions
  initializeLayout: (layoutId: string, initialLayout: Refrigerator) => void;
  switchLayout: (layoutId: string, newLayout: Refrigerator) => void;
  restoreDraft: () => void;
  dismissDraft: () => void;
  clearDraft: () => void;
  manualSync: () => void;
}
```

### Testing:
- TypeScript will show errors (expected - implementations are missing)
- We'll implement these in next phases

**Status:** ⏳ Not started

---

## Phase 4: Implement `initializeLayout()` Action
**Time:** 10 minutes
**File:** `lib/store.ts`

### What we're doing:
Implementing the action that runs when component first mounts - checks for existing draft

### Changes:
Add to `actions` object in store:
```typescript
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
      selectedItemId: null
    });
  }
},
```

### Testing:
- TypeScript errors should reduce
- Don't test functionality yet (component not using it)

**Status:** ⏳ Not started

---

## Phase 5: Implement `switchLayout()` Action
**Time:** 10 minutes
**File:** `lib/store.ts`

### What we're doing:
Implementing layout switching with auto-save of current layout

### Changes:
Add to `actions` object:
```typescript
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
      selectedItemId: null
    });
  }
},
```

### Testing:
- Still can't test functionality (component not using it yet)

**Status:** ⏳ Not started

---

## Phase 6: Implement Simple Actions
**Time:** 8 minutes
**File:** `lib/store.ts`

### What we're doing:
Implementing the simpler actions: `restoreDraft()`, `dismissDraft()`, `clearDraft()`

### Changes:
Add to `actions` object:

```typescript
restoreDraft: () => {
  set({
    hasPendingDraft: false,
    draftMetadata: null,
    syncStatus: 'synced',
    lastSynced: new Date()
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
```

### Testing:
- All TypeScript errors for these actions should be gone
- Still can't functionally test (component not connected)

**Status:** ⏳ Not started

---

## Phase 7: Implement `manualSync()` Action
**Time:** 8 minutes
**File:** `lib/store.ts`

### What we're doing:
Implementing manual save with UI feedback (syncing → synced → idle)

### Changes:
Add to `actions` object:

```typescript
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
```

### Testing:
- All action TypeScript errors should be resolved
- Store is now complete with all persistence logic!

**Status:** ⏳ Not started

---

## Phase 8: Update `pushToHistory()` for Auto-Save
**Time:** 10 minutes
**File:** `lib/store.ts`

### What we're doing:
Modifying the `pushToHistory` helper to trigger auto-save on every change

### Changes:

1. **Find the `pushToHistory` function** (around line 60)

2. **Replace it with:**
```typescript
// Helper function to push new state after modification
const pushToHistory = (
  newState: Refrigerator,
  history: Refrigerator[],
  historyIndex: number,
  currentLayoutId: string | null  // NEW PARAMETER
): { history: Refrigerator[]; historyIndex: number } => {
  // Remove any future history if we're not at the end
  const newHistory = history.slice(0, historyIndex + 1);
  
  // Add the new state
  newHistory.push(produce(newState, () => {}));
  
  // Limit history to last 50 states
  const limitedHistory = newHistory.slice(-50);
  
  // Trigger auto-save
  if (currentLayoutId) {
    debouncedPersist(
      newState,
      limitedHistory,
      limitedHistory.length - 1,
      currentLayoutId
    );
  }
  
  return {
    history: limitedHistory,
    historyIndex: limitedHistory.length - 1
  };
};
```

3. **Update ALL calls to `pushToHistory`** - Search for `pushToHistory(` and add `state.currentLayoutId`:

Find patterns like:
```typescript
const historyUpdate = pushToHistory(newFridge, state.history, state.historyIndex);
```

Replace with:
```typescript
const historyUpdate = pushToHistory(
  newFridge, 
  state.history, 
  state.historyIndex,
  state.currentLayoutId
);
```

**Locations to update (approximately 8-9 places):**
- `removeItemsById`
- `duplicateAndAddNew`
- `duplicateAndStack`
- `replaceSelectedItem`
- `addItemFromSku`
- `moveItem`
- `reorderStack`
- `stackItem`

### Testing:
- Run TypeScript check: no errors
- Store is now FULLY implemented with auto-save!
- Still can't test functionality (component not using it)

**Status:** ⏳ Not started

---

## Phase 9: Simplify Component - Part A (Remove Old Logic)
**Time:** 15 minutes
**File:** `app/planogram/components/planogramEditor.tsx`

### What we're doing:
Removing old persistence logic from component (imports, state, hooks)

### Changes:

#### 9.1: Remove persistence imports (line ~17)
```typescript
// ❌ DELETE THIS ENTIRE LINE:
import { debouncedSavePlanogram, loadPlanogramDraft, hasSavedDraft, clearPlanogramDraft, getLastSaveTimestamp, savePlanogramDraft, isDraftDifferent, getSavedDraft } from '@/lib/persistence';
```

#### 9.2: Remove component state (lines ~240-245)
```typescript
// ❌ DELETE THESE LINES:
const [hasMounted, setHasMounted] = useState(false);
const [showRestorePrompt, setShowRestorePrompt] = useState(false);
const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
const [initialLayoutLoaded, setInitialLayoutLoaded] = useState(false);
const [isSaving, setIsSaving] = useState(false);
```

#### 9.3: Add store state access (after existing `usePlanogramStore` calls)
```typescript
// ✅ ADD THIS:
const { 
  hasPendingDraft,
  draftMetadata,
  syncStatus,
  lastSynced,
  currentLayoutId
} = usePlanogramStore();
```

#### 9.4: Remove old useEffect hooks
Find and DELETE these 4 useEffect blocks:
- **useEffect #1** (hasMounted) - lines ~254-263
- **useEffect #2** (draft check) - lines ~265-287
- **useEffect #3** (layout switch) - lines ~296-305
- **useEffect #4** (auto-save) - lines ~325-336

#### 9.5: Add NEW simple initialization useEffect
```typescript
// ✅ ADD THIS (replace the 4 deleted useEffects):
useEffect(() => {
  // Initialize layout once on mount
  actions.initializeLayout(selectedLayoutId, initialLayout);
  
  // Simulate loading delay for UX
  const loadingTimer = setTimeout(() => {
    setIsLoading(false);
  }, 500);
  
  return () => clearTimeout(loadingTimer);
}, []); // Run ONCE on mount
```

### Testing:
- App should compile
- Should see TypeScript errors about missing handlers (we'll fix next)
- Don't test functionality yet

**Status:** ⏳ Not started

---

## Phase 10: Simplify Component - Part B (Update Handlers & JSX)
**Time:** 15 minutes
**File:** `app/planogram/components/planogramEditor.tsx`

### What we're doing:
Updating handlers and JSX to use new store actions

### Changes:

#### 10.1: Remove old handlers
DELETE these callback functions:
- `handleRestoreDraft` (lines ~348-368)
- `handleDismissDraft` (lines ~370-374)
- `handleManualSave` (lines ~376-387)

#### 10.2: Update `handleLayoutChange`
Find and REPLACE:
```typescript
// OLD:
const handleLayoutChange = useCallback((layoutId: string) => {
  setSelectedLayoutId(layoutId);
  const newLayout = initialLayouts[layoutId]?.layout;
  if (newLayout) {
    actions.selectItem(null);
    usePlanogramStore.setState({ refrigerator: newLayout });
  }
}, [initialLayouts, actions]);

// NEW:
const handleLayoutChange = useCallback((layoutId: string) => {
  setSelectedLayoutId(layoutId);
  const newLayout = initialLayouts[layoutId]?.layout;
  if (newLayout) {
    actions.switchLayout(layoutId, newLayout);
  }
}, [initialLayouts, actions]);
```

#### 10.3: Update RestorePrompt JSX
Find the RestorePrompt component usage and UPDATE:
```tsx
{/* OLD: */}
{showRestorePrompt && (
  <RestorePrompt 
    lastSaveTime={lastSaveTime}
    onRestore={handleRestoreDraft}
    onDismiss={handleDismissDraft}
  />
)}

{/* NEW: */}
{hasPendingDraft && draftMetadata && (
  <RestorePrompt 
    lastSaveTime={new Date(draftMetadata.timestamp)}
    onRestore={actions.restoreDraft}
    onDismiss={actions.dismissDraft}
  />
)}
```

#### 10.4: Update SaveIndicator to SyncIndicator
Find the SaveIndicator component and UPDATE:
```tsx
{/* OLD: */}
<SaveIndicator 
  lastSaveTime={lastSaveTime} 
  onManualSave={handleManualSave} 
  isSaving={isSaving} 
/>

{/* NEW: */}
<SyncIndicator 
  syncStatus={syncStatus}
  lastSynced={lastSynced}
  onManualSync={actions.manualSync}
/>
```

#### 10.5: Add Clear Draft Button
Add this button near the Undo/Redo controls (around line 570):
```tsx
<button
  onClick={actions.clearDraft}
  className="px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center gap-2 bg-red-500 text-white hover:bg-red-600 shadow-md hover:shadow-lg"
  title="Clear all items from refrigerator"
>
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
  Clear All
</button>
```

### Testing:
- App should compile without errors
- Ready for component update!

**Status:** ⏳ Not started

---

## Phase 11: Create SyncIndicator Component
**Time:** 10 minutes
**File:** `app/planogram/components/planogramEditor.tsx`

### What we're doing:
Creating a new component to replace SaveIndicator with better sync feedback

### Changes:
REPLACE the old `SaveIndicator` component with:

```tsx
// --- UI Component for Sync Status ---
function SyncIndicator({ 
  syncStatus, 
  lastSynced, 
  onManualSync 
}: { 
  syncStatus: 'idle' | 'syncing' | 'synced';
  lastSynced: Date | null;
  onManualSync: () => void;
}) {
  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };
  
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
      {/* Manual Sync Button */}
      <button 
        onClick={onManualSync}
        disabled={syncStatus === 'syncing'}
        className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-colors shadow-sm ${
          syncStatus === 'syncing'
            ? 'bg-gray-400 cursor-not-allowed text-white'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
        </svg>
        {syncStatus === 'syncing' ? 'Syncing...' : 'Save Now'}
      </button>
      
      {/* Status Display */}
      <div className="flex items-center gap-2 text-sm">
        {syncStatus === 'syncing' && (
          <>
            <Spinner size="sm" color="blue" />
            <span className="text-blue-600 font-medium">Syncing changes...</span>
          </>
        )}
        
        {syncStatus === 'synced' && (
          <>
            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-green-600 font-medium">Changes synced ✓</span>
          </>
        )}
        
        {syncStatus === 'idle' && lastSynced && (
          <>
            <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            <span className="text-gray-600">Last synced: {getTimeAgo(lastSynced)}</span>
          </>
        )}
      </div>
    </div>
  );
}
```

### Testing:
- Component should render
- Ready for full integration testing!

**Status:** ⏳ Not started

---

## Phase 12: Final Testing & Cleanup
**Time:** 15 minutes

### What we're doing:
Testing all functionality and cleaning up old code

### Testing Checklist:

#### 12.1: Basic Functionality
- [ ] App loads without errors
- [ ] Can add items to refrigerator
- [ ] Can move items
- [ ] Can delete items
- [ ] Undo/Redo works

#### 12.2: Persistence Features
- [ ] Make a change → Wait 1 second → Check localStorage (should save)
- [ ] Refresh page → Should show "Draft found" toast
- [ ] Restore prompt appears
- [ ] Click "Restore" → Previous state returns
- [ ] Click "Dismiss" → Prompt disappears

#### 12.3: Layout Switching
- [ ] Switch from G-26C to G-32C
- [ ] Make changes in G-32C
- [ ] Switch back to G-26C → Should have original work
- [ ] Check localStorage → Should have both drafts

#### 12.4: New Features
- [ ] Click "Clear All" → All items removed
- [ ] Can undo clear operation
- [ ] Click "Save Now" → See "Syncing..." → "Changes synced ✓"
- [ ] Status transitions smoothly

#### 12.5: Undo/Redo Persistence
- [ ] Make 3 changes
- [ ] Refresh page
- [ ] Restore draft
- [ ] Should be able to undo all 3 changes

### Cleanup:
- [ ] Delete `lib/persistence.ts`
- [ ] Check for any unused imports
- [ ] Check for console errors
- [ ] Verify no TypeScript errors

**Status:** ⏳ Not started

---

## 📊 Progress Tracker

| Phase | Status | Time | Notes |
|-------|--------|------|-------|
| 1. Add Persistence State | ⏳ Not Started | 5 min | |
| 2. Add LocalStorage Utilities | ⏳ Not Started | 10 min | |
| 3. Add Action Signatures | ⏳ Not Started | 3 min | |
| 4. Implement `initializeLayout()` | ⏳ Not Started | 10 min | |
| 5. Implement `switchLayout()` | ⏳ Not Started | 10 min | |
| 6. Implement Simple Actions | ⏳ Not Started | 8 min | |
| 7. Implement `manualSync()` | ⏳ Not Started | 8 min | |
| 8. Update `pushToHistory()` | ⏳ Not Started | 10 min | |
| 9. Simplify Component Part A | ⏳ Not Started | 15 min | |
| 10. Simplify Component Part B | ⏳ Not Started | 15 min | |
| 11. Create SyncIndicator | ⏳ Not Started | 10 min | |
| 12. Testing & Cleanup | ⏳ Not Started | 15 min | |

**Total Estimated Time:** ~119 minutes (~2 hours)

---

## 🚀 Ready to Start?

Say **"Start Phase 1"** and I'll begin implementing!

I'll update the status after each phase and wait for your confirmation before moving to the next phase.

---

## 📝 Quick Reference

**Files to modify:**
- `lib/store.ts` (Phases 1-8)
- `app/planogram/components/planogramEditor.tsx` (Phases 9-11)

**Files to delete:**
- `lib/persistence.ts` (Phase 12)

**What you'll get:**
- ✅ Unified store with all persistence logic
- ✅ Per-layout drafts (no more overwrites!)
- ✅ Full undo/redo persistence
- ✅ Smooth sync feedback UI
- ✅ Clear all items button
- ✅ 50% less component code
- ✅ No more race conditions!
