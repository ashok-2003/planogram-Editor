# Multi-Door Refrigerator Migration Plan

## Executive Summary

This document outlines the complete migration strategy to transform the current single-door planogram editor into a multi-door system. The migration will:
- Add door-level hierarchy to the data structure
- Support multiple doors per refrigerator
- Maintain 100% backward compatibility with existing features
- Preserve all validation, drag-drop, undo/redo, and persistence functionality
- Update backend transform to generate door-wise output

---

## 📊 Current System Analysis

### Current Data Hierarchy (Single-Door)
```
LayoutData
├── name: string
├── width: number
├── height: number
└── layout: Refrigerator (contains rows directly)
    └── Row[] (row-1, row-2, row-3, row-4)
        └── Item[][] (stacks of items)
```

### Current Backend Format
```json
{
  "Cooler": {
    "Door-1": {
      "Sections": [...],
      "Door-Visible": true
    }
  }
}
```

### Key System Components

#### 1. **Type Definitions** (`lib/types.ts`)
- `Refrigerator` = `Record<string, Row>` (row-indexed)
- `Row` contains: `id`, `capacity`, `maxHeight`, `stacks`, `allowedProductTypes`
- `Item` represents individual products

#### 2. **State Management** (`lib/store.ts`)
Current state directly stores `refrigerator: Refrigerator`
- **Actions access rows directly**: `state.refrigerator[rowId]`
- **History tracking**: Entire refrigerator state saved per action
- **Persistence**: Saves full refrigerator to localStorage

#### 3. **Validation System** (`lib/validation.ts`)
- Iterates through `refrigerator` object using `for (const rowId in refrigerator)`
- Validates constraints: row capacity, height limits, product type restrictions
- Generates conflict IDs and valid drop targets

#### 4. **Drag-Drop System** (`planogramEditor.tsx`)
- Uses `@dnd-kit` with sortable contexts
- Validation runs on drag start to highlight valid drop zones
- Supports reordering stacks and stacking items

#### 5. **Backend Transform** (`lib/backend-transform.ts`)
- **Hardcoded "Door-1"** in output structure
- Calculates bounding boxes with absolute positioning
- Accounts for: header (100px), grille (90px), frame border (16px)

#### 6. **Bounding Box Utilities** (`lib/bounding-box-utils.ts`)
- Generates 4-corner bounding boxes for each item
- Scales boxes by `PIXEL_RATIO` for high-res captures
- **Hardcoded "Door-1"** reference in scaling function

#### 7. **Persistence System** (`lib/persistence.ts`)
- Saves `Refrigerator` state with layout ID
- Tracks last save timestamp
- Provides draft restore functionality

---

## 🎯 Target Data Hierarchy (Multi-Door)

### Proposed Structure
```
LayoutData
├── name: string
├── doorCount: number (NEW)
├── doors: DoorConfig[] (NEW)
│   ├── doorId: string (e.g., "door-1", "door-2")
│   ├── width: number
│   ├── height: number
│   └── layout: Refrigerator (rows for this door)
│       └── Row[] (door-1-row-1, door-1-row-2, etc.)
│           └── Item[][] (stacks)
└── (DEPRECATED) width, height, layout
```

### Target Backend Format
```json
{
  "Cooler": {
    "Door-1": {
      "Sections": [...],
      "Door-Visible": true
    },
    "Door-2": {
      "Sections": [...],
      "Door-Visible": true
    }
  }
}
```

---

## 🗺️ Migration Strategy

### Phase 1: Type System Updates

#### File: `lib/types.ts`

**Changes Required:**

