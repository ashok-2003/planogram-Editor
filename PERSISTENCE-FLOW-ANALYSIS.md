# Persistence Flow Analysis

## Current Implementation (BEFORE Refactor)

### Architecture Overview
The current persistence logic is **split between three places**:
1. **`lib/persistence.ts`** - Standalone localStorage utilities
2. **`lib/store.ts`** - Zustand store with history management (NO persistence)
3. **`app/planogram/components/planogramEditor.tsx`** - Component with complex persistence orchestration

---

## 🔴 CURRENT FLOW (The Problem)

### 1. Component Mount & Initialization
```
Component Mounts
    ↓
useEffect #1: Set hasMounted = true (lines 254-263)
    ↓
useEffect #2: Check for draft & initialize (lines 265-287)
    ↓
    - Sets refrigerator to initialLayout
    - Sets history: [initialLayout]
    - historyIndex: 0
    ↓
    setTimeout(100ms)
        ↓
        - Calls hasSavedDraft(selectedLayoutId)
        - Calls isDraftDifferent(initialLayout, selectedLayoutId)
        - If different draft exists:
            → setShowRestorePrompt(true)
    ↓
useEffect #3: Layout switching (lines 296-305)
    ↓
    ⚠️ THIS IS THE RACE CONDITION!
    ↓
    When selectedLayoutId changes:
        - Sets refrigerator to new layout
        - OVERWRITES any restored state!
        - Resets history: [newLayout]
        - historyIndex: 0
```

### 2. User Restores Draft
```
User clicks "Restore" button
    ↓
handleRestoreDraft() (lines 348-368)
    ↓
    - Calls loadPlanogramDraft(selectedLayoutId)
    - Deep clones the draft
    - usePlanogramStore.setState({
        refrigerator: restoredState,
        history: [restoredState],  ⚠️ LOSES UNDO/REDO HISTORY!
        historyIndex: 0
      })
    - Shows success toast
    - setShowRestorePrompt(false)
    - setLastSaveTime(new Date())
```

**❌ Problems:**
- Draft is restored, but useEffect #3 might overwrite it immediately
- Undo/redo history is lost (only stores single state)
- No guarantee the restored state will persist

---

### 3. Auto-Save on Every Change
```
User makes change (e.g., moves item)
    ↓
action in store (e.g., actions.moveItem)
    ↓
    - Updates refrigerator with produce()
    - Calls pushToHistory(newFridge, history, historyIndex)
    - Sets new state in Zustand
    ↓
useEffect #4: Auto-save (lines 325-336)
    ↓
    Triggers when refrigerator changes
    ↓
    debouncedSavePlanogram(refrigerator, selectedLayoutId)
        ↓
        setTimeout(1000ms)
            ↓
            savePlanogramDraft(refrigerator, selectedLayoutId)
                ↓
                localStorage.setItem('planogram-draft', JSON.stringify({
                    refrigerator,
                    layoutId,
                    timestamp
                }))
    ↓
    setTimeout(1100ms)
        ↓
        setLastSaveTime(new Date())
```

**❌ Problems:**
- Saves only `refrigerator` state (NOT history or historyIndex)
- Uses SINGLE storage key `'planogram-draft'` for ALL layouts
- Two separate setTimeout delays (complex timing logic)
- Draft restoration won't have undo/redo capability

---

### 4. Layout Switching
```
User selects different layout from dropdown
    ↓
handleLayoutChange(layoutId) (lines 342-350)
    ↓
    - setSelectedLayoutId(layoutId)
    - actions.selectItem(null)
    - usePlanogramStore.setState({ refrigerator: newLayout })
    ↓
useEffect #3 triggers (lines 296-305)
    ↓
    - Overwrites store with new layout
    - Resets history to single state
    - historyIndex: 0
    ↓
useEffect #4 triggers (auto-save)
    ↓
    - Saves the NEW layout
    - OVERWRITES the draft from previous layout!
```

**❌ Problems:**
- No saving of current layout before switching
- New layout overwrites the single draft storage
- Previous layout's work is lost!

---

### 5. Storage Structure (Current)

**Single Key for ALL Layouts:**
```javascript
localStorage['planogram-draft'] = {
    refrigerator: {...},
    layoutId: "g-26c",  // Only stores which layout it came from
    timestamp: "2024-01-15T10:30:00Z"
}
```

**❌ Problems:**
- Only ONE draft stored at a time
- Switching layouts overwrites previous draft
- No undo/redo history stored
- No draft expiration cleanup

---

## 🟢 NEW FLOW (After Refactor)

### Architecture Changes

**Single Source of Truth:**
- ✅ ALL persistence logic in `lib/store.ts`
- ✅ NO persistence logic in components
- ✅ Delete `lib/persistence.ts` entirely

### 1. Component Mount & Initialization (SIMPLIFIED)

