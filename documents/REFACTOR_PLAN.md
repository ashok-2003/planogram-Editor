# Multi-Door Refactor Plan - Complete Cleanup

## Executive Summary
This document outlines the systematic refactor to eliminate the buggy dual-state system (`refrigerator` + `refrigerators` + `isMultiDoor`) and adopt a single, unified `refrigerators: MultiDoorRefrigerator` architecture.

---

## Current State (The Mess)

### Data Structure Inconsistency
- **lib/planogram-data.ts**: Mixed formats
  - Single-door layouts: Use `doors` array with 1 door ✅ (Already migrated)
  - Multi-door layouts: Use `doors` array with 2+ doors ✅ (Already migrated)
  
### Store State Chaos (lib/store.ts)
```typescript
// CURRENT PROBLEMATIC STATE:
{
  isMultiDoor: boolean;              // ❌ Causes branching logic everywhere
  refrigerator: Refrigerator;        // ❌ Old single-door state
  refrigerators: MultiDoorRefrigerator; // ✅ New multi-door state
  history: (Refrigerator | MultiDoorRefrigerator)[]; // ❌ Union type causes confusion
}
```

### Problems with Current Implementation:
1. **Dual Sync Issue**: Code tries to keep `refrigerator` and `refrigerators['door-1']` in sync, often fails
2. **Complex Conditionals**: Every action has `if (isMultiDoor) { ... } else { ... }` branches
3. **Broken History**: Undo/redo confused about data format
4. **Broken UI**: Components don't know which state to read
5. **findStackLocation()**: Returns optional `doorId`, causing undefined behavior
6. **Actions Missing doorId**: UI doesn't pass `doorId` to store actions

---

## Target State (The Clean Solution)

### Unified Store State
```typescript
// NEW UNIFIED STATE:
{
  refrigerators: MultiDoorRefrigerator; // ✅ Single source of truth
  history: MultiDoorRefrigerator[];     // ✅ Always multi-door format
  // isMultiDoor: DELETED
  // refrigerator: DELETED
}
```

### Key Principles:
1. **Single-door layouts** = `{ 'door-1': Refrigerator }`
2. **Multi-door layouts** = `{ 'door-1': Refrigerator, 'door-2': Refrigerator, ... }`
3. **All actions require doorId** parameter (no optionals)
4. **findStackLocation()** always returns `doorId` (required field)
5. **History** always stores `MultiDoorRefrigerator` format
6. **LocalStorage migration** wraps old single-door drafts into `{ 'door-1': ... }` on load

---

## Refactor Execution Plan

### Phase 1: Type System Cleanup ✅
**File**: `lib/types.ts`
- [x] Already correct - `LayoutData` has `doors: DoorConfig[]`
- [x] `MultiDoorRefrigerator` defined
- [x] Optional legacy fields marked for backward compatibility

### Phase 2: Data Files ✅
**File**: `lib/planogram-data.ts`
- [x] Already migrated - all layouts use `doors` array
- [x] Single-door: `doorCount: 1, doors: [{ id: 'door-1', ... }]`
- [x] Multi-door: `doorCount: 2, doors: [{ id: 'door-1', ... }, { id: 'door-2', ... }]`

### Phase 3: Store Refactor (CRITICAL)
**File**: `lib/store.ts`

#### 3.1: State Interface Changes
```typescript
interface PlanogramState {
  // DELETE: isMultiDoor
  // DELETE: refrigerator
  refrigerators: MultiDoorRefrigerator; // ✅ Only state
  selectedItemId: string | null;
  history: MultiDoorRefrigerator[];     // ✅ Unified type
  historyIndex: number;
  
  // Persistence unchanged
  currentLayoutId: string | null;
  hasPendingDraft: boolean;
  // ... rest unchanged
  
  // UPDATE: findStackLocation now ALWAYS returns doorId
  findStackLocation: (itemId: string) => StackLocation | null;
  
  actions: {
    // DELETE: _getRefrigeratorData
    // DELETE: _updateRefrigeratorData
    
    // UPDATE: All actions now REQUIRE doorId (no optional)
    addItemFromSku: (sku: Sku, doorId: string, targetRowId: string, targetStackIndex?: number) => void;
    moveItem: (itemId: string, targetDoorId: string, targetRowId: string, targetStackIndex?: number) => void;
    reorderStack: (doorId: string, rowId: string, oldIndex: number, newIndex: number) => void;
    // ... etc
  }
}

// UPDATE: StackLocation always has doorId
type StackLocation = { 
  doorId: string;  // ✅ Required now
  rowId: string; 
  stackIndex: number; 
  itemIndex: number; 
};
```

#### 3.2: findStackLocation Simplification
```typescript
findStackLocation: (itemId: string) => {
  const { refrigerators } = get();
  
  // Simple loop - no branching
  for (const doorId in refrigerators) {
    const door = refrigerators[doorId];
    for (const rowId in door) {
      for (let stackIndex = 0; stackIndex < door[rowId].stacks.length; stackIndex++) {
        const stack = door[rowId].stacks[stackIndex];
        if (stack[0]?.id === itemId) {
          return { doorId, rowId, stackIndex, itemIndex: 0 };
        }
        const itemIndex = stack.findIndex(i => i.id === itemId);
        if (itemIndex !== -1) {
          return { doorId, rowId, stackIndex, itemIndex };
        }
      }
    }
  }
  return null;
}
```

