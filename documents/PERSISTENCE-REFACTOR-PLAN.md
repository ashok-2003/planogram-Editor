# 🔄 Persistence Refactor - Move to Zustand Store

**Date:** October 26, 2025  
**Status:** 📋 Planning  
**Priority:** 🔥 Critical - Fixes draft restore bug and simplifies architecture

---

## 🎯 **Objective**

Move all persistence logic from React components into the Zustand store itself, creating a single source of truth and eliminating race conditions that prevent draft restoration from working.

---

## 🐛 **Current Problems**

1. ❌ **Draft restore doesn't work** - Items don't appear after clicking "Restore"
2. ❌ **Race conditions** - `useEffect` overwrites restored state
3. ❌ **Scattered logic** - Persistence code spread across multiple files
4. ❌ **Complex state management** - Multiple flags (`hasRestoredDraft`, `initialLayoutLoaded`)
5. ❌ **No single source of truth** - localStorage and Zustand compete

---

## ✅ **Proposed Solution**

### **Architecture Change:**
```
BEFORE: Component → Zustand ← localStorage (separate)
AFTER:  Component → Zustand (includes persistence)
```

### **Key Principle:**
**Zustand store becomes the ONLY place that reads/writes localStorage**

---

## 📋 **Implementation Phases**

### **Phase 1: Enhanced Store State** ⚡
**Goal:** Add persistence-related state to store

**Changes to `lib/store.ts`:**
```typescript
interface PlanogramState {
  // Existing state
  refrigerator: Refrigerator;
  selectedItemId: string | null;
  history: Refrigerator[];
  historyIndex: number;
  
  // NEW: Persistence state
  currentLayoutId: string;
  lastSaved: Date | null;
  hasPendingDraft: boolean;
  draftMetadata: {
    layoutId: string;
    timestamp: string;
  } | null;
  
  // Existing actions
  actions: {
    // ... existing actions
    
    // NEW: Persistence actions
    initializeLayout: (layoutId: string, initialLayout: Refrigerator) => void;
    switchLayout: (layoutId: string, newLayout: Refrigerator) => void;
    restoreDraft: () => void;
    clearDraft: () => void;
    checkForDraft: (layoutId: string) => boolean;
  }
}
```

**Files Modified:**
- `lib/store.ts`

**Estimated Time:** 30 minutes

---

### **Phase 2: Persistence Middleware** 🔧
**Goal:** Auto-save on every state change

**New Middleware Function:**
```typescript
// Add to lib/store.ts
const persistenceMiddleware = (config) => (set, get, api) => 
  config(
    (...args) => {
      set(...args);
      // Auto-save after every state change (debounced)
      debouncedPersist(get().refrigerator, get().currentLayoutId);
    },
    get,
    api
  );
```

**Features:**
- ✅ Debounced auto-save (1 second delay)
- ✅ Layout-specific storage keys
- ✅ Automatic timestamp tracking
- ✅ Error handling with fallback

**Files Modified:**
- `lib/store.ts`

**Estimated Time:** 45 minutes

---

### **Phase 3: Draft Detection & Auto-Restore** 🔄
**Goal:** Detect and restore drafts on mount

**New Actions:**
```typescript
actions: {
  // Initialize on app mount
  initializeLayout: (layoutId, initialLayout) => {
    const hasDraft = checkLocalStorageForDraft(layoutId);
    
    if (hasDraft) {
      const draft = loadFromLocalStorage(layoutId);
      const isDifferent = !isEqual(draft, initialLayout);
      
      set({
        currentLayoutId: layoutId,
        hasPendingDraft: isDifferent,
        draftMetadata: isDifferent ? getDraftMetadata(layoutId) : null,
        refrigerator: initialLayout, // Show initial until user restores
        history: [produce(initialLayout, () => {})],
        historyIndex: 0
      });
    } else {
      // No draft, just initialize
      set({
        currentLayoutId: layoutId,
        refrigerator: initialLayout,
        history: [produce(initialLayout, () => {})],
        historyIndex: 0,
        hasPendingDraft: false,
        draftMetadata: null
      });
    }
  },
  
  // User clicks "Restore"
  restoreDraft: () => {
    const { currentLayoutId } = get();
    const draft = loadFromLocalStorage(currentLayoutId);
    
    if (draft) {
      set({
        refrigerator: produce(draft, () => {}),
        history: [produce(draft, () => {})],
        historyIndex: 0,
        hasPendingDraft: false,
        draftMetadata: null,
        lastSaved: new Date()
      });
    }
  },
  
  // User clicks "Dismiss"
  clearDraft: () => {
    const { currentLayoutId } = get();
    clearLocalStorage(currentLayoutId);
    
    set({
      hasPendingDraft: false,
      draftMetadata: null
    });
  },
  
  // Switch between layouts
  switchLayout: (layoutId, newLayout) => {
    // Save current state before switching
    saveToLocalStorage(get().refrigerator, get().currentLayoutId);
    
    // Check if new layout has draft
    const hasDraft = checkLocalStorageForDraft(layoutId);
    
    if (hasDraft) {
      const draft = loadFromLocalStorage(layoutId);
      const isDifferent = !isEqual(draft, newLayout);
      
      set({
        currentLayoutId: layoutId,
        refrigerator: newLayout,
        history: [produce(newLayout, () => {})],
        historyIndex: 0,
        hasPendingDraft: isDifferent,
        draftMetadata: isDifferent ? getDraftMetadata(layoutId) : null,
        selectedItemId: null
      });
    } else {
      set({
        currentLayoutId: layoutId,
        refrigerator: newLayout,
        history: [produce(newLayout, () => {})],
        historyIndex: 0,
        hasPendingDraft: false,
        draftMetadata: null,
        selectedItemId: null
      });
    }
  }
}
```