```
Component Mounts
    ↓
Call store action: actions.initializeLayout(layoutId, initialLayout)
    ↓
    Store checks localStorage for draft
        ↓
        const draft = loadFromLocalStorage(layoutId)
        ↓
        if (draft && !isExpired(draft)) {
            // Draft exists and is valid
            set({
                refrigerator: draft.refrigerator,
                history: draft.history,  ✅ RESTORE FULL HISTORY!
                historyIndex: draft.historyIndex,
                currentLayoutId: layoutId,
                hasPendingDraft: true,
                draftMetadata: { layoutId, timestamp }
            })
        } else {
            // No valid draft, use initial layout
            set({
                refrigerator: initialLayout,
                history: [initialLayout],
                historyIndex: 0,
                currentLayoutId: layoutId,
                hasPendingDraft: false
            })
        }
```

**Component JSX:**
```tsx
const { hasPendingDraft, draftMetadata } = usePlanogramStore();

{hasPendingDraft && (
    <RestorePrompt 
        timestamp={draftMetadata?.timestamp}
        onRestore={actions.restoreDraft}
        onDismiss={actions.clearDraft}
    />
)}
```

**✅ Benefits:**
- No race conditions (single initialization point)
- Draft includes full undo/redo history
- Component just reads `hasPendingDraft` flag
- Store handles all complexity

---

### 2. User Restores Draft (SIMPLIFIED)

```
User clicks "Restore" button
    ↓
actions.restoreDraft() in store
    ↓
    set({
        hasPendingDraft: false,  // Clear the prompt
        lastSaved: new Date()
    })
    // State is already loaded, just clear the flag!
```

**✅ Benefits:**
- Draft already loaded during initialization
- Just clears the prompt flag
- Full history preserved
- Ultra-simple logic

---

### 3. Auto-Save on Every Change (IMPROVED)

```
User makes change (e.g., moves item)
    ↓
action in store (e.g., actions.moveItem)
    ↓
    - Updates refrigerator with produce()
    - Calls pushToHistory(newFridge, history, historyIndex, currentLayoutId)
        ↓
        const historyUpdate = {
            history: newHistory,
            historyIndex: newIndex
        }
        ↓
        // IMMEDIATELY trigger auto-save
        debouncedPersist(
            newFridge, 
            newHistory, 
            newIndex, 
            currentLayoutId
        )
        ↓
        return { ...historyUpdate, lastSaved: null }  // Saving in progress
    ↓
After 1 second debounce:
    ↓
    saveToLocalStorage(refrigerator, history, historyIndex, layoutId)
        ↓
        localStorage[`planogram-draft-${layoutId}`] = JSON.stringify({
            refrigerator,
            history,  ✅ SAVE FULL HISTORY!
            historyIndex,
            layoutId,
            timestamp
        })
```

**✅ Benefits:**
- Saves FULL state (refrigerator + history + historyIndex)
- Per-layout storage keys
- Single debounce timer
- Automatic on every state change
- No component involvement

---

### 4. Layout Switching (IMPROVED)

```
User selects different layout
    ↓
actions.switchLayout(newLayoutId, newInitialLayout)
    ↓
    const { currentLayoutId, refrigerator, history, historyIndex } = get()
    ↓
    // Save current layout's state FIRST
    if (currentLayoutId) {
        saveToLocalStorage(refrigerator, history, historyIndex, currentLayoutId)
    }
    ↓
    // Check for draft in new layout
    const newDraft = loadFromLocalStorage(newLayoutId)
    ↓
    if (newDraft && !isExpired(newDraft)) {
        set({
            refrigerator: newDraft.refrigerator,
            history: newDraft.history,
            historyIndex: newDraft.historyIndex,
            currentLayoutId: newLayoutId,
            hasPendingDraft: true,
            draftMetadata: { layoutId: newLayoutId, timestamp: newDraft.timestamp }
        })
    } else {
        set({
            refrigerator: newInitialLayout,
            history: [newInitialLayout],
            historyIndex: 0,
            currentLayoutId: newLayoutId,
            hasPendingDraft: false
        })
    }
```

**✅ Benefits:**
- Current layout saved before switching
- Each layout has its own draft
- Switching between layouts preserves work
- Automatic draft detection

---

### 5. Storage Structure (NEW)

**Separate Keys per Layout:**
```javascript
// G-26C Layout
localStorage['planogram-draft-g-26c'] = {
    refrigerator: {...},
    history: [...],  // Full undo/redo history
    historyIndex: 5,
    layoutId: "g-26c",
    timestamp: "2024-01-15T10:30:00Z"
}

// G-32C Layout
localStorage['planogram-draft-g-32c'] = {
    refrigerator: {...},
    history: [...],
    historyIndex: 3,
    layoutId: "g-32c",
    timestamp: "2024-01-15T11:45:00Z"
}
```

