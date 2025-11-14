# Drag & Drop Issue Fix - Door ID Not Being Passed

## Problem
Products were not dropping into rows because the `doorId` was not being passed correctly to the store actions.

## Root Cause
In `lib/store.ts`, line 463 had a bug:
```typescript
// ❌ WRONG - findStackLocation expects item ID, not row ID
const finalDoorId = doorId || findStackLocation(targetRowId)?.doorId || 'door-1';
```

This was trying to find a stack location using the `targetRowId` (like "row-1"), but `findStackLocation` expects an **item ID**. This would always return null, falling back to 'door-1'.

## Fix Applied

### 1. Fixed Store Action (lib/store.ts)
**Before**:
```typescript
const { findStackLocation, actions } = get();
const finalDoorId = doorId || findStackLocation(targetRowId)?.doorId || 'door-1';
```

**After**:
```typescript
const { actions } = get();
const finalDoorId = doorId || 'door-1';
```

**Reason**: We should trust the `doorId` parameter passed from the UI. If not provided, default to 'door-1'.

### 2. Added Debug Logging
Added console.log statements in:
- `handleDragOver` (planogramEditor.tsx) - To see what doorId is extracted
- `addItemFromSku` (store.ts) - Already had logging

## How to Test

1. **Start the app**: `npm run dev`
2. **Open browser console** (F12)
3. **Switch to multi-door layout**: Select "G-26c Double Door Cooler"
4. **Drag a SKU to Door 1**: Watch console logs
5. **Drag a SKU to Door 2**: Watch console logs

### Expected Console Output

When dragging over a row:
```
🎯 DragOver ROW: {
  overType: 'row',
  overDoorId: 'door-1',  // ← Should show correct door
  overRowId: 'row-1',
  stackIndex: 0,
  overData: { type: 'row', rowId: 'row-1', doorId: 'door-1', ... }
}

✅ Drop indicator set: {
  type: 'reorder',
  targetDoorId: 'door-1',  // ← Should match
  targetRowId: 'row-1',
  ...
}
```

When dropping:
```
🔍 DROP DEBUG: { ... }
✅ Adding item from SKU
🔧 addItemFromSku called: {
  sku: 'coke-can',
  targetRowId: 'row-1',
  targetStackIndex: 0,
  doorId: 'door-1',  // ← Should be correct
  finalDoorId: 'door-1'
}
📦 Current fridge data: { ... }
✅ Item added, updating store: { ... }
```

## What Should Work Now

### Single-Door Layouts
- ✅ Drag SKU to any row
- ✅ Item appears in correct row
- ✅ No change in behavior

### Multi-Door Layouts (g-26c-double)
- ✅ Drag SKU to Door 1, Row 1 → Item appears in Door 1
- ✅ Drag SKU to Door 2, Row 1 → Item appears in Door 2
- ✅ Items stay in their respective doors
- ✅ No cross-contamination

## Verification Steps

1. **Test Door 1**:
   - Drag "Coke Can" to Door 1, Row 1
   - Check if it appears in Door 1
   - Check console: `finalDoorId` should be `'door-1'`

2. **Test Door 2**:
   - Drag "Pepsi Can" to Door 2, Row 1
   - Check if it appears in Door 2
   - Check console: `finalDoorId` should be `'door-2'`

3. **Test Multiple Items**:
   - Add 2-3 items to Door 1
   - Add 2-3 items to Door 2
   - Verify they stay separate

4. **Check Backend State Preview**:
   - Scroll down to see backend preview
   - Should show items from both doors
   - X-coordinates should reflect door positions

## If It Still Doesn't Work

### Check 1: Is doorId being passed?
Look for this console log when dropping:
```
🔧 addItemFromSku called: { ..., doorId: ?, ... }
```
- If `doorId: undefined` → Problem is in `handleDragEnd`
- If `doorId: 'door-1'` but wrong → Problem is in `handleDragOver`

### Check 2: Is the row data correct?
Look for this console log:
```
📦 Current fridge data: { doorId: ?, hasRow: ?, rowKeys: [...] }
```
- If `hasRow: false` → Row doesn't exist in that door
- Check `rowKeys` array to see available rows

### Check 3: Are there validation errors?
Look for:
```
❌ Target row not found!
```
This means the row doesn't exist in the target door's data structure.

## Next Steps After Verification

If this fix works:
1. ✅ **Step 8 Complete**: Drag & drop works for multi-door
2. **Step 9**: Test move operations between doors
3. **Step 10**: Test undo/redo with multi-door
4. **Step 11**: Test localStorage persistence
5. **Step 12**: Verify backend export

If this fix doesn't work:
- Share the console logs
- We'll debug further based on the output

## Files Modified

1. `lib/store.ts` - Fixed `addItemFromSku` doorId logic
2. `app/planogram/components/planogramEditor.tsx` - Added debug logging

---

**Status**: Fix applied, ready for testing! 🚀

Try dragging items now and check the console output. Let me know what you see!
