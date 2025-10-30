# Visual Flow Diagrams

## 🔴 CURRENT FLOW - The Race Condition Problem

```
┌─────────────────────────────────────────────────────────────┐
│  Component Mount Sequence (PROBLEMATIC)                      │
└─────────────────────────────────────────────────────────────┘

Time: 0ms
┌──────────────────┐
│ Component Mounts │
└────────┬─────────┘
         │
         ▼
Time: 1ms - useEffect #1 (hasMounted)
┌─────────────────────┐
│ setHasMounted(true) │
└────────┬────────────┘
         │
         ▼
Time: 2ms - useEffect #2 (initialize)
┌──────────────────────────────────────┐
│ setState({                           │
│   refrigerator: initialLayout,       │
│   history: [initialLayout],          │
│   historyIndex: 0                    │
│ })                                   │
└────────┬─────────────────────────────┘
         │
         ▼
Time: 3ms - useEffect #3 (layout switch) 🚨
┌─────────────────────────────────────┐
│ RACE CONDITION!                     │
│ This effect runs IMMEDIATELY        │
│ because selectedLayoutId exists     │
│                                     │
│ setState({                          │
│   refrigerator: newLayout,          │
│   history: [newLayout],             │
│   historyIndex: 0                   │
│ })                                  │
└────────┬────────────────────────────┘
         │
         ▼
Time: 102ms - setTimeout in useEffect #2
┌─────────────────────────────────────┐
│ Check: hasSavedDraft()?             │
│   → YES, draft exists!              │
│                                     │
│ setShowRestorePrompt(true)          │
└────────┬────────────────────────────┘
         │
         ▼
Time: 150ms - User clicks "Restore"
┌─────────────────────────────────────┐
│ handleRestoreDraft()                │
│                                     │
│ setState({                          │
│   refrigerator: draftData,          │
│   history: [draftData],  ⚠️ NO HISTORY! │
│   historyIndex: 0                   │
│ })                                  │
└────────┬────────────────────────────┘
         │
         ▼
Time: 151ms - useEffect #3 triggers AGAIN! 🔥
┌─────────────────────────────────────┐
│ DISASTER!                           │
│ Layout switch effect runs again     │
│                                     │
│ setState({                          │
│   refrigerator: initialLayout,      │
│   history: [initialLayout]          │
│ })                                  │
│                                     │
│ USER'S RESTORED WORK IS LOST! 💥    │
└─────────────────────────────────────┘
```

---

## 🟢 NEW FLOW - Single Initialization, No Race Conditions

```
┌─────────────────────────────────────────────────────────────┐
│  Component Mount Sequence (CLEAN)                            │
└─────────────────────────────────────────────────────────────┘

Time: 0ms
┌──────────────────┐
│ Component Mounts │
└────────┬─────────┘
         │
         ▼
Time: 1ms - Call store action ONCE
┌────────────────────────────────────────────┐
│ actions.initializeLayout(                 │
│   layoutId: "g-26c",                      │
│   initialLayout: {...}                    │
│ )                                         │
└────────┬───────────────────────────────────┘
         │
         ▼
Inside Store Action:
┌────────────────────────────────────────────┐
│ const draft = loadFromLocalStorage(       │
│   "g-26c"                                  │
│ )                                          │
│                                            │
│ if (draft exists && !expired) {            │
│   ✅ RESTORE FULL STATE                    │
│   set({                                    │
│     refrigerator: draft.refrigerator,      │
│     history: draft.history,  🎉 FULL HISTORY! │
│     historyIndex: draft.historyIndex,      │
│     currentLayoutId: "g-26c",              │
│     hasPendingDraft: true,                 │
│     draftMetadata: {...}                   │
│   })                                       │
│ } else {                                   │
│   set({                                    │
│     refrigerator: initialLayout,           │
│     history: [initialLayout],              │
│     historyIndex: 0,                       │
│     currentLayoutId: "g-26c",              │
│     hasPendingDraft: false                 │
│   })                                       │
│ }                                          │
└────────┬───────────────────────────────────┘
         │
         ▼
Component Re-renders with Final State:
┌────────────────────────────────────────────┐
│ const { hasPendingDraft, draftMetadata,   │
│         refrigerator, actions } =          │
│   usePlanogramStore()                      │
│                                            │
│ {hasPendingDraft && (                      │
│   <RestorePrompt                           │
│     onRestore={actions.restoreDraft}       │
│     onDismiss={actions.clearDraft}         │
│   />                                       │
│ )}                                         │
└────────────────────────────────────────────┘

✅ No race conditions
✅ No multiple useEffect hooks
✅ No timing issues
✅ Single source of truth
✅ Full history preserved
```