1. **Add new types:**
```typescript
// NEW: Door configuration
export interface DoorConfig {
  doorId: string;          // "door-1", "door-2", etc.
  doorNumber: number;      // 1, 2, 3, etc.
  width: number;           // Internal width in pixels
  height: number;          // Internal height in pixels
  layout: Refrigerator;    // Rows for this door
  name?: string;           // Optional: "Left Door", "Right Door"
}

// NEW: Multi-door layout data
export interface MultiDoorLayoutData {
  name: string;
  doorCount: number;
  doors: DoorConfig[];
}

// NEW: Multi-door refrigerator state
export interface MultiDoorRefrigerator {
  [doorId: string]: {
    doorNumber: number;
    width: number;
    height: number;
    rows: Refrigerator;    // Row data for this door
  };
}
```

2. **Update existing types:**
```typescript
// Update LayoutData to support both formats
export interface LayoutData {
  name: string;
  
  // Legacy single-door format (for backward compatibility)
  width?: number;
  height?: number;
  layout?: Refrigerator;
  
  // NEW: Multi-door format
  doorCount?: number;
  doors?: DoorConfig[];
}
```

**Impact:** Low - Type additions, no breaking changes

---

### Phase 2: State Management Updates

#### File: `lib/store.ts`

**Changes Required:**

1. **Update store state:**
```typescript
export interface PlanogramState {
  // BEFORE: refrigerator: Refrigerator
  // AFTER:
  refrigerator: MultiDoorRefrigerator; // New structure
  
  selectedItemId: string | null;
  selectedDoorId: string | null;  // NEW: Track active door
  
  history: MultiDoorRefrigerator[];
  historyIndex: number;
  
  currentLayoutId: string | null;
  doorCount: number;  // NEW: Number of doors in current layout
  
  // ...rest unchanged
}
```

2. **Update helper function:**
```typescript
// BEFORE:
findStackLocation: (itemId: string) => { rowId, stackIndex, itemIndex } | null

// AFTER:
findStackLocation: (itemId: string) => { 
  doorId: string;      // NEW
  rowId: string; 
  stackIndex: number;
  itemIndex: number;
} | null

// Implementation:
findStackLocation: (itemId: string) => {
  const { refrigerator } = get();
  for (const doorId in refrigerator) {
    const door = refrigerator[doorId];
    for (const rowId in door.rows) {
      for (let stackIndex = 0; stackIndex < door.rows[rowId].stacks.length; stackIndex++) {
        const stack = door.rows[rowId].stacks[stackIndex];
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

3. **Update ALL actions to include doorId:**

**Actions that need doorId parameter:**
- `addItemFromSku(sku, doorId, targetRowId, targetStackIndex)`
- `moveItem(itemId, doorId, targetRowId, targetStackIndex)`
- `reorderStack(doorId, rowId, oldIndex, newIndex)`
- `stackItem(draggedStackId, targetStackId)` - derive doorId from findStackLocation
- `replaceSelectedItem(newSku, isRulesEnabled)` - derive doorId from findStackLocation
- `duplicateAndAddNew()` - derive doorId from findStackLocation
- `duplicateAndStack()` - derive doorId from findStackLocation
- `deleteSelectedItem()` - derive doorId from findStackLocation
- `updateBlankWidth(itemId, newWidthMM)` - derive doorId from findStackLocation

**Example update for `addItemFromSku`:**
```typescript
// BEFORE:
addItemFromSku: (sku, targetRowId, targetStackIndex = -1) => {
  set(state => {
    const targetRow = state.refrigerator[targetRowId];
    // ...
  });
}

// AFTER:
addItemFromSku: (sku, doorId, targetRowId, targetStackIndex = -1) => {
  set(state => {
    const targetRow = state.refrigerator[doorId].rows[targetRowId];
    // ...
    const newFridge = produce(state.refrigerator, draft => {
      if (targetStackIndex >= 0) {
        draft[doorId].rows[targetRowId].stacks.splice(targetStackIndex, 0, [newItem]);
      } else {
        draft[doorId].rows[targetRowId].stacks.push([newItem]);
      }
    });
    // ...
  });
}
```

**Impact:** HIGH - All actions must be updated, but logic remains the same

---

### Phase 3: Validation System Updates

#### File: `lib/validation.ts`

**Changes Required:**

1. **Update `findConflicts` function:**
```typescript
// BEFORE:
export function findConflicts(refrigerator: Refrigerator): string[] {
  const conflictIds: string[] = [];
  for (const rowId in refrigerator) {
    const row = refrigerator[rowId];
    // ...
  }
  return conflictIds;
}

