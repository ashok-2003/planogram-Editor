# Multi-Door Comprehensive Refactor - Phase 8

## Status: Drag & Drop Working ✅
Items now successfully drop into rows and persist in the store!

## Goal
Refactor ALL remaining functions, panels, and data conversions to work properly with the multi-door architecture and reach a stable state.

---

## Refactor Checklist

### Priority 1: Core Store Functions (HIGH)
These functions still have `isMultiDoor` branching or use deprecated helpers:

- [ ] `moveItem` - Has cross-door logic, needs cleanup
- [ ] `reorderStack` - Uses `_getRefrigeratorData` and `_updateRefrigeratorData`
- [ ] `stackItem` - Uses old helper functions
- [ ] `removeItemsById` - Uses `findStackLocation` and old helpers
- [ ] `duplicateAndAddNew` - Uses old helpers
- [ ] `duplicateAndStack` - Uses old helpers
- [ ] `replaceSelectedItem` - Uses old helpers
- [ ] `updateBlankWidth` - Uses old helpers

### Priority 2: Helper Functions (MEDIUM)
Internal helpers that need to be removed/simplified:

- [ ] `_getRefrigeratorData` - Should be removed (direct access to `refrigerators[doorId]`)
- [ ] `_updateRefrigeratorData` - Should be simplified (inline the logic)
- [ ] `findStackLocation` - Already returns doorId, but verify it's always present

### Priority 3: UI Components (MEDIUM)
Components that may still reference old state:

- [ ] `BackendStatePreview` - Verify uses correct state
- [ ] `FrontendStatePreview` - May need update
- [ ] `BoundingBoxOverlay` - Verify multi-door support
- [ ] Validation functions - Check if they handle multi-door

### Priority 4: Backend Transform (HIGH)
Export functions need multi-door support:

- [ ] `convertMultiDoorFrontendToBackend` - Already exists, verify it works
- [ ] Ensure `BackendStatePreview` uses multi-door transform
- [ ] Test export format with 2 doors

### Priority 5: Persistence (HIGH)
LocalStorage and draft management:

- [ ] Add `migrateDraftIfNeeded()` helper
- [ ] Update `loadFromLocalStorage` to migrate old drafts
- [ ] Update `saveToLocalStorage` to save multi-door format
- [ ] Test draft save/restore with multi-door

### Priority 6: Testing (CRITICAL)
Comprehensive testing of all features:

- [ ] All drag & drop scenarios
- [ ] Undo/redo with multi-door
- [ ] Move between doors
- [ ] Stack items
- [ ] Delete items
- [ ] Replace items
- [ ] Width adjustment
- [ ] Backend export

---

## Execution Plan

### Step 8.1: Clean Up Store Helper Functions
Remove or simplify `_getRefrigeratorData` and `_updateRefrigeratorData` usage.

### Step 8.2: Refactor All Store Actions
Update each action to work directly with `refrigerators[doorId]`.

### Step 8.3: Add Draft Migration
Implement `migrateDraftIfNeeded()` to handle old localStorage data.

### Step 8.4: Verify Backend Transform
Test multi-door export and ensure it merges correctly.

### Step 8.5: Update UI Components
Ensure all panels work with multi-door state.

### Step 8.6: Comprehensive Testing
Test every feature with both single and multi-door layouts.

---

## Starting Point

Let's begin with **Step 8.1: Clean Up Store Helper Functions**.

This will:
1. Review usage of `_getRefrigeratorData` and `_updateRefrigeratorData`
2. Inline their logic where possible
3. Simplify the code
4. Reduce branching

Ready to proceed?
