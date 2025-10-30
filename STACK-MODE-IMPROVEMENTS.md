# Stack Mode - Deep Analysis & Improvement Plan

## Current Issues Identified

### 🔴 **CRITICAL ISSUE #1: No "Stack on Drop" Behavior**
**Problem:** When dragging a product directly onto another product, it doesn't automatically stack - it just appends to the row as a new stack.

**Current Behavior:**
- User drags Product A onto Product B (both stackable)
- Expected: Product A stacks on top of Product B
- Actual: Product A creates a new stack next to Product B

**Root Cause:**
In `planogramEditor.tsx` `handleDragOver()` and `handleDragEnd()`:
- Stacking is ONLY checked in "stack mode" 
- In "reorder mode" (default), the system treats all drops as "reorder" operations
- User has to manually switch to "Stack Mode" to enable stacking

**Code Location:**
```typescript
// planogramEditor.tsx, line ~435
if (activeType === 'sku' || interactionMode === 'reorder') {
  // Always treats as reorder, never checks for stacking opportunity
  // ...sets dropIndicator to 'reorder' type
}

if (interactionMode === 'stack') {
  // ONLY checks stacking when in Stack Mode
  const isStackingPossible = dragValidation?.validStackTargetIds.has(overId);
  if (isStackingPossible && overType === 'stack' && activeId !== overId) {
    setDropIndicator({ type: 'stack', targetId: overId });
    return;
  }
}
```

---

### 🟡 **ISSUE #2: Mode Confusion**
**Problem:** Users don't understand when to use "Re-Order Mode" vs "Stack Mode"