**Files Modified:**
- `lib/store.ts`

**Estimated Time:** 1 hour

---

### **Phase 4: LocalStorage Utilities** 💾
**Goal:** Create helper functions for localStorage operations

**New Utility Functions in `lib/store.ts`:**
```typescript
// Storage key pattern: planogram-draft-{layoutId}
const getStorageKey = (layoutId: string) => `planogram-draft-${layoutId}`;

const saveToLocalStorage = (refrigerator: Refrigerator, layoutId: string): void => {
  try {
    const key = getStorageKey(layoutId);
    const data = {
      refrigerator,
      layoutId,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
};

const loadFromLocalStorage = (layoutId: string): Refrigerator | null => {
  try {
    const key = getStorageKey(layoutId);
    const data = localStorage.getItem(key);
    if (!data) return null;
    
    const parsed = JSON.parse(data);
    return parsed.refrigerator;
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return null;
  }
};

const getDraftMetadata = (layoutId: string): { layoutId: string; timestamp: string } | null => {
  try {
    const key = getStorageKey(layoutId);
    const data = localStorage.getItem(key);
    if (!data) return null;
    
    const parsed = JSON.parse(data);
    return {
      layoutId: parsed.layoutId,
      timestamp: parsed.timestamp
    };
  } catch (error) {
    return null;
  }
};

const checkLocalStorageForDraft = (layoutId: string): boolean => {
  try {
    const key = getStorageKey(layoutId);
    return localStorage.getItem(key) !== null;
  } catch (error) {
    return false;
  }
};

const clearLocalStorage = (layoutId: string): void => {
  try {
    const key = getStorageKey(layoutId);
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to clear localStorage:', error);
  }
};

// Debounced save
let saveTimeout: NodeJS.Timeout | null = null;
const debouncedPersist = (refrigerator: Refrigerator, layoutId: string): void => {
  if (saveTimeout) clearTimeout(saveTimeout);
  
  saveTimeout = setTimeout(() => {
    saveToLocalStorage(refrigerator, layoutId);
  }, 1000); // 1 second delay
};
```

**Files Modified:**
- `lib/store.ts`

**Estimated Time:** 30 minutes

---

### **Phase 5: Component Simplification** 🧹
**Goal:** Remove ALL persistence logic from components

**Changes to `app/planogram/components/planogramEditor.tsx`:**

**Remove:**
- ❌ All `debouncedSavePlanogram` imports and calls
- ❌ All `loadPlanogramDraft`, `hasSavedDraft`, etc. imports
- ❌ `lastSaveTime` state
- ❌ `initialLayoutLoaded` state
- ❌ `hasRestoredDraft` state
- ❌ `showRestorePrompt` state
- ❌ All persistence `useEffect` hooks
- ❌ `handleRestoreDraft` complex logic
- ❌ `handleDismissDraft` complex logic
- ❌ `handleManualSave` complex logic

