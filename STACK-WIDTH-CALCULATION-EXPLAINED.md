# 🏗️ Stack Width Calculation - How It Works

## Key Concept: Stacked Items Share Horizontal Space

When items are **stacked vertically**, they **share the same width footprint** on the shelf. We only count the stack's width **once**, not the sum of all items.

## Visual Example

```
Row Capacity: 100px

WRONG ❌ (Adding all widths):
Stack 1: [30px item on 30px item] = 60px
Stack 2: [20px item] = 20px
Total = 60 + 20 = 80px (INCORRECT!)

CORRECT ✅ (Stack shares width):
Stack 1: [30px wide] (2 items stacked vertically)
Stack 2: [20px wide] (1 item)
Total = 30 + 20 = 50px (CORRECT!)
```

## How It Works in Code

### 1. Width Calculation (validation.ts)
```typescript
// For each stack, only count the FIRST item's width
const totalWidth = row.stacks.reduce((sum, stack) => {
  return sum + (stack[0]?.width || 0);  // Only stack[0].width!
}, 0);
```

### 2. Gap Calculation
```typescript
// Gaps are 1px between stacks
const gapWidth = Math.max(0, row.stacks.length - 1);

// Example: 5 stacks = 4 gaps
// [Stack] gap [Stack] gap [Stack] gap [Stack] gap [Stack]
```

### 3. Total Width
```typescript
const totalWidthWithGaps = totalWidth + gapWidth;
const isOverflowing = totalWidthWithGaps > row.capacity;
```

## Real Example from Your Data

### Row-1 Analysis:
```
Capacity: 337px

Stacks:
1. Pepsi (33px) + Tropicana stacked = 33px footprint
2. Pepsi (33px) + Tropicana stacked = 33px footprint
3. Pepsi (33px) alone = 33px footprint
4. Tropicana (20px) alone = 20px footprint
5. Tropicana (20px) alone = 20px footprint
... (12 more Tropicana stacks)

Total width calculation:
- 3 Pepsi stacks × 33px = 99px
- 12 Tropicana stacks × 20px = 240px
- Total item width = 339px
- Gaps (15 stacks - 1) = 14px
- Total with gaps = 339 + 14 = 353px
- Capacity = 337px
- OVERFLOWING by 16px ❌
```

## Stack Display Order (Pyramid)

### Current Fix:
```typescript
// In stackItem() - store.ts
// Sort ASCENDING (narrowest first)
stack.sort((a, b) => a.width - b.width);

// Result in array:
[Narrow(20px), Medium(30px), Wide(40px)]

// With flex-col-reverse in stack.tsx:
Visual display:
  ╔═══════╗  ← Wide (40px) - BOTTOM
  ╔═════╗    ← Medium (30px) - MIDDLE
  ╔═══╗      ← Narrow (20px) - TOP
```

### Why flex-col-reverse?

Flexbox normally stacks **top to bottom**:
```
flex-col: array[0] → array[1] → array[2]
          (top)      (middle)    (bottom)
```

`flex-col-reverse` **reverses** the visual order:
```
flex-col-reverse: array[2] → array[1] → array[0]
                  (top)      (middle)    (bottom)
```

So with **ascending sort** + **flex-col-reverse**:
- Array: `[Narrow, Medium, Wide]`
- Visual: Wide (bottom) → Medium → Narrow (top) ✅ Perfect pyramid!

## Summary

✅ **Width Calculation**: Only count `stack[0].width` (first item's width)
✅ **Gap Calculation**: `stacks.length - 1` (gaps between stacks)
✅ **Stack Display**: Sort ascending + flex-col-reverse = pyramid shape
✅ **Validation**: Works correctly when checking capacity overflow

No more calculation mistakes! 🎉
