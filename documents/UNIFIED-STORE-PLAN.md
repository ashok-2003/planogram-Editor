# Unified Store & Persistence Implementation Plan

## 🎯 Goal: Simplify & Unify Store + Persistence

### Current Problems (As You Observed):
1. ❌ Store and persistence are **split** (hard to understand)
2. ❌ Complex useEffect hooks in component
3. ❌ Race conditions on page refresh
4. ❌ Undo/redo history NOT persisted
5. ❌ Single draft for all layouts (overwrites on switch)
6. ❌ No clear/empty refrigerator action

---

## 🎨 Your Requirements

### 1. Clear Draft Button
**What it does:** Empty the refrigerator (remove ALL items from ALL rows)

```tsx
// User clicks "Clear Draft" button
<button onClick={actions.clearDraft}>Clear All Items</button>
    ↓
// Store action empties refrigerator
actions.clearDraft()
    ↓
// Result: Empty refrigerator, saves to history for undo
{
  'row-1': { stacks: [] },
  'row-2': { stacks: [] },
  // ...all rows empty
}
```

### 2. Manual Save Feedback
**Show lightweight sync status:**
```
User clicks "Save"
    ↓
Show: "Syncing changes..." (1 sec)
    ↓
Show: "Changes synced ✓" (1 sec)
    ↓
Fade out
```

