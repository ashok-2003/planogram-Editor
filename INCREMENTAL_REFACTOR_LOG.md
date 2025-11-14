# Incremental Store Refactor Log

## Goal
Gradually migrate from dual-state (refrigerator + refrigerators + isMultiDoor) to unified multi-door state.

## Strategy
Make smallest possible changes, test after each step, never break existing functionality.

---

## Step 1: Fix Immediate Errors ✅
**Status**: COMPLETE
**Files**: `lib/store.ts`, `app/planogram/components/planogramEditor.tsx`

### Issue
- `initializeLayout` references undefined `layoutData` variable
- `switchLayout` references undefined `layoutData` variable
- `planogramEditor` tried to use `isMultiDoor` and `refrigerators` but didn't destructure them

### Solution
For now, keep backward compatibility. The functions accept `Refrigerator` but we need to know if it's multi-door.
We'll add an optional fourth parameter `layoutData?: any` to both functions.

### Changes
- [x] Add `layoutData?: any` parameter to `initializeLayout` signature in interface
- [x] Add `layoutData?: any` parameter to `switchLayout` signature in interface  
- [x] Add `layoutData?: any` parameter to `initializeLayout` implementation
- [x] Add `refrigerators` and `isMultiDoor` reads in planogramEditor
- [x] ✅ **All TypeScript errors resolved!**

---

## Step 2: Update PlanogramEditor to Pass LayoutData ✅
**Status**: COMPLETE
**Files**: `app/planogram/components/planogramEditor.tsx`

### Changes
- [x] Added `refrigerators` and `isMultiDoor` subscriptions
- [x] Updated imported layout initialization to pass `layoutData`
- [x] Updated default initialization to pass `layoutData`
- [x] Verified `handleLayoutChange` already passes `layoutData` correctly

---

## Step 3: Update BackendStatePreview ✅
**Status**: COMPLETE
**Files**: `app/planogram/components/BackendStatePreview.tsx`

### Changes
- [x] Added `isMultiDoor` subscription
- [x] Added `refrigerators` subscription with proper dependencies
- [x] Component already uses both `refrigerator` and `refrigerators` based on `isMultiDoor`

---

## Step 4: Update PropertiesPanel Multi-Door Support ✅
**Status**: COMPLETE
**Files**: `app/planogram/components/PropertiesPanel.tsx`

### Changes
- [x] Updated `BlankSpaceWidthAdjuster` to use `findStackLocation` with `doorId` support
- [x] Updated `selectedItem` calculation to use `findStackLocation` instead of direct iteration
- [x] Both functions now properly support multi-door refrigerators

---

## Step 5: Update InfoPanel Multi-Door Support ✅
**Status**: COMPLETE
**Files**: `app/planogram/components/InfoPanel.tsx`

### Changes
- [x] Added `isMultiDoor` and `refrigerators` subscriptions
- [x] Updated `selectedItem` calculation to use `findStackLocation` with `doorId` support
- [x] Now properly handles both single-door and multi-door modes

---

## Step 6: Verify Component Multi-Door Support ✅
**Status**: COMPLETE
**Verified Components**: 
- `Refrigerator.tsx` - Already has multi-door support via `doorId` prop
- `row.tsx` - Already passes `doorId` to children
- `stack.tsx` - Ready for multi-door (receives context from parent)
- `BoundingBoxOverlay.tsx` - Already uses both states based on `isMultiDoor`

---

## Next Steps (Planned)
7. Add migration helper `migrateDraftIfNeeded()` for old localStorage drafts
8. Update backend-transform.ts to always use multi-door format
9. Gradually remove isMultiDoor branching logic from store
10. Eventually deprecate refrigerator single-door state
11. Comprehensive testing across all features

---

## Notes
- Keep ALL existing comments
- Never delete code without replacement
- Test after EVERY change
- Commit frequently