---

## 🔄 Layout Switching Flow Comparison

### BEFORE (Data Loss)
```
User switches from G-26C to G-32C

┌─────────────────────────────────────────┐
│ User has unsaved work on G-26C          │
│ - 5 undo steps available                │
│ - Last change: 30 seconds ago           │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ handleLayoutChange("g-32c")             │
│ setSelectedLayoutId("g-32c")            │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ useEffect #3 triggers                   │
│                                         │
│ setState({                              │
│   refrigerator: g32cLayout,             │
│   history: [g32cLayout],                │
│   historyIndex: 0                       │
│ })                                      │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ useEffect #4 (auto-save) triggers       │
│                                         │
│ debouncedSavePlanogram(                 │
│   g32cLayout,                           │
│   "g-32c"                               │
│ )                                       │
│                                         │
│ localStorage['planogram-draft'] = {     │
│   refrigerator: g32cLayout,             │
│   layoutId: "g-32c"                     │
│ }                                       │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ ❌ G-26C work is LOST!                  │
│ ❌ Only ONE draft exists now (G-32C)    │
│ ❌ Can't switch back to G-26C work      │
└─────────────────────────────────────────┘
```

### AFTER (Data Preserved)
```
User switches from G-26C to G-32C

┌─────────────────────────────────────────┐
│ User has unsaved work on G-26C          │
│ - 5 undo steps available                │
│ - Last change: 30 seconds ago           │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ actions.switchLayout(                   │
│   "g-32c",                              │
│   g32cInitialLayout                     │
│ )                                       │
└────────┬────────────────────────────────┘
         │
         ▼
Inside Store:
┌─────────────────────────────────────────┐
│ STEP 1: Save current layout             │
│                                         │
│ saveToLocalStorage(                     │
│   refrigerator,   // G-26C state        │
│   history,        // 5 undo steps       │
│   historyIndex,   // Current position   │
│   "g-26c"                               │
│ )                                       │
│                                         │
│ localStorage['planogram-draft-g-26c'] = {│
│   refrigerator: {...},                  │
│   history: [step1, step2, ..., step5],  │
│   historyIndex: 4,                      │
│   layoutId: "g-26c",                    │
│   timestamp: "2024-01-15T10:30:00Z"     │
│ }                                       │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ STEP 2: Check for G-32C draft           │
│                                         │
│ const g32cDraft =                       │
│   loadFromLocalStorage("g-32c")         │
│                                         │
│ if (g32cDraft exists) {                 │
│   // Load existing work                │
│   set({                                 │
│     refrigerator: g32cDraft.refrigerator│
│     history: g32cDraft.history,         │
│     historyIndex: g32cDraft.historyIndex│
│     currentLayoutId: "g-32c",           │
│     hasPendingDraft: true               │
│   })                                    │
│ } else {                                │
│   // Fresh start                        │
│   set({                                 │
│     refrigerator: g32cInitialLayout,    │
│     history: [g32cInitialLayout],       │
│     historyIndex: 0,                    │
│     currentLayoutId: "g-32c",           │
│     hasPendingDraft: false              │
│   })                                    │
│ }                                       │
└────────┬────────────────────────────────┘
         │
         ▼
Result:
┌─────────────────────────────────────────┐
│ ✅ G-26C work is SAVED!                 │
│ ✅ Two drafts exist:                    │
│    - planogram-draft-g-26c              │
│    - planogram-draft-g-32c              │
│ ✅ Can switch back to G-26C with full   │
│    undo history intact                  │
└─────────────────────────────────────────┘
```