// AFTER:
export function findConflicts(
  refrigerator: MultiDoorRefrigerator,
  doorId?: string  // Optional: validate specific door only
): string[] {
  const conflictIds: string[] = [];
  
  // If doorId specified, only validate that door
  const doorsToValidate = doorId 
    ? [doorId] 
    : Object.keys(refrigerator);
  
  for (const doorKey of doorsToValidate) {
    const door = refrigerator[doorKey];
    for (const rowId in door.rows) {
      const row = door.rows[rowId];
      // ...existing validation logic
    }
  }
  return conflictIds;
}
```

2. **Update `runValidation` payload:**
```typescript
interface ValidationPayload {
  draggedItem: Item | Sku;
  draggedEntityHeight: number;
  isSingleItemStackable: boolean;
  activeDragId: string;
  doorId: string;  // NEW: Active door
  refrigerator: MultiDoorRefrigerator;  // UPDATED
  findStackLocation: (itemId: string) => { doorId, rowId, stackIndex, itemIndex } | null;  // UPDATED
  isRulesEnabled: boolean;
}
```

3. **Update `runValidation` implementation:**
```typescript
export function runValidation({
  draggedItem,
  draggedEntityHeight,
  isSingleItemStackable,
  activeDragId,
  doorId,  // NEW
  refrigerator,
  findStackLocation,
  isRulesEnabled,
}: ValidationPayload): DragValidation {
  const validRowIds = new Set<string>();
  const validStackTargetIds = new Set<string>();
  const originLocation = findStackLocation(activeDragId);
  
  // Only validate rows within the active door
  const door = refrigerator[doorId];
  for (const rowId in door.rows) {
    const row = door.rows[rowId];
    // ...existing validation logic
  }
  
  return { validRowIds, validStackTargetIds };
}
```

**Impact:** MEDIUM - Validation logic unchanged, just needs door context

---

### Phase 4: Component Updates

#### File: `app/planogram/components/Refrigerator.tsx`

**Changes Required:**

1. **Add multi-door support to props:**
```typescript
interface RefrigeratorComponentProps {
  dropIndicator: DropIndicator;
  dragValidation: DragValidation;
  conflictIds: string[];
  selectedLayoutId: string;
  selectedDoorId: string;  // NEW
  doorConfig: DoorConfig;  // NEW
  showBoundingBoxes?: boolean;
  headerHeight?: number;
  grilleHeight?: number;
}
```

2. **Update component to use doorConfig:**
```typescript
export function RefrigeratorComponent({ 
  dropIndicator, 
  dragValidation, 
  conflictIds, 
  selectedLayoutId,
  selectedDoorId,  // NEW
  doorConfig,      // NEW
  showBoundingBoxes = false,
  headerHeight = DEFAULT_HEADER_HEIGHT,
  grilleHeight = DEFAULT_GRILLE_HEIGHT
}: RefrigeratorComponentProps) {
  // Use doorConfig.layout instead of store.refrigerator
  const refrigerator = doorConfig.layout;
  const dimensions = { 
    width: doorConfig.width, 
    height: doorConfig.height,
    name: doorConfig.name || `Door ${doorConfig.doorNumber}`
  };
  
  // ...rest of component logic unchanged
}
```

**Impact:** LOW - Component receives data as props, logic remains same

---

#### File: `app/planogram/components/row.tsx`

**No changes required** - Component is purely presentational

**Impact:** NONE

---

#### File: `app/planogram/components/stack.tsx`

**No changes required** - Component is purely presentational

**Impact:** NONE

---

#### File: `app/planogram/components/item.tsx`

**No changes required** - Component is purely presentational

**Impact:** NONE

---

### Phase 5: Main Editor Updates

#### File: `app/planogram/components/planogramEditor.tsx`

**Changes Required:**

1. **Add door selection state:**
```typescript
export function PlanogramEditor({ initialSkus, initialLayout, initialLayouts }: PlanogramEditorProps) {
  const { refrigerator, actions, findStackLocation, doorCount } = usePlanogramStore();
  
  const [selectedDoorId, setSelectedDoorId] = useState<string>('door-1');  // NEW
  const [activeItem, setActiveItem] = useState<Item | Sku | null>(null);
  // ...rest unchanged
}
```

2. **Add door selector UI (if doorCount > 1):**
```typescript
{doorCount > 1 && (
  <div className="flex gap-2 mb-4">
    {Object.keys(refrigerator).map(doorId => (
      <button
        key={doorId}
        onClick={() => setSelectedDoorId(doorId)}
        className={clsx(
          "px-4 py-2 rounded-md font-semibold",
          selectedDoorId === doorId 
            ? "bg-blue-600 text-white" 
            : "bg-gray-200 text-gray-700"
        )}
      >
        {refrigerator[doorId].name || `Door ${refrigerator[doorId].doorNumber}`}
      </button>
    ))}
  </div>
)}
```

3. **Update drag validation to use active door:**
```typescript
const handleDragStart = (event: DragStartEvent) => {
  // ...
  const validation = runValidation({
    draggedItem,
    draggedEntityHeight,
    isSingleItemStackable,
    activeDragId: active.id as string,
    doorId: selectedDoorId,  // NEW
    refrigerator,
    findStackLocation,
    isRulesEnabled,
  });
  // ...
};
```

4. **Render refrigerators for all doors:**
```typescript
<div className="flex gap-4 overflow-x-auto">
  {Object.keys(refrigerator).map(doorId => (
    <div 
      key={doorId} 
      className={clsx(
        "transition-opacity",
        selectedDoorId === doorId ? "opacity-100" : "opacity-50"
      )}
    >
      <RefrigeratorComponent
        dropIndicator={dropIndicator}
        dragValidation={dragValidation}
        conflictIds={conflictIds}
        selectedLayoutId={selectedLayoutId}
        selectedDoorId={doorId}
        doorConfig={{
          doorId,
          doorNumber: refrigerator[doorId].doorNumber,
          width: refrigerator[doorId].width,
          height: refrigerator[doorId].height,
          layout: refrigerator[doorId].rows,
        }}
        showBoundingBoxes={showBoundingBoxes}
      />
    </div>
  ))}