**Implementation:**
- Simple state flag: `syncStatus: 'idle' | 'syncing' | 'synced'`
- Auto-transitions: `idle → syncing → synced → idle`
- Non-blocking (doesn't slow performance)

### 3. Persist on Page Refresh
**Flow:**
```
User works on planogram
    ↓
User accidentally hits Refresh (F5)
    ↓
Page reloads
    ↓
Store checks localStorage
    ↓
If draft exists:
    Show: "You have unsaved changes. Restore?"
        [Restore] [Dismiss]
```

### 4. Unified Store Architecture
**ONE place for everything:**
- ✅ State management
- ✅ Persistence (localStorage)
- ✅ Auto-save logic
- ✅ Draft detection
- ✅ Layout switching
- ✅ Undo/redo with persistence

---

## 🏗️ New Unified Architecture

### Single Store Structure
```typescript
interface UnifiedPlanogramState {
  // ========================================
  // CORE STATE
  // ========================================
  refrigerator: Refrigerator;
  selectedItemId: string | null;
  
  // ========================================
  // HISTORY (Undo/Redo)
  // ========================================
  history: Refrigerator[];
  historyIndex: number;
  
  // ========================================
  // PERSISTENCE STATE
  // ========================================
  currentLayoutId: string | null;
  hasPendingDraft: boolean;
  draftMetadata: {
    layoutId: string;
    timestamp: string;
  } | null;
  
  // ========================================
  // SYNC STATUS (for UI feedback)
  // ========================================
  syncStatus: 'idle' | 'syncing' | 'synced';
  lastSynced: Date | null;
  
  // ========================================
  // ACTIONS (All in one place!)
  // ========================================
  actions: {
    // Core actions
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
    
    // History actions
    undo: () => void;
    redo: () => void;
    
    // Persistence actions (NEW)
    initializeLayout: (layoutId: string, initialLayout: Refrigerator) => void;
    switchLayout: (layoutId: string, newLayout: Refrigerator) => void;
    restoreDraft: () => void;
    dismissDraft: () => void;
    clearDraft: () => void;  // NEW: Empty refrigerator
    manualSync: () => void;   // NEW: Manual save with feedback
  }
}
```

---

## 🔧 Implementation Steps

### Step 1: Add Persistence to Store (Unified)

**File:** `lib/store.ts`

**Add to state:**
```typescript
// Persistence state
currentLayoutId: string | null;
hasPendingDraft: boolean;
draftMetadata: { layoutId: string; timestamp: string } | null;
syncStatus: 'idle' | 'syncing' | 'synced';
lastSynced: Date | null;
```

**Add localStorage utilities (inside store file):**
```typescript
// Storage key pattern: planogram-draft-{layoutId}
const getStorageKey = (layoutId: string) => `planogram-draft-${layoutId}`;

interface StoredDraft {
  refrigerator: Refrigerator;
  history: Refrigerator[];
  historyIndex: number;
  layoutId: string;
  timestamp: string;
}

// Save to localStorage
const saveToLocalStorage = (state: UnifiedPlanogramState) => {
  if (!state.currentLayoutId) return;
  
  try {
    const key = getStorageKey(state.currentLayoutId);
    const draft: StoredDraft = {
      refrigerator: state.refrigerator,
      history: state.history,
      historyIndex: state.historyIndex,
      layoutId: state.currentLayoutId,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem(key, JSON.stringify(draft));
  } catch (error) {
    console.error('Failed to save:', error);
  }
};

// Load from localStorage
const loadFromLocalStorage = (layoutId: string): StoredDraft | null => {
  try {
    const key = getStorageKey(layoutId);
    const data = localStorage.getItem(key);
    if (!data) return null;
    
    const draft: StoredDraft = JSON.parse(data);
    
    // Check if expired (2 days)
    const draftDate = new Date(draft.timestamp);
    const daysDiff = (Date.now() - draftDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysDiff > 2) {
      localStorage.removeItem(key);
      return null;
    }
    
    return draft;
  } catch (error) {
    console.error('Failed to load:', error);
    return null;
  }
};

// Debounced auto-save
let saveTimeout: NodeJS.Timeout | null = null;
const debouncedSave = (state: UnifiedPlanogramState) => {
  if (saveTimeout) clearTimeout(saveTimeout);
  
  saveTimeout = setTimeout(() => {
    saveToLocalStorage(state);
    // Don't update lastSynced here (only on manual save)
  }, 1000);
};
```

---

### Step 2: Implement New Actions

#### 2.1 `initializeLayout()`
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

#### 2.2 `switchLayout()`
```typescript
switchLayout: (layoutId: string, newLayout: Refrigerator) => {
  const state = get();
  
  // Save current layout first
  if (state.currentLayoutId) {
    saveToLocalStorage(state);
  }
  
  // Load new layout
  const draft = loadFromLocalStorage(layoutId);
  
  if (draft) {
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
  } else {
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

#### 2.3 `restoreDraft()`
```typescript
restoreDraft: () => {
  set({
    hasPendingDraft: false,
    draftMetadata: null,
    syncStatus: 'synced',
    lastSynced: new Date()
  });
  
  // Show feedback
  toast.success('Draft restored successfully!');
  
  // Reset sync status after 2 seconds
  setTimeout(() => {
    set({ syncStatus: 'idle' });
  }, 2000);
},
```

#### 2.4 `dismissDraft()`
```typescript
dismissDraft: () => {
  const state = get();
  
  // Delete draft from localStorage
  if (state.currentLayoutId) {
    const key = getStorageKey(state.currentLayoutId);
    localStorage.removeItem(key);
  }
  
  // Keep current state, just clear the prompt
  set({
    hasPendingDraft: false,
    draftMetadata: null
  });
  
  toast.success('Draft dismissed');
},
```

#### 2.5 `clearDraft()` (NEW - Empty Refrigerator)
```typescript
clearDraft: () => {
  set(state => {
    // Create empty refrigerator (keep structure, clear stacks)
    const emptyFridge = produce(state.refrigerator, draft => {
      Object.keys(draft).forEach(rowId => {
        draft[rowId].stacks = [];
      });
    });
    
    // Add to history for undo
    const historyUpdate = pushToHistory(
      emptyFridge,
      state.history,
      state.historyIndex,
      state.currentLayoutId
    );
    
    return {
      refrigerator: emptyFridge,
      ...historyUpdate,
      selectedItemId: null
    };
  });
  
  toast.success('All items cleared');
},
```

#### 2.6 `manualSync()` (NEW - Manual Save with Feedback)
```typescript
manualSync: () => {
  const state = get();
  
  // Set syncing status
  set({ syncStatus: 'syncing' });
  
  // Save to localStorage
  saveToLocalStorage(state);
  
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

---

### Step 3: Update `pushToHistory()` to Auto-Save

**Modify helper function:**
```typescript
const pushToHistory = (
  newState: Refrigerator,
  history: Refrigerator[],
  historyIndex: number,
  currentLayoutId: string | null
): { history: Refrigerator[]; historyIndex: number } => {
  const newHistory = history.slice(0, historyIndex + 1);
  newHistory.push(produce(newState, () => {}));
  const limitedHistory = newHistory.slice(-50);
  
  // Trigger auto-save
  if (currentLayoutId) {
    // Get current store state for saving
    const state = usePlanogramStore.getState();
    debouncedSave({
      ...state,
      refrigerator: newState,
      history: limitedHistory,
      historyIndex: limitedHistory.length - 1
    });
  }
  
  return {
    history: limitedHistory,
    historyIndex: limitedHistory.length - 1
  };
};
```

**Update all action calls:**
```typescript
// Add currentLayoutId parameter to pushToHistory
const historyUpdate = pushToHistory(
  newFridge,
  state.history,
  state.historyIndex,
  state.currentLayoutId  // ADD THIS
);
```

---

### Step 4: Simplify Component

**File:** `app/planogram/components/planogramEditor.tsx`

#### 4.1 Remove old imports
```typescript
// ❌ DELETE THIS
import { 
  debouncedSavePlanogram, 
  loadPlanogramDraft, 
  hasSavedDraft, 
  clearPlanogramDraft, 
  getLastSaveTimestamp, 
  savePlanogramDraft, 
  isDraftDifferent, 
  getSavedDraft 
} from '@/lib/persistence';
```

#### 4.2 Remove component state
```typescript
// ❌ DELETE THESE
const [hasMounted, setHasMounted] = useState(false);
const [showRestorePrompt, setShowRestorePrompt] = useState(false);
const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
const [initialLayoutLoaded, setInitialLayoutLoaded] = useState(false);
const [isSaving, setIsSaving] = useState(false);
```

#### 4.3 Use store state
```typescript
// ✅ ADD THIS
const { 
  refrigerator,
  actions,
  findStackLocation,
  hasPendingDraft,
  draftMetadata,
  syncStatus,
  lastSynced
} = usePlanogramStore();
```

#### 4.4 Replace useEffect hooks
```typescript
// ❌ DELETE all 4 useEffect hooks (lines 254-336)

// ✅ REPLACE WITH ONE SIMPLE HOOK
useEffect(() => {
  actions.initializeLayout(selectedLayoutId, initialLayout);
  
  // Simulate loading for UX
  const timer = setTimeout(() => setIsLoading(false), 500);
  return () => clearTimeout(timer);
}, []); // Run ONCE on mount
```

#### 4.5 Simplify layout change handler
```typescript
const handleLayoutChange = useCallback((layoutId: string) => {
  setSelectedLayoutId(layoutId);
  const newLayout = initialLayouts[layoutId]?.layout;
  if (newLayout) {
    actions.switchLayout(layoutId, newLayout);
  }
}, [initialLayouts, actions]);
```

#### 4.6 Update JSX
```tsx
{/* Restore Draft Prompt */}
{hasPendingDraft && draftMetadata && (
  <RestorePrompt 
    lastSaveTime={new Date(draftMetadata.timestamp)}
    onRestore={actions.restoreDraft}
    onDismiss={actions.dismissDraft}
  />
)}

{/* Sync Status Indicator */}
<SyncIndicator 
  status={syncStatus}
  lastSynced={lastSynced}
  onManualSync={actions.manualSync}
/>

{/* Clear Draft Button */}
<button 
  onClick={actions.clearDraft}
  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
>
  Clear All Items
</button>
```

---

### Step 5: Create Sync Indicator Component

**File:** `app/planogram/components/planogramEditor.tsx`

```tsx
function SyncIndicator({ 
  status, 
  lastSynced, 
  onManualSync 
}: { 
  status: 'idle' | 'syncing' | 'synced';
  lastSynced: Date | null;
  onManualSync: () => void;
}) {
  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };
  
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
      {/* Manual Sync Button */}
      <button 
        onClick={onManualSync}
        disabled={status === 'syncing'}
        className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-colors ${
          status === 'syncing'
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
        </svg>
        Save Now
      </button>
      
      {/* Status Display */}
      <div className="flex items-center gap-2 text-sm">
        {status === 'syncing' && (
          <>
            <Spinner size="sm" color="blue" />
            <span className="text-blue-600 font-medium">Syncing changes...</span>
          </>
        )}
        
        {status === 'synced' && (
          <>
            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-green-600 font-medium">Changes synced ✓</span>
          </>
        )}
        
        {status === 'idle' && lastSynced && (
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

---

### Step 6: Delete Old Persistence File

**File to delete:** `lib/persistence.ts`

```bash
# After verifying everything works
rm lib/persistence.ts
```

---

## 📊 Benefits of Unified Architecture

| Aspect | Before | After |
|--------|--------|-------|
| **Files with persistence logic** | 3 files | 1 file (store only) |
| **Component lines** | 640 lines | ~350 lines |
| **useEffect hooks** | 4 complex | 1 simple |
| **State management** | Split | Unified |
| **Auto-save** | Component-driven | Store-driven |
| **Race conditions** | Multiple | None |
| **Undo/redo persistence** | ❌ Not saved | ✅ Fully saved |
| **Layout-specific drafts** | ❌ Overwrites | ✅ Independent |
| **Clear refrigerator** | ❌ Missing | ✅ Added |
| **Sync feedback** | ❌ Complex | ✅ Simple & smooth |

---

## 🧪 Testing Checklist

- [ ] Page refresh → Shows restore prompt if changes exist
- [ ] Restore draft → Full undo/redo history works
- [ ] Dismiss draft → Prompt disappears, localStorage cleared
- [ ] Clear Draft button → Empties all items, can undo
- [ ] Manual sync → Shows "Syncing..." → "Synced ✓" → Fades
- [ ] Auto-save → Works after 1 second of no changes
- [ ] Layout switch → Saves current, loads new (with draft if exists)
- [ ] Multiple layouts → Independent drafts
- [ ] Draft expiry → Auto-deletes after 2 days

---

## 🚀 Implementation Order

1. ✅ **Phase 1:** Add persistence state to store (5 min)
2. ✅ **Phase 2:** Add localStorage utilities to store (10 min)
3. ✅ **Phase 3:** Implement 6 new actions (30 min)
4. ✅ **Phase 4:** Update pushToHistory with auto-save (5 min)
5. ✅ **Phase 5:** Simplify component (20 min)
6. ✅ **Phase 6:** Create SyncIndicator component (10 min)
7. ✅ **Phase 7:** Delete old persistence.ts (1 min)
8. ✅ **Phase 8:** Test all scenarios (20 min)

**Total time: ~100 minutes (1.5 hours)**

---

## 💡 Summary

**What we're doing:**
1. Moving ALL persistence into the store (unified)
2. Adding clear draft button (empties refrigerator)
3. Adding smooth sync feedback (non-blocking)
4. Fixing refresh persistence (restore prompt)
5. Simplifying component by 45% (removing complex hooks)

**Result:**
- ✅ Single source of truth
- ✅ No race conditions
- ✅ Full undo/redo persistence
- ✅ Per-layout drafts
- ✅ Smooth user feedback
- ✅ Much simpler to understand and maintain

**Ready to implement? Let's do this! 🎉**