---

## 💾 Storage Structure Comparison

### BEFORE (Single Draft, Overwrites)
```
┌─────────────────────────────────────────┐
│ localStorage                            │
├─────────────────────────────────────────┤
│                                         │
│ 'planogram-draft': {                    │
│   refrigerator: {...},  ⚠️ ONLY ONE!    │
│   layoutId: "g-32c",                    │
│   timestamp: "2024-01-15T10:30:00Z"     │
│ }                                       │
│                                         │
│ ❌ No history                           │
│ ❌ No undo/redo                         │
│ ❌ Switching layouts overwrites         │
│ ❌ G-26C work is lost                   │
└─────────────────────────────────────────┘
```

### AFTER (Multiple Drafts, Full State)
```
┌─────────────────────────────────────────┐
│ localStorage                            │
├─────────────────────────────────────────┤
│                                         │
│ 'planogram-draft-g-26c': {              │
│   refrigerator: {...},                  │
│   history: [state1, state2, ..., state5],│
│   historyIndex: 4,                      │
│   layoutId: "g-26c",                    │
│   timestamp: "2024-01-15T10:30:00Z"     │
│ }                                       │
│                                         │
│ 'planogram-draft-g-32c': {              │
│   refrigerator: {...},                  │
│   history: [state1, state2, state3],    │
│   historyIndex: 2,                      │
│   layoutId: "g-32c",                    │
│   timestamp: "2024-01-15T11:45:00Z"     │
│ }                                       │
│                                         │
│ 'planogram-draft-g-45c': {              │
│   refrigerator: {...},                  │
│   history: [state1],                    │
│   historyIndex: 0,                      │
│   layoutId: "g-45c",                    │
│   timestamp: "2024-01-13T09:15:00Z"     │
│   ⏰ 2 days old - will auto-delete!     │
│ }                                       │
│                                         │
│ ✅ Each layout has its own draft        │
│ ✅ Full undo/redo history saved         │
│ ✅ Switching preserves all work         │
│ ✅ Auto-cleanup of old drafts           │
└─────────────────────────────────────────┘
```

---

## 🔄 Auto-Save Flow Comparison

### BEFORE (Component-Driven)
```
User moves item in store

┌─────────────────────────────────────────┐
│ actions.moveItem() in store             │
│                                         │
│ - Updates refrigerator                  │
│ - Calls pushToHistory()                 │
│ - Returns new state                     │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ Component re-renders                    │
│ refrigerator value changed              │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ useEffect #4 (auto-save) triggers       │
│                                         │
│ if (hasMounted && initialLayoutLoaded   │
│     && refrigerator && ...) {           │
│   debouncedSavePlanogram(               │
│     refrigerator,                       │
│     selectedLayoutId                    │
│   )                                     │
│                                         │
│   setTimeout(() => {                    │
│     setLastSaveTime(new Date())         │
│   }, 1100)                              │
│ }                                       │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ In persistence.ts:                      │
│                                         │
│ setTimeout(() => {                      │
│   savePlanogramDraft(                   │
│     refrigerator,                       │
│     layoutId                            │
│   )                                     │
│ }, 1000)                                │
│                                         │
│ localStorage['planogram-draft'] = {     │
│   refrigerator: {...},  ⚠️ NO HISTORY!  │
│   layoutId: "g-26c",                    │
│   timestamp: "now"                      │
│ }                                       │
└─────────────────────────────────────────┘

❌ Two separate setTimeout delays
❌ Component needs to track save timing
❌ Only refrigerator saved (no history)
❌ Complex dependency tracking
```