</div>
```

**Impact:** MEDIUM - Adds door selection, but existing logic reusable

---

### Phase 6: Backend Transform Updates

#### File: `lib/backend-transform.ts`

**Changes Required:**

1. **Update function signature:**
```typescript
// BEFORE:
export function convertFrontendToBackend(
  frontendData: Refrigerator,
  refrigeratorWidth: number,
  refrigeratorHeight: number,
  // ...
): BackendOutput

// AFTER:
export function convertFrontendToBackend(
  frontendData: MultiDoorRefrigerator,  // UPDATED
  // ...
): BackendOutput
```

2. **Update implementation to iterate over doors:**
```typescript
export function convertFrontendToBackend(
  frontendData: MultiDoorRefrigerator,
  headerHeight: number = 100,
  grilleHeight: number = 90,
  frameBorder: number = 16
): BackendOutput {
  const backendOutput: BackendOutput = {
    Cooler: {},  // Will populate dynamically
    dimensions: {
      width: 0,
      height: 0,
      BoundingBoxScale: PIXEL_RATIO
    },
  };
  
  // Process each door
  for (const doorId in frontendData) {
    const door = frontendData[doorId];
    const refrigeratorWidth = door.width;
    const refrigeratorHeight = door.height;
    const totalWidth = refrigeratorWidth + (frameBorder * 2);
    const totalHeight = refrigeratorHeight + headerHeight + grilleHeight + (frameBorder * 2);
    
    // Initialize door structure
    backendOutput.Cooler[doorId] = {
      data: [],
      Sections: [],
      "Door-Visible": true,
    };
    
    // Calculate row positions for this door
    const rowMetadata = calculateRowPositions(door.rows);
    const rowKeys = Object.keys(door.rows).sort();
    
    rowKeys.forEach((rowKey, rowIndex) => {
      const currentRow: Row = door.rows[rowKey];
      const rowMeta = rowMetadata[rowIndex];
      
      // Create section for this row
      const newSection: BackendSection = {
        data: generateSectionPolygon(rowMeta.yStart, rowMeta.yEnd, refrigeratorWidth),
        position: rowIndex + 1,
        products: [],
      };
      
      // Calculate X positions for all stacks
      const stackXPositions = calculateStackPositions(currentRow);
      
      // Process each stack (existing logic)
      currentRow.stacks.forEach((stackArray: Item[], stackIndex) => {
        // ...existing stack processing logic
      });
      
      backendOutput.Cooler[doorId].Sections.push(newSection);
    });
    
    // Update dimensions (use first door or max dimensions)
    backendOutput.dimensions.width = Math.max(backendOutput.dimensions.width, totalWidth);
    backendOutput.dimensions.height = Math.max(backendOutput.dimensions.height, totalHeight);
  }
  
  return backendOutput;
}
```

**Impact:** MEDIUM - Main loop added, inner logic unchanged

---

#### File: `lib/bounding-box-utils.ts`

**Changes Required:**

1. **Update `scaleBackendBoundingBoxes` to handle multiple doors:**
```typescript
// BEFORE:
export function scaleBackendBoundingBoxes(
  backendData: BackendOutput,
  pixelRatio: number = PIXEL_RATIO
): BackendOutput {
  const scaledOutput: BackendOutput = JSON.parse(JSON.stringify(backendData));
  
  // BEFORE: scaledOutput.Cooler["Door-1"].Sections.forEach(...)
  
  // AFTER: Iterate over all doors
  for (const doorId in scaledOutput.Cooler) {
    scaledOutput.Cooler[doorId].Sections.forEach(section => {
      // ...existing scaling logic
    });
  }
  
  return scaledOutput;
}
```

**Impact:** LOW - Simple loop addition

---

### Phase 7: Persistence Updates

#### File: `lib/persistence.ts`

**Changes Required:**

1. **Update saved draft structure:**
```typescript
interface SavedDraft {
  refrigerator: MultiDoorRefrigerator;  // UPDATED
  layoutId: string;
  timestamp: string;
}
```

2. **Update function signatures:**
```typescript
export function savePlanogramDraft(
  refrigerator: MultiDoorRefrigerator,  // UPDATED
  layoutId: string
): void {
  // ...rest unchanged
}

