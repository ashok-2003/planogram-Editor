# 🔧 Dynamic Shelf Height Issue - Analysis & Fix

## Problem
All shelves are rendering with equal heights even though the data specifies different heights:
- Row 1: 500mm (should be taller)
- Row 2: 327mm
- Row 3: 327mm  
- Row 4: 327mm

## Root Cause

### Issue 1: Using `minHeight` instead of `height`
```tsx
// In row.tsx line 83
style={{ minHeight: `${row.maxHeight}px`}}
```
- `minHeight` only sets a minimum, CSS flexbox distributes remaining space equally
- Should use `height` to enforce exact height

### Issue 2: Refrigerator container using flexbox distribution
```tsx
// In Refrigerator.tsx line 38
<div className="space-y-0 flex flex-col items-center bg-white"
  style={{
    width: `${dimensions.width}px`,
    height: `${dimensions.height}px`
  }}
>
```
- Fixed container height + `flex flex-col` causes equal distribution
- Should let rows determine their own heights naturally

### Issue 3: Fixed refrigerator height
```tsx
// In planogram-data.ts
height: Math.round((1308+20) * PIXELS_PER_MM)
```
- Fixed total height doesn't match sum of individual row heights
- Should calculate dynamically from row heights OR remove fixed constraint

## Current Data
```typescript
'g-26c': {
  height: Math.round((1308+20) * PIXELS_PER_MM), // 3762px total
  layout: {
    'row-1': { maxHeight: Math.round(500 * PIXELS_PER_MM) },  // 1417px
    'row-2': { maxHeight: Math.round(327 * PIXELS_PER_MM) },  // 927px
    'row-3': { maxHeight: Math.round(327 * PIXELS_PER_MM) },  // 927px
    'row-4': { maxHeight: Math.round(327 * PIXELS_PER_MM) },  // 927px
  }
}

Sum of rows: 1417 + 927 + 927 + 927 = 4198px
Specified total: 3762px
MISMATCH: 436px difference! ⚠️
```

## Solution Strategy

### Option A: Dynamic Height (Recommended) ✅
Let refrigerator height be determined by sum of row heights:
```tsx
const totalHeight = Object.values(refrigerator)
  .reduce((sum, row) => sum + row.maxHeight, 0);
```

### Option B: Fixed Height with Proportional Scaling
Scale rows proportionally to fit fixed height (like real adjustable shelves)

### Option C: Overflow/Scroll
Allow rows to overflow if total > container height

## Recommendation
**Implement Option A** - Most flexible and adaptive for future changes!

## Additional Enhancements
1. Add visual height indicators/rulers
2. Store height in both pixels and MM for accuracy
3. Add validation: ensure sum of rows ≤ refrigerator capacity
4. Make rows resizable in the UI (future feature)