### AFTER (Store-Driven)
```
User moves item in store

┌─────────────────────────────────────────┐
│ actions.moveItem() in store             │
│                                         │
│ - Updates refrigerator                  │
│ - Calls pushToHistory()                 │
│   ↓                                     │
│   pushToHistory() calls:                │
│   debouncedPersist(                     │
│     newFridge,                          │
│     newHistory,                         │
│     newIndex,                           │
│     currentLayoutId                     │
│   )                                     │
│                                         │
│ - Returns new state                     │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ After 1 second debounce:                │
│                                         │
│ saveToLocalStorage(                     │
│   refrigerator,                         │
│   history,      ✅ FULL HISTORY!        │
│   historyIndex,                         │
│   layoutId                              │
│ )                                       │
│                                         │
│ localStorage[`planogram-draft-${id}`] = {│
│   refrigerator: {...},                  │
│   history: [...],                       │
│   historyIndex: n,                      │
│   layoutId: id,                         │
│   timestamp: "now"                      │
│ }                                       │
│                                         │
│ set({ lastSaved: new Date() })          │
└─────────────────────────────────────────┘

✅ Single debounce timer
✅ No component involvement
✅ Full state saved (with history)
✅ Automatic on every change
✅ Clean separation of concerns
```

---

## 🎯 Component Complexity Reduction

### BEFORE: Complex Persistence Logic
```tsx
// filepath: planogramEditor.tsx (640 lines)

import { debouncedSavePlanogram, loadPlanogramDraft, 
         hasSavedDraft, clearPlanogramDraft, 
         getLastSaveTimestamp, savePlanogramDraft, 
         isDraftDifferent, getSavedDraft } from '@/lib/persistence';

// State for persistence
const [hasMounted, setHasMounted] = useState(false);
const [showRestorePrompt, setShowRestorePrompt] = useState(false);
const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
const [initialLayoutLoaded, setInitialLayoutLoaded] = useState(false);
const [isSaving, setIsSaving] = useState(false);

// useEffect #1: Track mount state (10 lines)
useEffect(() => {
  setHasMounted(true);
  const loadingTimer = setTimeout(() => {
    setIsLoading(false);
  }, 500);
  return () => clearTimeout(loadingTimer);
}, []);

// useEffect #2: Initialize and check for draft (25 lines)
useEffect(() => {
  if (hasMounted && !initialLayoutLoaded) {
    usePlanogramStore.setState({ 
      refrigerator: initialLayout,
      history: [JSON.parse(JSON.stringify(initialLayout))],
      historyIndex: 0
    });
    setInitialLayoutLoaded(true);
    
    setTimeout(() => {
      if (hasSavedDraft(selectedLayoutId) && 
          isDraftDifferent(initialLayout, selectedLayoutId)) {
        setShowRestorePrompt(true);
        setLastSaveTime(getLastSaveTimestamp());
      } else {
        setLastSaveTime(getLastSaveTimestamp());
      }
    }, 100);
  }
}, [hasMounted, initialLayoutLoaded, initialLayout, selectedLayoutId]);

// useEffect #3: Handle layout switching (15 lines)
useEffect(() => {
  if (hasMounted && initialLayouts[selectedLayoutId]) {
    const newLayout = initialLayouts[selectedLayoutId].layout;
    usePlanogramStore.setState({ 
      refrigerator: newLayout,
      history: [JSON.parse(JSON.stringify(newLayout))],
      historyIndex: 0
    });
  }
}, [selectedLayoutId, initialLayouts, hasMounted]);

// useEffect #4: Auto-save (15 lines)
useEffect(() => {
  if (hasMounted && initialLayoutLoaded && 
      refrigerator && Object.keys(refrigerator).length > 0) {
    debouncedSavePlanogram(refrigerator, selectedLayoutId);
    const timer = setTimeout(() => {
      setLastSaveTime(new Date());
    }, 1100);
    return () => clearTimeout(timer);
  }
}, [refrigerator, hasMounted, initialLayoutLoaded, selectedLayoutId]);

// Handler: Restore draft (20 lines)
const handleRestoreDraft = useCallback(() => {
  const savedDraft = loadPlanogramDraft(selectedLayoutId);
  
  if (savedDraft) {
    const restoredState = JSON.parse(JSON.stringify(savedDraft));
    usePlanogramStore.setState({ 
      refrigerator: restoredState,
      history: [JSON.parse(JSON.stringify(restoredState))],
      historyIndex: 0,
      selectedItemId: null
    });
    toast.success('Draft restored successfully!');
    setShowRestorePrompt(false);
    setLastSaveTime(new Date());
  } else {
    toast.error('Failed to restore draft - no saved data found');
  }
}, [selectedLayoutId]);

// Handler: Dismiss draft (5 lines)
const handleDismissDraft = useCallback(() => {
  clearPlanogramDraft();
  setShowRestorePrompt(false);
  toast.success('Draft dismissed');
}, []);

// Handler: Manual save (15 lines)
const handleManualSave = useCallback(() => {
  setIsSaving(true);
  setTimeout(() => {
    savePlanogramDraft(refrigerator, selectedLayoutId);
    setLastSaveTime(new Date());
    setIsSaving(false);
    toast.success('Planogram saved!');
  }, 800);
}, [refrigerator, selectedLayoutId]);

// JSX with complex conditionals
{showRestorePrompt && (
  <RestorePrompt 
    lastSaveTime={lastSaveTime}
    onRestore={handleRestoreDraft}
    onDismiss={handleDismissDraft}
  />
)}

<SaveIndicator 
  lastSaveTime={lastSaveTime} 
  onManualSave={handleManualSave} 
  isSaving={isSaving} 
/>

Total: ~120 lines of persistence logic
```