**Current Logic:**
- **Re-Order Mode:** Move stacks around, add new products from palette
- **Stack Mode:** Only stack items on top of each other (can't add from palette or reorder)

**User Experience Issues:**
1. User tries to stack in Re-Order Mode → Nothing happens, product appends instead
2. User tries to add product from palette in Stack Mode → Gets error prompt
3. User has to constantly switch modes for different operations
4. No visual feedback about WHY a drop didn't work as expected

---

### 🟡 **ISSUE #3: Limited Stacking Intelligence**
**Problem:** System doesn't automatically detect best stacking opportunities

**Missing Features:**
1. **No "Smart Stack Detection"**: When hovering over a valid stack target, no highlight or indication
2. **No "Auto-Stack Preference"**: If item can stack OR be placed as new stack, no intelligent choice
3. **No "Stack vs New Stack" Toggle**: User can't choose behavior for ambiguous situations
4. **No Visual Feedback**: Doesn't show if hovering item COULD stack but won't due to mode

---

### 🟡 **ISSUE #4: Incomplete Drag Feedback**
**Problem:** Limited visual feedback during drag operations

**Current Feedback:**
- ✅ Green ring on valid rows
- ✅ Blue glow on valid stack targets (Stack Mode only)
- ❌ No indication of "stackable" vs "non-stackable" zones
- ❌ No height/capacity warnings before drop
- ❌ No snap-to preview showing final position

---

### 🟡 **ISSUE #5: No Direct Palette Stacking**
**Problem:** Can't drag from SKU palette directly onto existing stack

**Current Behavior:**
- Drag from palette → Can only add as new stack to row
- To stack: Must first add to row, then switch to Stack Mode, then drag onto target

**Desired Behavior:**
- Drag from palette directly onto stack → Should offer to stack if valid

---

## Proposed Improvements

### 🎯 **SOLUTION 1: Intelligent Auto-Stack Detection** (HIGH PRIORITY)

**Concept:** Automatically detect when user drags over a stackable target and prioritize stacking

**Implementation:**
```typescript
// In handleDragOver()
const handleDragOver = (event: DragOverEvent) => {
  const { active, over } = event;
  if (!over) { setDropIndicator(null); return; }

  const overId = over.id as string;
  const overType = over.data.current?.type;
  
  // PRIORITY 1: Check if hovering over a valid stack target (regardless of mode)
  if (overType === 'stack') {
    const isStackingPossible = dragValidation?.validStackTargetIds.has(overId);
    
    if (isStackingPossible && isSingleItemStackable) {
      // SMART: Automatically suggest stacking if item can stack
      setDropIndicator({ type: 'stack', targetId: overId });
      return; // Exit early - stacking takes priority
    }
  }
  
  // PRIORITY 2: Fall back to reorder/placement
  if (overType === 'row') {
    // ... existing reorder logic
  }
};
```

**Benefits:**
- ✅ Works in any mode
- ✅ Intuitive - drag on top = stack
- ✅ Falls back to reorder if not stackable
- ✅ No mode switching needed

---

### 🎯 **SOLUTION 2: Enhanced Visual Feedback** (HIGH PRIORITY)

**A. Stack Hover Preview**
```tsx
// When hovering over stackable target, show preview
<div className="absolute -top-2 left-0 right-0">
  <div className="bg-green-500/20 border-2 border-green-500 rounded-md p-1 text-xs text-center">
    Will stack here ({remainingHeight}mm space)
  </div>
</div>
```

**B. Capacity Warnings**
```tsx
// Show warning when hovering over stack that's almost full
{stackHeight + draggedHeight > maxHeight * 0.9 && (
  <div className="absolute -top-2 left-0 right-0">
    <div className="bg-yellow-500/20 border-2 border-yellow-500 rounded-md p-1 text-xs">
      ⚠️ Nearly full ({remainingHeight}mm left)
    </div>
  </div>
)}
```

**C. Invalid Drop Feedback**
```tsx
// Show WHY drop is invalid
{isOver && !isValidDrop && (
  <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
    <span className="text-red-700 text-sm font-bold">
      {invalidReason} {/* e.g., "Too tall", "Wrong product type", "Not stackable" */}
    </span>
  </div>
)}
```

---

### 🎯 **SOLUTION 3: Remove/Simplify Mode System** (MEDIUM PRIORITY)

**Option A: Single "Smart Mode"**
- Remove mode toggle entirely
- System automatically detects intent based on drop target:
  - Drop ON item → Stack (if valid)
  - Drop BETWEEN items → Reorder
  - Drop from palette → Add new or stack (based on target)

**Option B: Keep Modes but Add "Auto" Mode**
- **Auto Mode** (default): Smart detection (Solution 1)
- **Stack-Only Mode**: Force stacking behavior, disable reorder
- **Reorder-Only Mode**: Force reorder, disable stacking

**Recommendation:** Go with Option A for better UX

---

### 🎯 **SOLUTION 4: Direct Palette Stacking** (MEDIUM PRIORITY)

**Allow stacking directly from SKU palette:**

```typescript
// In handleDragEnd()
if (activeType === 'sku') {
  const targetStack = findStackLocation(overId);
  
  // Check if dropped on an existing stack
  if (targetStack && dropIndicator?.type === 'stack') {
    // Stack directly from palette
    actions.addItemFromSkuAndStack(sku, targetStack.rowId, targetStack.stackIndex);
    return;
  }
  
  // Otherwise, add as new stack (existing behavior)
  if (dropIndicator?.type === 'reorder') {
    actions.addItemFromSku(sku, dropIndicator.targetRowId, dropIndicator.index);
  }
}
```

---

### 🎯 **SOLUTION 5: Stack Management Actions** (LOW PRIORITY)

**Add convenience actions:**

1. **"Split Stack"**: Break a stack into individual items
2. **"Merge Stacks"**: Combine two adjacent stacks of same SKU
3. **"Distribute Evenly"**: Auto-distribute items across row for visual balance
4. **"Fill to Top"**: Auto-stack until shelf height is maximized
5. **"Unstack One"**: Remove top item from stack

**UI Placement:**
- Right-click context menu on stacks
- Action buttons in InfoPanel when stack selected

---

### 🎯 **SOLUTION 6: Advanced Stack Validation** (LOW PRIORITY)

**Smarter rules:**

```typescript
interface StackingConstraints {
  // Existing
  stackable: boolean;
  
  // New
  maxStackHeight?: number;        // Max items in single stack
  canStackWith?: string[];        // Only stack with specific SKUs
  cannotStackWith?: string[];     // Never stack with these SKUs
  stackingPattern?: 'same-only' | 'any' | 'alternating'; // Stacking rules
  weightLimit?: number;           // Max weight per stack (for realism)
}
```

**Example Use Cases:**
- Heavy items can only be at bottom of stack
- Fragile items can't have anything on top
- Cold drinks must be stacked with cold drinks only
- Max 5 items per stack for stability

---

## Implementation Priority

### Phase 1: Critical UX Fixes (ASAP)
1. ✅ **Solution 1**: Intelligent Auto-Stack Detection
2. ✅ **Solution 2A**: Stack Hover Preview
3. ✅ **Solution 2C**: Invalid Drop Feedback

### Phase 2: Enhanced Feedback (Next Sprint)
1. ✅ **Solution 2B**: Capacity Warnings  
2. ✅ **Solution 3**: Remove/Simplify Mode System
3. ✅ **Solution 4**: Direct Palette Stacking

### Phase 3: Advanced Features (Future)
1. **Solution 5**: Stack Management Actions
2. **Solution 6**: Advanced Stack Validation

---

## Code Changes Required

### Files to Modify:
1. **`planogramEditor.tsx`**
   - ✅ Refactor `handleDragOver()` for smart stack detection
   - ✅ Update `handleDragEnd()` to support palette stacking
   - ⚠️ Optional: Remove mode toggle (if going with Single Mode)

2. **`stack.tsx`**
   - ✅ Add hover preview component
   - ✅ Add capacity warning indicator
   - ✅ Show remaining space visually

3. **`validation.ts`**
   - ✅ Add `getStackingOpportunity()` helper
   - ✅ Add `getInvalidStackReason()` for user feedback

4. **`store.ts`**
   - ✅ Add `addItemFromSkuAndStack()` action
   - ✅ Add stack management actions (Phase 3)

5. **`types.ts`**
   - ⏸️ Extend `Constraints` with advanced stacking rules (Phase 3)

---

## Testing Checklist

### Scenario 1: Basic Stacking
- [ ] Drag stackable item onto another stackable item → Should stack
- [ ] Drag non-stackable item onto stackable item → Should append as new stack
- [ ] Drag stackable item onto non-stackable item → Should append as new stack

### Scenario 2: Palette Stacking
- [ ] Drag SKU from palette directly onto stack → Should add to stack
- [ ] Drag SKU from palette onto stack (but violates height) → Should show error
- [ ] Drag SKU from palette onto invalid product type → Should show error

### Scenario 3: Visual Feedback
- [ ] Hover over valid stack target → Should show green preview
- [ ] Hover over almost-full stack → Should show yellow warning
- [ ] Hover over invalid target → Should show red error with reason

### Scenario 4: Edge Cases
- [ ] Stack height exactly at limit → Should allow one more if it fits
- [ ] Try to stack BLANK spaces → Should work
- [ ] Try to stack when rules disabled → Should bypass product type checks

---

## Success Metrics

**User Experience:**
- 📊 Reduce mode switches by 90% (users shouldn't need to switch modes)
- 📊 Increase successful stacking operations by 200% (more intuitive)
- 📊 Reduce "failed drop attempts" by 80% (better feedback)

**Performance:**
- ⚡ Keep drag operations under 16ms (60fps)
- ⚡ No noticeable lag during hover state changes

**Code Quality:**
- 🧹 Reduce complexity in `handleDragOver()` by extracting helpers
- 🧹 Add comprehensive JSDoc comments for stacking logic
- 🧹 Write unit tests for validation functions

---

## Next Steps

1. **Review & Approve** this plan with team
2. **Implement Phase 1** critical fixes
3. **User Testing** after Phase 1 completion
4. **Iterate** based on feedback
5. **Roll out Phase 2** enhancements

---

## Questions to Resolve

1. Should we keep mode system or go with single "Smart Mode"?
2. Do we need "undo stacking" as separate action or is general undo enough?
3. Should palette items show stack preview BEFORE dragging starts?
4. Do we want keyboard shortcuts for stack operations? (e.g., Shift+Drag = force reorder)
5. Should we add stack height indicator badges on all stacks?

---

**Created:** October 29, 2025  
**Status:** 📋 Pending Implementation  
**Priority:** 🔴 HIGH