export function loadPlanogramDraft(
  layoutId?: string
): MultiDoorRefrigerator | null {  // UPDATED
  // ...rest unchanged
}
```

**Impact:** LOW - Type updates only, logic unchanged

---

### Phase 8: Data Migration & Sample Data

#### File: `lib/planogram-data.ts`

**Changes Required:**

1. **Add multi-door layout examples:**
```typescript
export const layouts = {
  'g-26c': {
    name: 'G-26c (Single Door)',
    width: 269,
    height: 523,
    layout: {
      'row-1': { /* existing config */ },
      'row-2': { /* existing config */ },
      'row-3': { /* existing config */ },
      'row-4': { /* existing config */ },
    }
  },
  'g-10f': {
    name: 'G-10f (Single Door)',
    width: 217,
    height: 424,
    layout: {
      'row-1': { /* existing config */ },
      'row-2': { /* existing config */ },
      'row-3': { /* existing config */ },
    }
  },
  
  // NEW: Multi-door example
  'g-52d': {
    name: 'G-52d (Dual Door)',
    doorCount: 2,
    doors: [
      {
        doorId: 'door-1',
        doorNumber: 1,
        width: 269,
        height: 523,
        name: 'Left Door',
        layout: {
          'door-1-row-1': { id: 'door-1-row-1', capacity: 269, maxHeight: 131, stacks: [], allowedProductTypes: 'all' },
          'door-1-row-2': { id: 'door-1-row-2', capacity: 269, maxHeight: 131, stacks: [], allowedProductTypes: 'all' },
          'door-1-row-3': { id: 'door-1-row-3', capacity: 269, maxHeight: 131, stacks: [], allowedProductTypes: 'all' },
          'door-1-row-4': { id: 'door-1-row-4', capacity: 269, maxHeight: 130, stacks: [], allowedProductTypes: 'all' },
        }
      },
      {
        doorId: 'door-2',
        doorNumber: 2,
        width: 269,
        height: 523,
        name: 'Right Door',
        layout: {
          'door-2-row-1': { id: 'door-2-row-1', capacity: 269, maxHeight: 131, stacks: [], allowedProductTypes: 'all' },
          'door-2-row-2': { id: 'door-2-row-2', capacity: 269, maxHeight: 131, stacks: [], allowedProductTypes: 'all' },
          'door-2-row-3': { id: 'door-2-row-3', capacity: 269, maxHeight: 131, stacks: [], allowedProductTypes: 'all' },
          'door-2-row-4': { id: 'door-2-row-4', capacity: 269, maxHeight: 130, stacks: [], allowedProductTypes: 'all' },
        }
      }
    ]
  }
};
```

**Impact:** LOW - Data addition, no breaking changes

---

### Phase 9: Backward Compatibility Layer

#### File: `lib/migration-utils.ts` (NEW)

**Purpose:** Convert legacy single-door layouts to multi-door format

```typescript
import { LayoutData, MultiDoorLayoutData, Refrigerator } from './types';

