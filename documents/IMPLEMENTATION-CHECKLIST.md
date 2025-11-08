# Implementation Checklist

## Phase 1: Complete Store Persistence Actions ✅ (In Progress)

### Step 1.1: Implement `initializeLayout()` 
**File:** `lib/store.ts`

**Current Status:** ⚠️ Signature declared, implementation missing

**What it needs to do:**
1. Check localStorage for existing draft for this layout
2. If draft exists and not expired:
   - Set state with full draft (refrigerator + history + historyIndex)
   - Set `hasPendingDraft: true`
   - Set `draftMetadata`
3. If no draft or expired:
   - Set state with initialLayout
   - Set `history: [initialLayout]`
   - Set `hasPendingDraft: false`
4. Set `currentLayoutId`

**Code Location:** Around line 200 in store actions

---

### Step 1.2: Implement `switchLayout()`
**File:** `lib/store.ts`

**Current Status:** ⚠️ Signature declared, implementation missing

**What it needs to do:**
1. Get current state (`currentLayoutId`, `refrigerator`, `history`, `historyIndex`)
2. **Save current layout first:**
   - Call `saveToLocalStorage()` with current state
3. Load new layout:
   - Check for draft in new layout
   - If exists: restore full state with `hasPendingDraft: true`
   - If not: use initialLayout with `hasPendingDraft: false`
4. Update `currentLayoutId`
5. Clear `selectedItemId`

**Code Location:** Around line 220 in store actions

---

### Step 1.3: Implement `restoreDraft()`
**File:** `lib/store.ts`

**Current Status:** ⚠️ Signature declared, implementation missing

**What it needs to do:**
1. Set `hasPendingDraft: false` (clears the prompt)
2. Set `lastSaved: new Date()`
3. Show success toast
4. **That's it!** State is already loaded from `initializeLayout()`

**Code Location:** Around line 240 in store actions

---

### Step 1.4: Implement `clearDraft()`
**File:** `lib/store.ts`

**Current Status:** ⚠️ Signature declared, implementation missing

**What it needs to do:**
1. Get `currentLayoutId` from state
2. Call `clearLocalStorage(currentLayoutId)`
3. Set `hasPendingDraft: false`
4. Reset to initial layout:
   - Need to pass initialLayout somehow (add parameter?)
5. Show success toast

**Code Location:** Around line 250 in store actions

**⚠️ Design Decision Needed:**
- Should `clearDraft()` take `initialLayout` as parameter?
- Or should we store `initialLayout` in state?
- Or reset to whatever is currently in `history[0]`?

---

### Step 1.5: Add `manualSave()` action (NEW)
**File:** `lib/store.ts`

**Current Status:** ❌ Not declared yet

**What it needs to do:**
1. Get current state
2. Immediately save to localStorage (no debounce)
3. Set `lastSaved: new Date()`
4. Show success toast
5. Optional: Set temporary `isSaving` flag for UI feedback

**Code Location:** Add to actions around line 260

**Signature:**
```typescript
interface PlanogramState {
  actions: {
    // ...existing
    manualSave: () => void;
  }
}
```

---

## Phase 2: Update `pushToHistory()` to Trigger Auto-Save

### Step 2.1: Modify `pushToHistory()` helper
**File:** `lib/store.ts`
**Current Location:** Around line 170

**Current Code:**
```typescript
const pushToHistory = (
  newState: Refrigerator, 
  history: Refrigerator[], 
  historyIndex: number
): { history: Refrigerator[]; historyIndex: number } => {
  const newHistory = history.slice(0, historyIndex + 1);
  newHistory.push(produce(newState, () => {}));
  const limitedHistory = newHistory.slice(-50);
  return {
    history: limitedHistory,
    historyIndex: limitedHistory.length - 1
  };
};
```

