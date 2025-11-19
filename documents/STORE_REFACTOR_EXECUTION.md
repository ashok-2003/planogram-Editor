# Store Refactor Execution - Step by Step

## Current Analysis

### Helper Functions Status
- `_updateRefrigeratorData` ✅ - Keep it! It properly handles:
  - Multi-door updates
  - History management
  - Backward compatibility with `refrigerator` state
  
- `_getRefrigeratorData` ❌ - Not found, likely removed already

### Functions Using `_updateRefrigeratorData` (Good!)
1. Line 355 - Unknown function
2. Line 496 - `addItemFromSku` ✅ (just fixed)
3. Line 531-532 - `moveItem` (cross-door move)
4. Line 548 - `moveItem` (same door move)
5. Line 567 - `reorderStack`
6. Line 603 - Unknown function

## Refactor Strategy

### Phase A: Quick Wins (30 min)
1. ✅ `addItemFromSku` - Already fixed
2. Verify `moveItem` - Check if doorId handling is correct
3. Verify `reorderStack` - Check if doorId is passed
4. Verify `stackItem` - Check multi-door support

### Phase B: Properties & Actions (30 min)
5. `replaceSelectedItem` - Ensure uses findStackLocation
6. `duplicateAndAddNew` - Ensure uses findStackLocation
7. `duplicateAndStack` - Ensure uses findStackLocation
8. `updateBlankWidth` - Ensure uses findStackLocation
9. `removeItemsById` - Ensure uses findStackLocation

### Phase C: Initialization & Persistence (30 min)
10. `initializeLayout` - Add multi-door initialization
11. `switchLayout` - Add multi-door switching
12. Add `migrateDraftIfNeeded` helper
13. Update localStorage functions

### Phase D: Backend & UI (30 min)
14. Verify `BackendStatePreview` uses multi-door transform
15. Update `FrontendStatePreview` if needed
16. Test validation functions

## Starting with Phase A...
