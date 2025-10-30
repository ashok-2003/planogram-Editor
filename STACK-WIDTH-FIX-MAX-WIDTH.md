# ✅ Stack Width Fix - Use Maximum Width

## The Problem You Found

When items are stacked, the code was using `stack[0].width` (first item's width), but this is **WRONG** if the items have different widths!

### Example from Your JSON:
```
Stack 1: [Tropicana(20px), Pepsi(33px)]
Stack 3: [Tropicana(20px), Pepsi(33px)]

Old logic: stack[0].width = 20px ❌ (takes Tropicana)
Correct:   Math.max(20, 33) = 33px ✅ (takes widest - Pepsi)
```

## The Fix

### Created Helper Function:
```typescript
/**
 * Get the width footprint of a stack.
 * For stacked items, we need the WIDEST item's width (max), not the first item.
 */
const getStackWidth = (stack: Item[]): number => {
  if (stack.length === 0) return 0;
  return Math.max(...stack.map(item => item.width));
};
```

### Updated All Width Calculations:

#### 1. store.ts - duplicateAndAddNew()
**Before:**
```typescript
const currentWidth = row.stacks.reduce((acc, s) => acc + (s[0]?.width || 0), 0);
```

**After:**
```typescript
const currentWidth = row.stacks.reduce((acc, s) => acc + getStackWidth(s), 0);
```

#### 2. store.ts - replaceSelectedItem()
**Before:**
```typescript
const currentWidth = row.stacks.reduce((acc, s) => acc + (s[0]?.width || 0), 0);
```

**After:**
```typescript
const currentWidth = row.stacks.reduce((acc, s) => acc + getStackWidth(s), 0);
```

#### 3. validation.ts - runValidation()
**Before:**
```typescript
const currentWidth = row.stacks.reduce((sum, stack) => sum + (stack[0]?.width || 0), 0);
```

**After:**
```typescript
const getStackWidth = (stack: Item[]) => stack.length === 0 ? 0 : Math.max(...stack.map(item => item.width));
const currentWidth = row.stacks.reduce((sum, stack) => sum + getStackWidth(stack), 0);
```

## Correct Calculation for Your JSON

Now the width calculation will be:

```
Row-1 Stacks:
Stack 1:  [Tropicana(20), Pepsi(33)]  → Width: 33px ✅ (max)
Stack 2:  [Pepsi(33)]                  → Width: 33px ✅
Stack 3:  [Tropicana(20), Pepsi(33)]  → Width: 33px ✅ (max)
Stacks 4-15: 12 × 20px = 240px

Total width = 33 + 33 + 33 + 240 = 339px
Gaps (15 - 1) = 14px
Total with gaps = 339 + 14 = 353px
Capacity = 337px

❌ OVERFLOWING by 16px! (CORRECT!)
```

## Why This Matters

### Physical Reality:
When you stack items vertically, the shelf needs to be **as wide as the widest item** in the stack, not the first item.

```
Visual (side view):
  ╔═══╗         ← 20px Tropicana
  ╔═════════╗   ← 33px Pepsi
  
The shelf must be 33px wide to hold this stack!
```

### Before This Fix:
- Code thought stack needed only 20px (wrong!)
- Allowed overfilling the row
- Visual display didn't match calculations

### After This Fix:
- Code correctly calculates 33px needed
- Prevents overfilling
- Calculations match visual reality ✅

## No More Display Order Issues

The **auto-sort** fix (ascending order) handles the **visual display** (pyramid shape).

This **max width** fix handles the **horizontal space calculation** (capacity).

Both fixes work together:
1. **Auto-sort**: Ensures pyramid shape (narrow on top)
2. **Max width**: Ensures correct capacity calculation

## Testing

With your JSON data:
1. ✅ Row-1 will correctly show as overflowing (353px > 337px)
2. ✅ Width calculations will match visual reality
3. ✅ Cannot add more items when truly full
4. ✅ Stack width is always the widest item

Perfect! 🎯
