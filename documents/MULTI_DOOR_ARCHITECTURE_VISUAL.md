# Multi-Door Architecture - Visual Guide

## Component Hierarchy (After Step 7)

```
PlanogramEditor
    │
    ├─ LayoutSelector (selects single/multi-door layout)
    │
    └─ MultiDoorRefrigerator ⭐ NEW
        │
        ├─ (if single door) ──→ RefrigeratorComponent (door-1)
        │
        └─ (if multi door) ──→ [
            │
            ├─ RefrigeratorComponent (door-1)
            │   ├─ RowComponent
            │   │   └─ StackComponent
            │   │       └─ ItemComponent
            │   ...
            │
            └─ RefrigeratorComponent (door-2)
                ├─ RowComponent
                │   └─ StackComponent
                │       └─ ItemComponent
                ...
        ]
```

## Data Flow

```
┌─────────────────────────────────────────────────────┐
│                 ZUSTAND STORE                       │
│                                                     │
│  state = {                                         │
│    refrigerators: {                                │
│      'door-1': { row-1: {...}, row-2: {...} }     │
│      'door-2': { row-1: {...}, row-2: {...} }     │
│    },                                              │
│    isMultiDoor: true,                             │
│    currentLayoutId: 'g-26c-double'                │
│  }                                                 │
└─────────────────────────────────────────────────────┘
         │                              │
         │                              │
         ▼                              ▼
┌──────────────────┐          ┌──────────────────┐
│  Door 1 UI       │          │  Door 2 UI       │
│                  │          │                  │
│  RefrigeratorC.. │          │  RefrigeratorC.. │
│  - Row 1         │          │  - Row 1         │
│  - Row 2         │          │  - Row 2         │
│  - Row 3         │          │  - Row 3         │
│  - Row 4         │          │  - Row 4         │
└──────────────────┘          └──────────────────┘
```

## Drag & Drop Flow

```
1. User drags SKU from palette
   │
   ▼
2. Hovers over Door 2, Row 3
   │
   ▼
3. DND Kit detects hover over droppable area
   │
   ▼
4. Droppable data contains:
   {
     type: 'row',
     rowId: 'row-3',
     doorId: 'door-2'  ⭐ KEY FIELD
   }
   │
   ▼
5. User drops item
   │
   ▼
6. handleDragEnd extracts:
   - over.data.current.doorId = 'door-2'
   - over.data.current.rowId = 'row-3'
   │
   ▼
7. Calls store action:
   actions.addItemFromSku(
     sku,
     targetRowId: 'row-3',
     targetStackIndex: 0,
     doorId: 'door-2'  ⭐ MUST PASS THIS
   )
   │
   ▼
8. Store updates:
   refrigerators['door-2']['row-3'].stacks.push([newItem])
```

## State Structure Comparison

### Before Multi-Door (Old)
```typescript
{
  refrigerator: {
    'row-1': { stacks: [...] },
    'row-2': { stacks: [...] }
  }
}
```

### After Multi-Door (New)
```typescript
{
  refrigerators: {
    'door-1': {
      'row-1': { stacks: [...] },
      'row-2': { stacks: [...] }
    },
    'door-2': {
      'row-1': { stacks: [...] },
      'row-2': { stacks: [...] }
    }
  }
}
```

### Single-Door in New Format
```typescript
{
  refrigerators: {
    'door-1': {  // ⭐ Just one door
      'row-1': { stacks: [...] },
      'row-2': { stacks: [...] }
    }
  }
}
```

## Key Decisions Made

### ✅ Wrapper Pattern
Instead of modifying `RefrigeratorComponent` to render multiple doors internally, we created a wrapper (`MultiDoorRefrigerator`) that renders multiple instances.

**Benefits**:
- Cleaner separation of concerns
- RefrigeratorComponent stays focused on one door
- Easy to add more doors (just map over `doorIds`)
- No breaking changes to existing component

### ✅ Door Detection
Door count determined by layout data, not hardcoded:
```typescript
const doorIds = layoutData.doors.map(door => door.id);
```

**Benefits**:
- Supports 1, 2, 3, or more doors
- Layout data is source of truth
- Easy to add new multi-door layouts

### ✅ Backward Compatibility
Single-door layouts work unchanged:
```typescript
if (doorIds.length === 1) {
  return <RefrigeratorComponent doorId="door-1" ... />
}
```

**Benefits**:
- No regression for existing users
- Gradual migration path
- Fallback to single door if issues

## Testing Strategy

### Level 1: Visual (Done ✅)
- Render multiple doors
- Labels visible
- Proper spacing

### Level 2: Drag & Drop (Next)
- Drop to Door 1 → goes to Door 1
- Drop to Door 2 → goes to Door 2
- Drop to wrong door → doesn't happen

### Level 3: State Management
- Items stored in correct door state
- findStackLocation returns correct doorId
- Actions update correct door

### Level 4: Persistence
- Save draft with both doors
- Load draft restores both doors
- Backend export merges correctly

## Common Issues & Solutions

### Issue: Items go to wrong door
**Cause**: doorId not passed to action
**Fix**: Extract doorId from `over.data.current.doorId`

### Issue: Can't drop on Door 2
**Cause**: Droppable areas not set up with doorId
**Fix**: Already done in `row.tsx` ✅

### Issue: Backend export shows only one door
**Cause**: Export function not merging doors
**Fix**: Use `convertMultiDoorFrontendToBackend` or update export logic

### Issue: Undo/redo breaks multi-door
**Cause**: History stores wrong format
**Fix**: Ensure history always stores `MultiDoorRefrigerator` format

## Next Phase Preview

### Step 8: Drag & Drop Testing
- Test all drag scenarios
- Fix any doorId passing issues
- Verify state updates correctly

### Step 9: Backend Export
- Merge doors into single export
- Calculate X-offsets for each door
- Maintain `Door-1.Sections` format

### Step 10: Migration Helper
- Convert old single-door drafts
- Wrap in `{ 'door-1': ... }` format
- Preserve user data

## Success Metrics

- ✅ Two doors render side-by-side
- ⏳ Drag to Door 1 works
- ⏳ Drag to Door 2 works
- ⏳ State shows correct door data
- ⏳ Backend export merges correctly
- ⏳ Drafts save/load properly

---

**Current Status**: Step 7 Complete - Visual rendering works!

**Next Action**: Test drag & drop and report results.