### AFTER: Minimal Persistence Interface
```tsx
// filepath: planogramEditor.tsx (~320 lines)

// NO persistence imports needed!

// NO persistence state needed!

// NO persistence useEffect hooks needed!

// Simple store access
const { hasPendingDraft, draftMetadata, lastSaved, actions } = 
  usePlanogramStore();

// Single initialization (replaces 4 useEffect hooks)
useEffect(() => {
  actions.initializeLayout(selectedLayoutId, initialLayout);
}, []);

// Simple layout switching (replaces complex handler)
const handleLayoutChange = (layoutId: string) => {
  actions.switchLayout(layoutId, initialLayouts[layoutId].layout);
};

// Simple manual save (replaces 15-line handler)
const handleManualSave = () => {
  actions.manualSave();
};

// JSX with simple conditionals
{hasPendingDraft && (
  <RestorePrompt 
    timestamp={draftMetadata?.timestamp}
    onRestore={actions.restoreDraft}
    onDismiss={actions.clearDraft}
  />
)}

<SaveIndicator 
  lastSaved={lastSaved}
  onManualSave={handleManualSave}
/>

Total: ~15 lines of persistence interface

🎉 108 lines removed! (90% reduction)
```

---

## Summary

| Aspect | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Component Lines** | 640 | ~320 | 50% reduction |
| **Persistence Lines in Component** | ~120 | ~15 | 90% reduction |
| **useEffect Hooks** | 4 complex | 1 simple | 75% reduction |
| **State Variables** | 5 tracking | 0 needed | 100% reduction |
| **Race Conditions** | Multiple timing issues | None | ✅ Fixed |
| **Undo/Redo Persistence** | Lost on restore | Fully preserved | ✅ Fixed |
| **Multiple Layout Support** | Broken (overwrites) | Works perfectly | ✅ Fixed |
| **Auto-Save** | Component-driven | Store-driven | ✅ Cleaner |
| **Draft Expiry** | Manual only | Automatic (2 days) | ✅ New Feature |

**Bottom Line:** Moving persistence to the store eliminates complexity, fixes critical bugs, and makes the codebase much easier to maintain! 🚀
