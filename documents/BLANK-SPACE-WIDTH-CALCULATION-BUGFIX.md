# Blank Space Width Calculation Bug Fix

## Date
November 10, 2025

## Critical Bug Discovery

### Problem Statement
After fixing the slider to show the correct max value (540mm) and making it slide to that value, the **blank space visual width was not updating** in the planogram. The slider would move to 540mm, but the blank space remained at 408mm visually.

### Root Cause Analysis

**The Issue**: The `updateBlankWidth` function in `lib/store.ts` had TWO critical bugs in the available width calculation:

#### Bug #1: Counting All Items Instead of Bottom Items Only
```typescript
// BEFORE (BUGGY) - Line 495-499
const usedWidth = row.stacks.reduce((sum, stack) => {
  return sum + stack.reduce((s, stackItem) => 
    stackItem.id === itemId ? 0 : s + stackItem.width, 0  // ❌ Counts ALL items in stack
  );
}, 0);
```

**The Problem:**
- This code was summing the widths of **ALL items in every stack**
- But stacked items (items at index > 0) don't take horizontal space!
- Only the bottom item (index 0) of each stack takes up row width
- Example: A stack of 2 Pepsi cans (26px each) was counted as 52px, but should be 26px

#### Bug #2: Wrong Gap Calculation
```typescript
// BEFORE (BUGGY) - Line 502
const gapWidth = Math.max(0, row.stacks.length - 1);  // ❌ Counts gaps for ALL stacks
```

**The Problem:**
- This calculated gaps between ALL stacks including the selected item's stack
- But when calculating available space for the selected item, we need gaps between the OTHER stacks only
- Example: 3 stacks total → calculated 2 gaps, but should be 1 gap (between the other 2 stacks)

### Visual Example of the Bug

```
Row Capacity: 269px (675mm)
Stacks:
  Stack 1: [Pepsi, Pepsi] (2 stacked items, 26px each)
  Stack 2: [Pepsi, Pepsi] (2 stacked items, 26px each)
  Stack 3: [Blank Space] (163px) - SELECTED

BUGGY CALCULATION:
  Used Width = (26 + 26) + (26 + 26) = 104px  ❌ Counted all 4 items!
  Gaps = 3 - 1 = 2px                           ❌ Counted gaps for all stacks
  Available = 269 - 104 - 2 = 163px            ❌ WRONG! Item already at max!
  
CORRECT CALCULATION:
  Used Width = 26 + 26 = 52px                  ✅ Only bottom items of other stacks
  Gaps = 2 - 1 = 1px                           ✅ Only gaps between other stacks
  Available = 269 - 52 - 1 = 216px             ✅ CORRECT! Can expand to 540mm!
```

### Why This Broke the Visual Update

1. User drags slider to 540mm
2. `handleSliderChange` calls `onWidthChange(itemId, 540)`
3. `updateBlankWidth` runs with `newWidthMM = 540`
4. **Bug**: Calculates `availableWidth = 163px` (WRONG!)
5. Converts 540mm to pixels: `540 * 0.4 = 216px`
6. Clamps to max: `Math.min(216, 163) = 163px` ❌
7. Checks if changed: `163 === 163` → No change, returns early!
8. Visual width stays at 408mm (163px)

**The killer**: The early return at line 518 prevented any visual update because the buggy calculation made it think the item was already at max width!

```typescript
// Line 517-520
if (clampedWidth === item.width) {
  return state;  // ❌ Early return prevented visual update!
}
```

## Solution Implementation

### Fixed Available Width Calculation

```typescript
// AFTER (FIXED)
const row = state.refrigerator[location.rowId];

// CRITICAL FIX: Only count the bottom (first) item of each stack
// Stacked items (index > 0) don't take horizontal space
const usedWidth = row.stacks.reduce((sum, stack) => {
  // Only count the first item (bottom of stack)
  const bottomItem = stack[0];
  if (!bottomItem) return sum;
  
  // If this is the selected item's stack, don't count it
  if (stack.some(stackItem => stackItem.id === itemId)) {
    return sum;
  }
  
  // Add the bottom item's width (stacked items don't take horizontal space)
  return sum + bottomItem.width;
}, 0);

// CRITICAL FIX: Account for 1px gaps between OTHER stacks (excluding the selected one)
// We need to count gaps between OTHER stacks (excluding the selected one)
// Example: If there are 3 total stacks and we're editing one:
//   - Other stacks: 2
//   - Gaps between other stacks: 2 - 1 = 1px
const otherStacksCount = row.stacks.filter(stack => !stack.some(stackItem => stackItem.id === itemId)).length;
const gapWidth = otherStacksCount > 1 ? otherStacksCount - 1 : 0;

const availableWidth = row.capacity - usedWidth - gapWidth;
```

### Now the Flow Works Correctly

1. User drags slider to 540mm
2. `handleSliderChange` calls `onWidthChange(itemId, 540)`
3. `updateBlankWidth` runs with `newWidthMM = 540`
4. **Fixed**: Calculates `availableWidth = 216px` ✅
5. Converts 540mm to pixels: `540 * 0.4 = 216px`
6. Clamps to max: `Math.min(216, 216) = 216px` ✅
7. Checks if changed: `216 !== 163` → Update!
8. Updates item width and commits to history
9. Visual width expands to 540mm (216px) ✅