**New Code:**
```typescript
const pushToHistory = (
  newState: Refrigerator, 
  history: Refrigerator[], 
  historyIndex: number,
  currentLayoutId: string | null  // NEW PARAMETER
): { history: Refrigerator[]; historyIndex: number } => {
  const newHistory = history.slice(0, historyIndex + 1);
  newHistory.push(produce(newState, () => {}));
  const limitedHistory = newHistory.slice(-50);
  
  // NEW: Trigger auto-save
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

---

### Step 2.2: Update ALL calls to `pushToHistory()`
**File:** `lib/store.ts`

**Search for:** `pushToHistory(`

**Locations to update (approximately 9 calls):**
1. Line ~235: `removeItemsById`
2. Line ~255: `duplicateAndAddNew`
3. Line ~275: `duplicateAndStack`
4. Line ~315: `replaceSelectedItem`
5. Line ~330: `addItemFromSku`
6. Line ~345: `moveItem`
7. Line ~360: `reorderStack`
8. Line ~375: `stackItem`

**Change pattern:**
```typescript
// BEFORE
const historyUpdate = pushToHistory(newFridge, state.history, state.historyIndex);

// AFTER
const historyUpdate = pushToHistory(
  newFridge, 
  state.history, 
  state.historyIndex,
  state.currentLayoutId  // ADD THIS
);
```

---

## Phase 3: Simplify Component

### Step 3.1: Remove persistence imports
**File:** `app/planogram/components/planogramEditor.tsx`
**Line:** ~17

**Remove:**
```typescript
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

---

### Step 3.2: Remove persistence state
**File:** `app/planogram/components/planogramEditor.tsx`
**Lines:** ~240-245

**Remove:**
```typescript
const [hasMounted, setHasMounted] = useState(false);
const [showRestorePrompt, setShowRestorePrompt] = useState(false);
const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
const [initialLayoutLoaded, setInitialLayoutLoaded] = useState(false);
const [isSaving, setIsSaving] = useState(false);
```

---

### Step 3.3: Add store state access
**File:** `app/planogram/components/planogramEditor.tsx`
**Line:** ~235 (after existing store access)

**Add:**
```typescript
const { 
  refrigerator, 
  actions, 
  findStackLocation,
  hasPendingDraft,
  draftMetadata,
  lastSaved,
  currentLayoutId
} = usePlanogramStore();
```

---

### Step 3.4: Replace useEffect hooks
**File:** `app/planogram/components/planogramEditor.tsx`

**Remove useEffect #1 (hasMounted):** Lines ~254-263
**Remove useEffect #2 (draft check):** Lines ~265-287
**Remove useEffect #3 (layout switch):** Lines ~296-305
**Remove useEffect #4 (auto-save):** Lines ~325-336

**Replace with single initialization:**
```typescript
// Initialize layout on mount
useEffect(() => {
  actions.initializeLayout(selectedLayoutId, initialLayout);
  
  // Simulate loading delay for UX
  const loadingTimer = setTimeout(() => {
    setIsLoading(false);
  }, 500);
  
  return () => clearTimeout(loadingTimer);
}, []); // Run once on mount
```

---

### Step 3.5: Simplify handlers
**File:** `app/planogram/components/planogramEditor.tsx`

**Remove `handleRestoreDraft`:** Lines ~348-368
**Remove `handleDismissDraft`:** Lines ~370-374
**Remove `handleManualSave`:** Lines ~376-387

**Update `handleLayoutChange`:** Lines ~342-350
```typescript
const handleLayoutChange = useCallback((layoutId: string) => {
  setSelectedLayoutId(layoutId);
  const newLayout = initialLayouts[layoutId]?.layout;
  if (newLayout) {
    actions.switchLayout(layoutId, newLayout);
  }
}, [initialLayouts, actions]);
```

**Add simple manual save handler:**
```typescript
const handleManualSave = useCallback(() => {
  actions.manualSave();
}, [actions]);
```

---

### Step 3.6: Update JSX conditionals
**File:** `app/planogram/components/planogramEditor.tsx`

**Find RestorePrompt:** Around line 630
**Change from:**
```tsx
{showRestorePrompt && (
  <RestorePrompt 
    lastSaveTime={lastSaveTime}
    onRestore={handleRestoreDraft}
    onDismiss={handleDismissDraft}
  />
)}
```

**Change to:**
```tsx
{hasPendingDraft && draftMetadata && (
  <RestorePrompt 
    lastSaveTime={new Date(draftMetadata.timestamp)}
    onRestore={actions.restoreDraft}
    onDismiss={actions.clearDraft}
  />
)}
```

**Find SaveIndicator:** Around line 580
**Change from:**
```tsx
<SaveIndicator 
  lastSaveTime={lastSaveTime} 
  onManualSave={handleManualSave} 
  isSaving={isSaving} 
/>
```

**Change to:**
```tsx
<SaveIndicator 
  lastSaveTime={lastSaved} 
  onManualSave={handleManualSave}
  isSaving={false}  // Or remove this prop entirely
/>
```

---

## Phase 4: Delete Old Persistence File

### Step 4.1: Verify no imports remain
**Search entire project for:** `from '@/lib/persistence'`

**Expected result:** Should only find in component (which we're removing)

---

### Step 4.2: Delete file
**File to delete:** `lib/persistence.ts`

**Action:** Delete the file entirely

---

## Phase 5: Update SaveIndicator Component

### Step 5.1: Simplify SaveIndicator props
**File:** `app/planogram/components/planogramEditor.tsx`
**Lines:** ~160-192 (SaveIndicator component definition)

**Current props:**
```typescript
function SaveIndicator({ 
  lastSaveTime, 
  onManualSave, 
  isSaving 
}: { 
  lastSaveTime: Date | null; 
  onManualSave: () => void; 
  isSaving: boolean 
})
```

**Option 1: Keep as is (component gets props)**
```typescript
// No changes needed, just pass lastSaved from store
```

**Option 2: Read directly from store (more coupled)**
```typescript
function SaveIndicator({ onManualSave }: { onManualSave: () => void }) {
  const { lastSaved } = usePlanogramStore();
  const timeAgo = lastSaved ? getTimeAgo(lastSaved) : null;
  // ...rest of component
}
```

**Recommendation:** Keep Option 1 (less coupling, easier to test)

---

### Step 5.2: Remove isSaving logic
**File:** `app/planogram/components/planogramEditor.tsx`

**In SaveIndicator component:**
- Remove `isSaving` parameter (or make optional)
- Remove loading spinner logic
- Manual save is instant (no async operation to track)

**Simplified button:**
```tsx
<button 
  onClick={onManualSave}
  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm"
>
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
  </svg>
  Save Now
</button>
```

---

## Phase 6: Testing Checklist

### Manual Testing Scenarios

- [ ] **Fresh Load**: Open app, no draft exists
  - ✅ Should load initial layout
  - ✅ Should NOT show restore prompt
  - ✅ Should have empty undo history

- [ ] **Draft Exists**: Make changes, reload page
  - ✅ Should show restore prompt
  - ✅ Timestamp should be correct
  - ✅ Click "Restore" should load previous state
  - ✅ Undo/redo should work with full history

- [ ] **Dismiss Draft**: Show restore prompt, click dismiss
  - ✅ Prompt disappears
  - ✅ Draft is deleted from localStorage
  - ✅ Initial layout is shown

- [ ] **Auto-Save**: Make change, wait 1 second
  - ✅ localStorage should update
  - ✅ "Last saved" timestamp should update
  - ✅ No errors in console

- [ ] **Manual Save**: Click "Save Now" button
  - ✅ Saves immediately (no 1 second delay)
  - ✅ Success toast appears
  - ✅ Timestamp updates

- [ ] **Layout Switching**: Work on G-26C, switch to G-32C
  - ✅ G-26C draft should be saved
  - ✅ G-32C should load (with draft if exists)
  - ✅ Switch back to G-26C, work should be preserved
  - ✅ Undo history should be independent per layout

- [ ] **Undo/Redo Persistence**: Make 5 changes, reload
  - ✅ After restore, should be able to undo all 5 changes
  - ✅ History position should be preserved

- [ ] **Draft Expiry**: Create draft, manually set timestamp to 3 days ago
  - ✅ Draft should be auto-deleted
  - ✅ Should NOT show restore prompt
  - ✅ Should use initial layout

- [ ] **Multiple Layouts**: Work on 3 different layouts
  - ✅ localStorage should have 3 separate drafts
  - ✅ Each should have unique key pattern
  - ✅ Switching between them should preserve work

---

### Developer Console Checks

```javascript
// Check localStorage structure
Object.keys(localStorage).filter(k => k.startsWith('planogram-draft'))

// Should see:
// ["planogram-draft-g-26c", "planogram-draft-g-32c", ...]

// Inspect a draft
JSON.parse(localStorage.getItem('planogram-draft-g-26c'))

// Should have:
// {
//   refrigerator: {...},
//   history: [...],
//   historyIndex: number,
//   layoutId: "g-26c",
//   timestamp: "ISO string"
// }

// Check history is saved
const draft = JSON.parse(localStorage.getItem('planogram-draft-g-26c'))
console.log('History length:', draft.history.length)
console.log('Current position:', draft.historyIndex)
```

---

## Phase 7: Final Cleanup

### Step 7.1: Check for any console errors
- [ ] No TypeScript errors in terminal
- [ ] No runtime errors in browser console
- [ ] No React warnings in console

---

### Step 7.2: Code review
- [ ] All localStorage operations are in store
- [ ] No persistence logic in components
- [ ] Store is the single source of truth
- [ ] Component is simplified (50% reduction)

---

### Step 7.3: Documentation
- [ ] Update README if necessary
- [ ] Add JSDoc comments to new store actions
- [ ] Update architecture diagram if exists

---

### Step 7.4: Git commit structure
```bash
# Commit 1: Store implementation
git add lib/store.ts
git commit -m "feat: add persistence actions to Zustand store

- Implement initializeLayout() with draft detection
- Implement switchLayout() with auto-save current layout
- Implement restoreDraft() and clearDraft()
- Add manualSave() action
- Update pushToHistory() to trigger auto-save
- Store full state: refrigerator + history + historyIndex
- Per-layout storage keys
- Auto-delete drafts older than 2 days"

# Commit 2: Component simplification
git add app/planogram/components/planogramEditor.tsx
git commit -m "refactor: simplify PlanogramEditor persistence

- Remove persistence state and useEffect hooks
- Remove complex timing logic
- Use store actions for all persistence
- Reduce component size by 50%
- Fix race condition on draft restoration"

# Commit 3: Delete old persistence file
git rm lib/persistence.ts
git commit -m "chore: remove deprecated persistence utilities

Persistence logic has been moved to Zustand store"

# Commit 4: Update documentation
git add *.md
git commit -m "docs: update persistence flow documentation"
```

---

## Implementation Order

**Recommended sequence:**
1. ✅ Phase 1.1: Implement `initializeLayout()`
2. ✅ Phase 1.2: Implement `switchLayout()`
3. ✅ Phase 1.3: Implement `restoreDraft()`
4. ✅ Phase 1.4: Implement `clearDraft()`
5. ✅ Phase 1.5: Add `manualSave()`
6. ✅ Phase 2.1-2.2: Update `pushToHistory()` and all calls
7. ⏸️ **STOP AND TEST STORE INDEPENDENTLY**
8. ✅ Phase 3.1-3.6: Simplify component
9. ✅ Phase 5.1-5.2: Update SaveIndicator
10. ⏸️ **COMPREHENSIVE TESTING**
11. ✅ Phase 4.1-4.2: Delete old persistence file
12. ✅ Phase 7: Final cleanup and commits

---

## Current Status

- ✅ Store structure defined
- ✅ LocalStorage utilities implemented
- ⏳ **NEXT: Implement persistence actions (Phase 1)**
- ⏳ Component simplification (Phase 3)
- ⏳ Testing (Phase 6)

---

## Questions to Resolve Before Implementation

1. **clearDraft() design:**
   - Should it take `initialLayout` as parameter?
   - Or store `initialLayout` in state?
   - Or reset to `history[0]`?

2. **manualSave() feedback:**
   - Should we add a temporary `isSaving` state?
   - Or is the success toast enough?

3. **SaveIndicator coupling:**
   - Keep props-based (loose coupling)?
   - Or read from store directly (tighter coupling)?

4. **Error handling:**
   - Should we add try-catch in store actions?
   - How to handle localStorage quota exceeded?

5. **Migration path:**
   - Should we migrate existing single-key drafts?
   - Or just let users start fresh?

**Let me know your preferences and we'll start implementing! 🚀**