**Simplify to:**
```typescript
export function PlanogramEditor({ initialSkus, initialLayout, initialLayouts }: Props) {
  // Get state from store
  const { 
    refrigerator, 
    actions, 
    hasPendingDraft, 
    draftMetadata,
    currentLayoutId
  } = usePlanogramStore();
  
  // Initialize on mount
  useEffect(() => {
    actions.initializeLayout('g-26c', initialLayout);
  }, []);
  
  // Simple handlers
  const handleRestore = () => actions.restoreDraft();
  const handleDismiss = () => actions.clearDraft();
  const handleLayoutChange = (layoutId: string) => {
    const newLayout = initialLayouts[layoutId].layout;
    actions.switchLayout(layoutId, newLayout);
  };
  
  // Show restore prompt if draft exists
  const showRestorePrompt = hasPendingDraft && draftMetadata;
  
  // ... rest of component (drag/drop logic, etc.)
}
```

**Files Modified:**
- `app/planogram/components/planogramEditor.tsx`

**Estimated Time:** 45 minutes

---

### **Phase 6: Delete Old Persistence File** 🗑️
**Goal:** Remove now-unused persistence utilities

**Files Deleted:**
- `lib/persistence.ts` ❌ (no longer needed)

**Estimated Time:** 5 minutes

---

### **Phase 7: Update Save Indicator** 💾
**Goal:** Show save status from store

**Changes to `SaveIndicator` component:**
```typescript
function SaveIndicator() {
  const lastSaved = usePlanogramStore(state => state.lastSaved);
  const currentLayoutId = usePlanogramStore(state => state.currentLayoutId);
  
  // Manual save just triggers a state change (auto-saves via middleware)
  const handleManualSave = () => {
    // Force a re-save by updating timestamp
    usePlanogramStore.setState({ lastSaved: new Date() });
    toast.success('Planogram saved!');
  };
  
  return (
    // ... UI showing lastSaved time
  );
}
```

**Files Modified:**
- `app/planogram/components/planogramEditor.tsx`

**Estimated Time:** 15 minutes

---

## 📊 **Summary of Changes**

### **Files to Modify:**
1. ✏️ `lib/store.ts` - Major refactor (add persistence logic)
2. ✏️ `app/planogram/components/planogramEditor.tsx` - Simplify (remove persistence)

### **Files to Delete:**
1. ❌ `lib/persistence.ts` - No longer needed

### **New Features:**
- ✅ Layout-specific draft storage
- ✅ Auto-save on every change (debounced)
- ✅ Automatic draft detection
- ✅ Restore prompt with metadata
- ✅ No race conditions
- ✅ Single source of truth

---

## 🧪 **Testing Plan**

### **Test Cases:**
1. ✅ Add items → Refresh page → Should see restore prompt
2. ✅ Click "Restore" → Items should appear immediately
3. ✅ Switch layouts → Each layout has separate drafts
4. ✅ Make changes → Should auto-save within 1 second
5. ✅ Undo/Redo → Should work after restore
6. ✅ Manual save button → Should save immediately
7. ✅ Clear draft → Should remove from localStorage
8. ✅ Invalid localStorage data → Should gracefully fallback

---

## ⏱️ **Time Estimate**

| Phase | Task | Time |
|-------|------|------|
| 1 | Enhanced Store State | 30 min |
| 2 | Persistence Middleware | 45 min |
| 3 | Draft Detection & Restore | 1 hour |
| 4 | LocalStorage Utilities | 30 min |
| 5 | Component Simplification | 45 min |
| 6 | Delete Old File | 5 min |
| 7 | Update Save Indicator | 15 min |
| 8 | Testing & Debugging | 30 min |
| **TOTAL** | **Full Implementation** | **~4 hours** |

---

## 🎯 **Success Criteria**

- ✅ Draft restore works perfectly (items appear in UI)
- ✅ No race conditions or state overwrites
- ✅ Component code is 50% simpler
- ✅ All tests pass
- ✅ No console errors
- ✅ Performance maintained or improved

---

## 📝 **Decisions Made**

1. ✅ **Layout-specific drafts** - Each layout saves separately
2. ✅ **Auto-show restore prompt** - Show automatically on mount if draft found
3. ✅ **Persist undo/redo history** - YES, save history array
4. ✅ **Draft age limit** - Auto-delete drafts older than **2 days**
5. ✅ **Single draft per layout** - One draft per layout (no multi-draft management)

---

## 🚀 **Implementation Status**

- [x] Plan approved
- [ ] Phase 1: Enhanced Store State
- [ ] Phase 2: Persistence Middleware
- [ ] Phase 3: Draft Detection & Restore
- [ ] Phase 4: LocalStorage Utilities
- [ ] Phase 5: Component Simplification
- [ ] Phase 6: Delete Old File
- [ ] Phase 7: Update Save Indicator
- [ ] Testing & Validation

---

**Status:** 🚀 IMPLEMENTING NOW!