## Code Changes

### File Modified
- `lib/store.ts` - `updateBlankWidth()` function (lines 477-530)

### Key Changes
1. **Only count bottom items**: Changed from counting all items in stack to only the first (bottom) item
2. **Filter selected stack**: Explicitly check if stack contains the selected item
3. **Correct gap calculation**: Count gaps between OTHER stacks only, excluding the selected item's stack
4. **Added detailed comments**: Explain the logic with examples

## Testing Checklist

### ✅ Functional Tests
- [x] Slider goes to full max value (540mm)
- [x] Visual width expands to match slider value
- [x] Progress bar shows correct percentage
- [x] Input field updates correctly
- [x] Item width in planogram matches slider value
- [x] Bounding boxes update correctly
- [x] Can shrink back down from max
- [x] Undo/redo works correctly

### ✅ Edge Cases
- [x] Single stack (no gaps)
- [x] Two stacks (1 gap)
- [x] Three stacks (2 gaps → 1 gap when excluding selected)
- [x] Stacked items don't inflate used width
- [x] Mixed stacks (some with multiple items, some single)

### ✅ Consistency Tests
- [x] PropertiesPanel shows same max as store calculation
- [x] InfoPanel shows same max as store calculation
- [x] Both use identical calculation logic

## Related Issues Fixed

This fix addresses the same bug pattern that was previously fixed in:
1. **PropertiesPanel.tsx** - Blank space width calculator (lines 30-60)
2. **Now**: **store.ts** - `updateBlankWidth()` action

Both places now use the same correct calculation:
- ✅ Only count bottom items of stacks
- ✅ Only count gaps between OTHER stacks
- ✅ Exclude the selected item's stack from calculations

## Performance Impact
- ✅ No performance degradation
- ✅ Calculation is still O(n) where n = number of stacks
- ✅ No extra loops or iterations

## Before vs After

### Before (BROKEN)
```
1. Slider shows max: 540mm ✅
2. Slider slides to: 540mm ✅
3. Visual width updates: NO ❌ (stuck at 408mm)
4. Store value updates: NO ❌ (stays 163px)
```

### After (FIXED)
```
1. Slider shows max: 540mm ✅
2. Slider slides to: 540mm ✅
3. Visual width updates: YES ✅ (expands to 540mm)
4. Store value updates: YES ✅ (updates to 216px)
```

## Why Both Fixes Were Needed

### Fix #1: PropertiesPanel Calculation
- **What it fixed**: Display of correct max value in the UI
- **What it didn't fix**: Actual width update when slider moved
- **Why**: PropertiesPanel only calculates for display, doesn't update the store

### Fix #2: Store updateBlankWidth
- **What it fixes**: Actual width update when slider moves
- **Why it matters**: This is the function that writes to the store
- **Result**: Visual width now updates to match slider position

Both fixes were necessary because they handle different parts of the flow:
1. **PropertiesPanel**: Display layer (read-only)
2. **Store Action**: Data layer (read-write)

## Lessons Learned

### 1. Consistency is Critical
When the same calculation exists in multiple places:
- ✅ Use the same logic everywhere
- ✅ Document the calculation pattern
- ✅ Consider extracting to a shared utility function

### 2. Test the Full Flow
- ✅ Don't just test UI calculations
- ✅ Test that UI changes actually persist to store
- ✅ Verify visual updates reflect store changes

### 3. Early Returns Can Hide Bugs
The early return at line 518 masked the bug because:
- Bad calculation made it think item was at max
- Early return prevented update
- User saw no visual feedback
- Bug looked like a UI issue, but was a calculation bug

## Future Recommendations

### Extract Shared Calculation
Consider creating a utility function:

```typescript
// lib/planogram-utils.ts
export function calculateAvailableWidth(
  row: Row,
  selectedItemId: string
): number {
  // Only count the bottom item of each stack
  const usedWidth = row.stacks.reduce((sum, stack) => {
    const bottomItem = stack[0];
    if (!bottomItem) return sum;
    if (stack.some(item => item.id === selectedItemId)) return sum;
    return sum + bottomItem.width;
  }, 0);
  
  // Count gaps between other stacks
  const otherStacksCount = row.stacks.filter(
    stack => !stack.some(item => item.id === selectedItemId)
  ).length;
  const gapWidth = otherStacksCount > 1 ? otherStacksCount - 1 : 0;
  
  return row.capacity - usedWidth - gapWidth;
}
```

Then use it in both places:
- `PropertiesPanel.tsx` - for display
- `store.ts` - for updates

### Add Unit Tests
Create tests for edge cases:
- Empty stacks
- Single item stacks
- Multi-item stacks
- Mixed configurations

---

**Status**: ✅ Complete and Verified
**Tested**: November 10, 2025
**Impact**: CRITICAL - Blank space width adjustment now works end-to-end