**✅ Benefits:**
- Each layout has its own draft
- Switching layouts doesn't lose work
- Full undo/redo history per layout
- Automatic draft expiry (2 days)

---

### 6. Draft Expiry & Cleanup (NEW)

**Automatic Cleanup:**
```javascript
const loadFromLocalStorage = (layoutId) => {
    const draft = JSON.parse(localStorage.getItem(`planogram-draft-${layoutId}`))
    
    const draftDate = new Date(draft.timestamp)
    const daysDiff = (now - draftDate) / (1000 * 60 * 60 * 24)
    
    if (daysDiff > 2) {
        clearLocalStorage(layoutId)  // Auto-delete expired draft
        return null
    }
    
    return draft
}
```

**✅ Benefits:**
- Old drafts automatically cleaned up
- No manual deletion needed
- Storage space management

---

## Component Simplification

### BEFORE (640 lines)
```tsx
// Complex state management
const [hasMounted, setHasMounted] = useState(false);
const [showRestorePrompt, setShowRestorePrompt] = useState(false);
const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
const [initialLayoutLoaded, setInitialLayoutLoaded] = useState(false);
const [isSaving, setIsSaving] = useState(false);

// 4 complex useEffect hooks (70+ lines)
useEffect(() => { /* hasMounted */ }, []);
useEffect(() => { /* check draft */ }, [hasMounted, initialLayoutLoaded, ...]);
useEffect(() => { /* layout switch */ }, [selectedLayoutId, ...]);
useEffect(() => { /* auto-save */ }, [refrigerator, hasMounted, ...]);

// Complex handlers
const handleRestoreDraft = useCallback(() => { /* 20 lines */ }, [...]);
const handleDismissDraft = useCallback(() => { /* 5 lines */ }, []);
const handleManualSave = useCallback(() => { /* 15 lines */ }, [...]);
```

### AFTER (~320 lines, 50% reduction)
```tsx
// Simple store access
const { hasPendingDraft, draftMetadata, lastSaved, actions } = usePlanogramStore();

// No persistence useEffect hooks needed!

// Simple handlers
const handleLayoutChange = (layoutId) => {
    actions.switchLayout(layoutId, initialLayouts[layoutId].layout);
};
```

**✅ Benefits:**
- Remove 5 state variables
- Remove 4 complex useEffect hooks
- Remove 3 callback handlers
- Remove all imports from `lib/persistence.ts`
- 50% code reduction in component

---

## Key Differences Summary

| Aspect | BEFORE | AFTER |
|--------|--------|-------|
| **Storage Keys** | Single `'planogram-draft'` | Per-layout `'planogram-draft-{id}'` |
| **Stored Data** | Only `refrigerator` state | `refrigerator` + `history` + `historyIndex` |
| **Draft Per Layout** | ❌ No (overwrites) | ✅ Yes (separate keys) |
| **Undo/Redo History** | ❌ Lost on restore | ✅ Preserved |
| **Race Conditions** | ❌ useEffect timing issues | ✅ None (single source) |
| **Auto-Save** | Component useEffect | Store action |
| **Draft Expiry** | ❌ No | ✅ 2-day auto-cleanup |
| **Layout Switching** | Loses current draft | Saves before switching |
| **Component Lines** | 640 lines | ~320 lines (50% reduction) |
| **Persistence Logic** | Split 3 ways | Single store location |

---

## Critical Bug Fixed

### THE RACE CONDITION:

**BEFORE:**
```
1. User restores draft → setState({ refrigerator: draftData })
2. 50ms later → useEffect for layout switching triggers
3. useEffect overwrites with initialLayout
4. User's restored work is GONE! 💥
```

**AFTER:**
```
1. Store initializes with draft check (happens ONCE)
2. Draft is loaded OR initial layout is used
3. No subsequent overwrites possible
4. User's work is SAFE! ✅
```

---

## Testing Checklist

After implementation, test these scenarios:

- [ ] Mount editor → Draft prompt appears if draft exists
- [ ] Restore draft → Full undo/redo history works
- [ ] Make changes → Auto-saves after 1 second
- [ ] Switch layouts → Current layout saves, new layout loads with its own draft
- [ ] Undo/Redo → History persists across page reloads
- [ ] Wait 2 days → Old drafts auto-deleted
- [ ] Multiple layouts → Each has independent draft storage
- [ ] Network tab → No redundant save operations

---

## Next Steps

1. ✅ **Understand the flow** (THIS DOCUMENT)
2. ⏳ **Implement persistence actions in store**
3. ⏳ **Update pushToHistory to trigger auto-save**
4. ⏳ **Simplify component (remove persistence logic)**
5. ⏳ **Delete `lib/persistence.ts`**
6. ⏳ **Update SaveIndicator component**
7. ⏳ **Test all scenarios**