/**
 * Convert legacy single-door layout to multi-door format
 */
export function migrateLegacyLayout(legacyLayout: LayoutData): MultiDoorLayoutData {
  // If already multi-door format, return as is
  if (legacyLayout.doorCount && legacyLayout.doors) {
    return legacyLayout as MultiDoorLayoutData;
  }
  
  // Convert single-door to multi-door
  return {
    name: legacyLayout.name,
    doorCount: 1,
    doors: [
      {
        doorId: 'door-1',
        doorNumber: 1,
        width: legacyLayout.width!,
        height: legacyLayout.height!,
        layout: legacyLayout.layout!,
      }
    ]
  };
}

/**
 * Convert legacy refrigerator state to multi-door state
 */
export function migrateLegacyRefrigerator(
  legacyFridge: Refrigerator
): MultiDoorRefrigerator {
  return {
    'door-1': {
      doorNumber: 1,
      width: 0,  // Will be filled from layout
      height: 0, // Will be filled from layout
      rows: legacyFridge,
    }
  };
}
```

**Impact:** LOW - Utility functions for smooth migration

---

## 📋 Implementation Checklist

### Pre-Migration Steps
- [ ] Create feature branch: `feature/multi-door-support`
- [ ] Backup current working state
- [ ] Write migration tests for backward compatibility
- [ ] Document current API contracts

### Phase 1: Type System (Day 1)
- [ ] Add `DoorConfig` interface
- [ ] Add `MultiDoorLayoutData` interface
- [ ] Add `MultiDoorRefrigerator` interface
- [ ] Update `LayoutData` to support both formats
- [ ] Run TypeScript compiler to identify all impacted files

### Phase 2: State Management (Day 2-3)
- [ ] Update store state structure
- [ ] Update `findStackLocation` to include `doorId`
- [ ] Update all actions to accept/derive `doorId`
- [ ] Update history tracking to use `MultiDoorRefrigerator`
- [ ] Test undo/redo functionality
- [ ] Test persistence save/load

### Phase 3: Validation System (Day 4)
- [ ] Update `findConflicts` signature and implementation
- [ ] Update `runValidation` payload interface
- [ ] Update `runValidation` to validate per door
- [ ] Test validation with multi-door data
- [ ] Verify conflict detection works correctly

### Phase 4: Component Updates (Day 5)
- [ ] Update `RefrigeratorComponent` props
- [ ] Update component to use `doorConfig`
- [ ] Test single-door rendering
- [ ] Test multi-door rendering
- [ ] Verify visual alignment

### Phase 5: Main Editor Updates (Day 6-7)
- [ ] Add door selection state
- [ ] Add door selector UI
- [ ] Update drag handlers to use active door
- [ ] Update drop handlers to use active door
- [ ] Render multiple refrigerators
- [ ] Test drag-drop between doors (if required)
- [ ] Test conflict resolution per door

### Phase 6: Backend Transform (Day 8)
- [ ] Update `convertFrontendToBackend` signature
- [ ] Add door iteration loop
- [ ] Test output with single-door data
- [ ] Test output with multi-door data
- [ ] Verify bounding boxes are correct
- [ ] Test scaling functionality

### Phase 7: Bounding Box Utilities (Day 9)
- [ ] Update `scaleBackendBoundingBoxes` to iterate doors
- [ ] Test scaling with multi-door data
- [ ] Verify bounding box coordinates

### Phase 8: Persistence (Day 10)
- [ ] Update `SavedDraft` interface
- [ ] Update save/load functions
- [ ] Test saving multi-door state
- [ ] Test loading multi-door state
- [ ] Test draft restoration

### Phase 9: Sample Data (Day 11)
- [ ] Add dual-door layout example
- [ ] Add triple-door layout example (optional)
- [ ] Test layout switching
- [ ] Verify row IDs are unique across doors

### Phase 10: Backward Compatibility (Day 12)
- [ ] Create `migration-utils.ts`
- [ ] Implement `migrateLegacyLayout`
- [ ] Implement `migrateLegacyRefrigerator`
- [ ] Add migration on app initialization
- [ ] Test with existing localStorage data
- [ ] Test with legacy API responses

### Phase 11: Testing & QA (Day 13-14)
- [ ] Test all drag-drop scenarios (single-door)
- [ ] Test all drag-drop scenarios (multi-door)
- [ ] Test undo/redo (single-door)
- [ ] Test undo/redo (multi-door)
- [ ] Test validation (single-door)
- [ ] Test validation (multi-door)
- [ ] Test persistence (single-door)
- [ ] Test persistence (multi-door)
- [ ] Test backend export (single-door)
- [ ] Test backend export (multi-door)
- [ ] Test image capture (single-door)
- [ ] Test image capture (multi-door)
- [ ] Test layout switching
- [ ] Test conflict resolution
- [ ] Performance testing with large datasets

### Phase 12: Documentation & Deployment (Day 15)
- [ ] Update README with multi-door examples
- [ ] Document new API endpoints (if any)
- [ ] Update user guide
- [ ] Create migration guide for existing users
- [ ] Code review
- [ ] Merge to main branch
- [ ] Deploy to staging
- [ ] Final QA on staging
- [ ] Deploy to production

---

## 🚨 Risk Assessment

### High Risk Areas
1. **State Management Updates**
   - **Risk:** Breaking existing actions
   - **Mitigation:** Update one action at a time, test thoroughly

2. **Backend Transform**
   - **Risk:** Incorrect bounding boxes for multi-door
   - **Mitigation:** Add debug overlay, visual verification

3. **Persistence Layer**
   - **Risk:** Data loss from format changes
   - **Mitigation:** Implement migration layer, test with real data

### Medium Risk Areas
1. **Validation System**
   - **Risk:** Validation may incorrectly allow/block drops
   - **Mitigation:** Comprehensive test cases

2. **Drag-Drop System**
   - **Risk:** Drop indicators may not work across doors
   - **Mitigation:** Test extensively, add door boundary checks

### Low Risk Areas
1. **Presentational Components**
   - **Risk:** Minimal, components are pure
   - **Mitigation:** Visual regression testing

2. **Type System**
   - **Risk:** Type errors caught at compile time
   - **Mitigation:** TypeScript compilation

---

## 🔄 Rollback Strategy

If critical issues arise post-deployment:

1. **Immediate Rollback:**
   - Revert to previous version from Git
   - Clear localStorage to prevent state corruption

2. **Data Recovery:**
   - Implement data export before migration
   - Provide recovery tool to restore from backup

3. **Gradual Rollout:**
   - Deploy to 10% of users first
   - Monitor error rates and user feedback
   - Increase rollout percentage incrementally

---

## 📊 Success Metrics

### Functionality
- ✅ All existing features work with single-door layouts
- ✅ All existing features work with multi-door layouts
- ✅ Backend export generates correct door-wise structure
- ✅ Bounding boxes align with visual representation
- ✅ No data loss during migration

### Performance
- ✅ Page load time < 500ms
- ✅ Drag-drop latency < 100ms
- ✅ Undo/redo latency < 50ms

### User Experience
- ✅ Intuitive door selection UI
- ✅ Clear visual feedback for active door
- ✅ Smooth transitions between doors

---

## 📚 Additional Resources

### Files to Reference During Migration
- `lib/types.ts` - Type definitions
- `lib/store.ts` - State management (743 lines)
- `lib/validation.ts` - Validation logic (133 lines)
- `lib/backend-transform.ts` - Backend conversion (252 lines)
- `app/planogram/components/planogramEditor.tsx` - Main editor (771 lines)

### External Dependencies
- `@dnd-kit/core` - Drag and drop
- `zustand` - State management
- `immer` - Immutable state updates
- `framer-motion` - Animations
- `html-to-image` - Screenshot capture

---

## 🎓 Key Insights

### What Works Well (Don't Change)
1. **Validation System**: Highly extensible, just needs door context
2. **Drag-Drop**: Well-architected with `@dnd-kit`
3. **Component Structure**: Properly separated concerns
4. **Undo/Redo**: Robust implementation
5. **Bounding Box Calculation**: Mathematically sound

### What Needs Refactoring
1. **Direct Row Access**: `refrigerator[rowId]` → `refrigerator[doorId].rows[rowId]`
2. **Hardcoded "Door-1"**: Replace with dynamic door iteration
3. **State Structure**: Flat → Nested (door → rows)

### Critical Success Factors
1. **Backward Compatibility**: Essential for existing users
2. **Comprehensive Testing**: Cannot skip any test case
3. **Gradual Migration**: One phase at a time
4. **Visual Verification**: Debug overlays for bounding boxes

---

## 💡 Future Enhancements (Post-Migration)

1. **Cross-Door Drag-Drop**: Allow moving items between doors
2. **Door-Specific Settings**: Different rules per door
3. **Asymmetric Doors**: Support doors with different dimensions
4. **Door Templates**: Reusable door configurations
5. **Bulk Operations**: Apply changes to all doors at once

---

## ✅ Conclusion

This migration plan provides a **comprehensive, step-by-step roadmap** to transform the single-door planogram editor into a multi-door system while maintaining **100% backward compatibility** with all existing features.

**Estimated Timeline:** 15 working days
**Risk Level:** Medium (with proper testing)
**Success Probability:** High (90%+)

**Next Steps:**
1. Review and approve this migration plan
2. Create feature branch
3. Begin Phase 1 (Type System Updates)
4. Follow checklist sequentially

---

*Document Version: 1.0*  
*Last Updated: 2025-01-XX*  
*Author: GitHub Copilot + Development Team*