#### 3.3: initializeLayout Simplification
```typescript
initializeLayout: (layoutId: string, layoutData: LayoutData, forceInit = false) => {
  // Build refrigerators from doors array
  const refrigerators: MultiDoorRefrigerator = {};
  for (const door of layoutData.doors) {
    refrigerators[door.id] = door.layout;
  }
  
  // Check for draft (unless forceInit)
  if (!forceInit) {
    const draft = loadFromLocalStorage(layoutId);
    if (draft) {
      // Migrate old format if needed
      const migratedDraft = migrateDraftIfNeeded(draft);
      set({
        refrigerators: migratedDraft.refrigerator,
        history: migratedDraft.history,
        historyIndex: migratedDraft.historyIndex,
        currentLayoutId: layoutId,
        hasPendingDraft: true,
        // ...
      });
      return;
    }
  }
  
  // No draft or forced init
  set({
    refrigerators,
    history: [JSON.parse(JSON.stringify(refrigerators))],
    historyIndex: 0,
    currentLayoutId: layoutId,
    hasPendingDraft: false,
    // ...
  });
}
```

#### 3.4: Draft Migration Helper
```typescript
// Helper to migrate old single-door drafts
const migrateDraftIfNeeded = (draft: StoredDraft): StoredDraft => {
  // Check if refrigerator is old single-door format
  if (!draft.refrigerator['door-1'] && Object.keys(draft.refrigerator).some(k => k.startsWith('row-'))) {
    // Old format detected - wrap it
    return {
      ...draft,
      refrigerator: { 'door-1': draft.refrigerator },
      history: draft.history.map(h => {
        if (h && !h['door-1'] && Object.keys(h).some(k => k.startsWith('row-'))) {
          return { 'door-1': h };
        }
        return h;
      })
    };
  }
  return draft;
};
```

#### 3.5: Action Simplifications
```typescript
addItemFromSku: (sku, doorId, targetRowId, targetStackIndex?) => {
  set(state => {
    const newItem: Item = { /* create item */ };
    const door = state.refrigerators[doorId];
    
    const newDoor = produce(door, draft => {
      const targetRow = draft[targetRowId];
      if (targetStackIndex !== undefined) {
        targetRow.stacks.splice(targetStackIndex, 0, [newItem]);
      } else {
        targetRow.stacks.push([newItem]);
      }
    });
    
    const newRefrigerators = produce(state.refrigerators, draft => {
      draft[doorId] = newDoor;
    });
    
    const historyUpdate = pushToHistory(newRefrigerators, state.history, state.historyIndex, state.currentLayoutId);
    
    return {
      refrigerators: newRefrigerators,
      ...historyUpdate
    };
  });
}

// Similar simplifications for all other actions
// - moveItem
// - reorderStack
// - stackItem
// - deleteSelectedItem
// - duplicateAndAddNew
// - etc.
```

### Phase 4: UI Component Updates

#### 4.1: RefrigeratorComponent
**File**: `app/planogram/components/Refrigerator.tsx`
```typescript
// Current: Renders single refrigerator
// New: Iterate over all doors

const RefrigeratorComponent = ({ ... }) => {
  const refrigerators = usePlanogramStore(state => state.refrigerators);
  const doorIds = Object.keys(refrigerators).sort(); // ['door-1', 'door-2', ...]
  
  return (
    <div className="flex gap-4">
      {doorIds.map(doorId => (
        <div key={doorId} className="door-container">
          <div className="door-label">{doorId.replace('-', ' ').toUpperCase()}</div>
          <div className="door-content">
            {Object.keys(refrigerators[doorId]).map(rowId => (
              <Row 
                key={rowId}
                doorId={doorId}  // ✅ Pass doorId to children
                rowId={rowId}
                data={refrigerators[doorId][rowId]}
                // ...
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
```

#### 4.2: PlanogramEditor
**File**: `app/planogram/components/planogramEditor.tsx`

**Changes:**
1. Pass `layoutData` (not just `layout`) to `initializeLayout`
2. Pass `doorId` to all drag/drop handlers
3. Update `handleDragEnd` to determine `doorId` from drop target

```typescript
// Update initialization
useEffect(() => {
  if (importedLayout) {
    actions.initializeLayout(selectedLayoutId, importedLayoutData, true);
  } else {
    actions.initializeLayout(selectedLayoutId, initialLayouts[selectedLayoutId]);
  }
}, []);

// Update drag handlers to pass doorId
const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;
  
  if (over) {
    const targetDoorId = over.data.current?.doorId || 'door-1'; // Get from drop target
    
    if (activeType === 'sku') {
      actions.addItemFromSku(
        active.data.current.sku,
        targetDoorId,  // ✅ Pass doorId
        dropIndicator.targetRowId,
        dropIndicator.index
      );
    } else if (interactionMode === 'reorder') {
      actions.moveItem(
        active.id as string,
        targetDoorId,  // ✅ Pass doorId
        dropIndicator.targetRowId,
        dropIndicator.index
      );
    }
  }
};
```

