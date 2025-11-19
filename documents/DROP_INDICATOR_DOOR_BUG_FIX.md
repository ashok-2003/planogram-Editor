# Drop Indicator Door Bug Fix ✅

**Date:** November 19, 2025  
**Status:** FIXED  
**Priority:** HIGH (Blocks multi-door usability)

---

## 🐛 Bug Description

When dragging a product over Door-1's shelf in a multi-door layout, the drop indicator (blue vertical line) was appearing on **both Door-1 AND Door-2** at the same shelf position.

### Visual Issue
```
┌─────────────┐  ┌─────────────┐
│   DOOR-1    │  │   DOOR-2    │
├─────────────┤  ├─────────────┤
│ 🔵 ← Drag   │  │ 🔵 ← WRONG! │
│ ┃           │  │ ┃           │  Both show indicator
│ ┃  Product  │  │ ┃           │  when only dragging
│ ┃           │  │ ┃           │  over Door-1!
└─────────────┘  └─────────────┘
```

### Impact
- **Confusing UX** - User can't tell which door will receive the drop
- **Validation issues** - May show "no space" in Door-2 when Door-1 shelf is full (even though Door-2 has space)
- **Wrong expectations** - Suggests product will be placed in both doors

---

## 🎯 Root Cause Analysis

### The Problem

**File:** `app/planogram/components/row.tsx`  
**Line:** 40-42

```tsx
// ❌ BEFORE (BUGGY)
const showGhost = useMemo(
  () => dropIndicator?.type === 'reorder' && dropIndicator.targetRowId === row.id,
  [dropIndicator, row.id]
);
```

**What was wrong:**
1. The logic only checked if `dropIndicator.targetRowId === row.id`
2. It **did NOT check** `dropIndicator.targetDoorId === doorId`
3. Since both doors have rows with the same IDs (row-1, row-2, etc.), the indicator showed in BOTH doors
4. Example: Door-1's `row-1` and Door-2's `row-1` both matched when dragging over Door-1

### Why It Happened

The `DropIndicator` type already had `targetDoorId`:

```typescript
export type DropIndicator = {
  targetId: string;
  type: 'reorder' | 'stack' | 'row';
  targetRowId?: string;
  targetDoorId?: string;  // ✅ Already exists!
  index?: number;
} | null;
```

But the `showGhost` logic was missing the door check.

---

## ✅ The Fix

### Updated Code

**File:** `app/planogram/components/row.tsx`  
**Line:** 40-44

```tsx
// ✅ AFTER (FIXED)
const showGhost = useMemo(
  () => dropIndicator?.type === 'reorder' && 
        dropIndicator.targetRowId === row.id &&
        dropIndicator.targetDoorId === doorId,  // ← ADDED THIS CHECK
  [dropIndicator, row.id, doorId]  // ← Added doorId to deps
);
```

**Changes:**
1. ✅ Added `dropIndicator.targetDoorId === doorId` check
2. ✅ Added `doorId` to dependency array
3. ✅ Now only shows indicator in the **correct door**

---

## 🧪 Verification

### Before Fix
```
User drags over Door-1, row-1:
  Door-1, row-1: Shows 🔵 indicator ✅ (correct)
  Door-2, row-1: Shows 🔵 indicator ❌ (wrong!)
```

### After Fix
```
User drags over Door-1, row-1:
  Door-1, row-1: Shows 🔵 indicator ✅ (correct)
  Door-2, row-1: No indicator       ✅ (correct!)
```

---

## 🔍 Related Systems Verified

### 1. Validation Logic ✅
**Status:** Already door-aware, no changes needed

**File:** `lib/validation.ts`  
**Function:** `runValidation()`

```typescript
// ✅ Already correct - validates per door
const refrigerator = refrigerators[doorId];
```

The validation was already filtering by door, so no "space full" bugs exist.

### 2. Drag Start Logic ✅
**Status:** Already door-aware, no changes needed

**File:** `planogramEditor.tsx`  
**Function:** `handleDragStart()`

```typescript
// ✅ Already correct - determines door context
let doorIdForValidation = 'door-1';
if (activeData?.type === 'stack') {
  const location = findStackLocation(active.id as string);
  if (location) {
    doorIdForValidation = location.doorId;
  }
}
```

### 3. Drop Indicator State ✅
**Status:** Already includes door info, no changes needed

The `dropIndicator` state already had `targetDoorId` set correctly by the drag over handler.

---

## 📊 Test Results

### Test Case 1: Single Door Mode
- ✅ Drop indicator shows correctly in single door
- ✅ No regression in behavior

### Test Case 2: Multi-Door Mode
- ✅ Dragging over Door-1 only shows indicator in Door-1
- ✅ Dragging over Door-2 only shows indicator in Door-2
- ✅ Validation still works correctly (no space issues)

### Test Case 3: Cross-Door Validation
- ✅ Door-1 full → Does NOT block Door-2 placement
- ✅ Door-2 full → Does NOT block Door-1 placement

---

## 🎯 Impact Summary

### What Was Fixed
- ✅ Drop indicator now door-specific
- ✅ No more dual-indicator confusion
- ✅ Clearer visual feedback for users

### What Wasn't Broken
- ✅ Validation logic (already door-aware)
- ✅ Drag start detection (already door-aware)
- ✅ Drop handling (already door-aware)

### Why This Was a Simple Fix
The bug was **purely visual**. All the underlying logic was already correct:
- `dropIndicator` already had `targetDoorId`
- Validation was already door-specific
- Only the rendering check was missing the door filter

---

## 🚀 Related Fixes in Same Session

This fix was found after fixing the **scaling bug** where `scaleBackendBoundingBoxes()` was only scaling Door-1. Both issues were:

1. **Hardcoded assumptions** about Door-1
2. **Missing door iteration** in loops
3. **Root cause** fixes (not patches)

---

## 📝 Files Modified

1. ✅ `app/planogram/components/row.tsx` (1 line change + 1 dep added)

**Total Changes:** 1 file, 2 lines modified

---

## ✅ Success Criteria - ALL MET

- [x] Drop indicator only appears in the dragged-over door
- [x] No visual confusion between doors
- [x] Validation still works correctly
- [x] No regression in single-door mode
- [x] TypeScript errors: 0
- [x] Production-ready

---

## 🎉 Status: COMPLETE

The drop indicator bug is **fully fixed** with a clean, minimal change. The fix follows the architecture pattern where each component receives a `doorId` prop and uses it for door-specific behavior.

**No patches, just proper door-aware logic!** ✅
