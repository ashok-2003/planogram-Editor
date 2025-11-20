# Phase 2 Execution Plan - Inline Helper Functions

## Goal
Remove `_getRefrigeratorData` and `_updateRefrigeratorData` helpers and inline their logic directly into each action.

## Pattern to Replace

### OLD Pattern (Using Helpers):
```typescript
const currentFridge = actions._getRefrigeratorData(doorId);
const newFridge = produce(currentFridge, draft => {
  // modifications
});
actions._updateRefrigeratorData(newFridge, doorId);
```

### NEW Pattern (Direct Access):
```typescript
const { refrigerators, isMultiDoor } = get();
const currentFridge = refrigerators[doorId] || {};
const newFridge = produce(currentFridge, draft => {
  // modifications
});

// Update state directly
const updatedRefrigerators = produce(refrigerators, draft => {
  draft[doorId] = newFridge;
});
const historyUpdate = pushToHistory(updatedRefrigerators, state.history, state.historyIndex, state.currentLayoutId);
set({
  refrigerators: updatedRefrigerators,
  refrigerator: updatedRefrigerators['door-1'] || {},
  ...historyUpdate
});
```

## Functions to Update (11 total)

1. ✅ `removeItemsById` - line 355
2. ✅ `duplicateAndAddNew` - line 390
3. ✅ `duplicateAndStack` - line 420
4. ✅ `replaceSelectedItem` - line 447
5. ✅ `addItemFromSku` - line 494
6. ✅ `moveItem` (same door) - line 561
7. ✅ `moveItem` (cross-door) - lines 536-557
8. ✅ `reorderStack` - line 587
9. ✅ `stackItem` - line 609
10. ✅ `updateBlankWidth` - line 680

## Benefits

1. **Direct Access** - No helper indirection
2. **Clearer Code** - See exactly what's happening
3. **Easier Debugging** - No hidden logic
4. **Less Cognitive Load** - Fewer functions to track
5. **Type Safety** - Direct access to typed state

## Execution Steps

1. Start with simplest functions (single update)
2. Move to complex functions (multiple updates)
3. Remove helper function definitions
4. Test after each batch
5. Verify all TypeScript errors resolved

## Status

✅ **COMPLETE!** All helper functions inlined and removed.

## Functions Updated

1. ✅ `removeItemsById` - Inlined, now uses direct refrigerators access
2. ✅ `duplicateAndAddNew` - Inlined, single transaction
3. ✅ `duplicateAndStack` - Inlined, single transaction
4. ✅ `replaceSelectedItem` - Inlined, single transaction
5. ✅ `addItemFromSku` - Inlined, single transaction
6. ✅ `moveItem` - Inlined, handles cross-door moves in single transaction
7. ✅ `reorderStack` - Inlined, single transaction
8. ✅ `stackItem` - Inlined, single transaction
9. ✅ `updateBlankWidth` - Inlined, single transaction

## Helper Functions Removed

✅ `_getRefrigeratorData` - Deleted (replaced with direct access)
✅ `_updateRefrigeratorData` - Deleted (replaced with inline pushToHistory)

## Results

- **0 TypeScript Errors** ✅
- **Code is More Direct** - No hidden helper logic
- **Single Transaction Updates** - All updates happen atomically
- **Easier to Debug** - See exactly what's happening
- **Less Cognitive Load** - Fewer functions to track