#### 4.3: PropertiesPanel
**File**: `app/planogram/components/PropertiesPanel.tsx`

**Fix**: Use `findStackLocation` to get `doorId`, then read from correct door
```typescript
const PropertiesPanel = ({ ... }) => {
  const selectedItemId = usePlanogramStore(state => state.selectedItemId);
  const refrigerators = usePlanogramStore(state => state.refrigerators);
  const findStackLocation = usePlanogramStore(state => state.findStackLocation);
  
  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null;
    
    const location = findStackLocation(selectedItemId);
    if (!location) return null;
    
    // ✅ Now doorId is guaranteed to exist
    return refrigerators[location.doorId][location.rowId].stacks[location.stackIndex][location.itemIndex];
  }, [selectedItemId, refrigerators, findStackLocation]);
  
  // Render properties using selectedItem...
};
```

### Phase 5: Backend Transform Update
**File**: `lib/backend-transform.ts`

**Changes:**
1. Delete `convertFrontendToBackend` (old single-door version)
2. Rename `convertMultiDoorFrontendToBackend` → `convertFrontendToBackend`
3. Always accept `MultiDoorRefrigerator` as input
4. Merge all doors into single `Door-1.Sections` array with correct X-offsets

```typescript
export function convertFrontendToBackend(
  refrigerators: MultiDoorRefrigerator,
  layoutData: LayoutData,
  // ... other params
): BackendJSON {
  const doorIds = Object.keys(refrigerators).sort();
  const allSections: Section[] = [];
  let cumulativeXOffset = 0;
  
  for (let doorIndex = 0; doorIndex < doorIds.length; doorIndex++) {
    const doorId = doorIds[doorIndex];
    const door = refrigerators[doorId];
    const doorConfig = layoutData.doors[doorIndex];
    
    // Convert this door's rows to sections
    const doorSections = convertDoorToSections(door, cumulativeXOffset, /* ... */);
    allSections.push(...doorSections);
    
    // Update offset for next door
    cumulativeXOffset += doorConfig.width;
  }
  
  // Return merged output
  return {
    Cooler: {
      'Door-1': {
        Sections: allSections,
        'Door-Visible': true
      }
    },
    dimensions: { /* ... */ }
  };
}
```

### Phase 6: Testing & Validation

#### Test Cases:
1. ✅ Single-door layout (g-26c) loads correctly
2. ✅ Multi-door layout (g-26c-double) loads correctly
3. ✅ Switch between single and multi-door layouts
4. ✅ Drag item from palette to door-1
5. ✅ Drag item from palette to door-2 (multi-door only)
6. ✅ Move item within same door
7. ✅ Move item between doors (multi-door only)
8. ✅ Stack items within same door
9. ✅ Undo/redo works correctly
10. ✅ Properties panel shows correct item data
11. ✅ Backend export merges all doors correctly
12. ✅ LocalStorage draft migration works (old → new format)
13. ✅ Save/load drafts for both single and multi-door

---

## Migration Safety

### Backward Compatibility:
- Old localStorage drafts will be auto-migrated on load
- Legacy `LayoutData` with `width/height/layout` will still load (migration in `initializeLayout`)
- Components gracefully handle single-door as `{ 'door-1': ... }`

### No Breaking Changes for:
- Backend export format (still outputs `Cooler: { "Door-1": {...} }`)
- SKU data structure
- Item/Row/Refrigerator types

---

## Success Criteria

### Code Quality:
- [ ] Zero `if (isMultiDoor)` conditionals in store
- [ ] All actions simplified (no dual-state logic)
- [ ] `findStackLocation` always returns `doorId`
- [ ] All original comments preserved

### Functionality:
- [ ] All existing features work for single-door
- [ ] Multi-door fully functional (drag/drop across doors)
- [ ] Undo/redo works correctly
- [ ] Properties panel works correctly
- [ ] Backend export maintains format compliance

### Performance:
- [ ] No performance regression
- [ ] History management efficient

---

## Files to Modify

1. ✅ `lib/types.ts` - Already correct
2. ✅ `lib/planogram-data.ts` - Already correct
3. ❌ `lib/store.ts` - **MAJOR REFACTOR NEEDED**
4. ❌ `app/planogram/components/Refrigerator.tsx` - **UPDATE NEEDED**
5. ❌ `app/planogram/components/planogramEditor.tsx` - **UPDATE NEEDED**
6. ❌ `app/planogram/components/PropertiesPanel.tsx` - **FIX NEEDED**
7. ❌ `lib/backend-transform.ts` - **REFACTOR NEEDED**
8. ❌ `app/planogram/components/Row.tsx` - **ADD doorId PROP**
9. ❌ `app/planogram/components/Stack.tsx` - **ADD doorId to data.current**

---

## Next Steps

Ready to proceed with Phase 3 (Store Refactor) when you provide the current `lib/store.ts` file.
