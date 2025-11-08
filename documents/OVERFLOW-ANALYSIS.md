# 🔍 Overflow Analysis

## Problem
Items are visually overflowing the refrigerator container even though the math suggests they should fit.

## Root Causes Identified

### 1. **Ring Offset on Selected Items** ⚠️ PRIMARY CAUSE
```tsx
// In item.tsx line 32
'ring-offset-2 ring-offset-gray-800': isSelected
```
- `ring-offset-2` = **8px offset** (4px on each side)
- When an item is selected, it adds **8px extra width** visually
- This pushes content outside the container!

### 2. **Row Border** (Minor)
```tsx
// In row.tsx line 57
"border"  // Adds 1px border on all sides
```
- With default box-model, border is counted in the width
- Reduces available space by 2px (left + right)

### 3. **Gap Between Stacks**
```tsx
// In row.tsx line 83
"gap-px"  // 1px gap between each stack
```
- 7 stacks = 6 gaps = **6px total**
- This is NOT accounted for in capacity calculations!

## Current Math

```
Row 4 Capacity: 1908px (673mm × 2.834645669)

Items width:
- Mountain Dew #1: 156px
- Mountain Dew #2: 156px
- Pepsi #1: 213px
- Pepsi #2: 213px
- Pepsi #3: 213px
- Pepsi #4: 213px
- Blank Space: 726px (256mm)
─────────────────────
Total: 1890px

Overhead:
- Gap between stacks: 6px (7 stacks - 1)
- Row border (counted in box): 2px
─────────────────────
Total with overhead: 1898px

Available after border: 1906px (1908 - 2)
Margin: +8px ✅ Fits!

BUT... when an item is selected:
+ Ring offset: 8px
─────────────────────
Effective width: 1906px
OVERFLOW: 0px to 8px (depending on which item is selected)
```

## Solutions

### Option 1: Remove Ring Offset (Recommended)
Remove the `ring-offset-2` from selected items and just use the ring.

### Option 2: Account for Gap in Capacity
Subtract gap space from capacity calculations:
```typescript
const effectiveCapacity = row.capacity - (row.stacks.length - 1);
```

### Option 3: Use box-sizing: border-box
Ensure borders don't eat into content space.

### Option 4: Add Padding to Container
Give rows slight padding so overflow doesn't escape visually.

## Recommendation
**Implement Option 1 + Option 2**:
1. Remove `ring-offset-2` from item selection styles
2. Account for gaps in capacity validation
