# Current Mode System Analysis

## Date: October 30, 2025

---

## 🎯 Overview

Analysis of the current **Re-Order Mode** and **Stack Mode** implementation to understand how they work before making any improvements.

---

## 📋 Current Mode System

### Two Modes Available:
1. **Re-Order Mode** (Default)
2. **Stack Mode**

### Mode Toggle Location:
- Top of the editor
- Two buttons side-by-side
- Visual indicator shows active mode

---

## 🔍 How Re-Order Mode Works

### Purpose:
- Move stacks around between positions
- Add new items from SKU palette
- Reposition existing items

### Drag Behavior:

#### **handleDragOver() Logic:**
```typescript
if (activeType === 'sku' || interactionMode === 'reorder') {
  // Calculate drop position
  if (overType === 'row') {
    overRowId = overId;
    stackIndex = over.data.current?.items?.length || 0;
  } else if (overType === 'stack') {
    const location = findStackLocation(overId);
    if (location) {
      overRowId = location.rowId;
      stackIndex = location.stackIndex;
    }
  }
  
  // Set reorder indicator
  setDropIndicator({ type: 'reorder', targetId, targetRowId, index: stackIndex });
}
```

#### **What Happens:**
1. **Dragging from palette** → Always uses reorder mode
2. **Dragging existing item** in reorder mode:
   - Hovering over **row** → Shows blue line at end of row
   - Hovering over **stack** → Shows blue line before that stack
   - Drop indicator: `type: 'reorder'`

#### **handleDragEnd() Logic:**
```typescript
if (interactionMode === 'reorder') {
  if (dropIndicator?.type === 'reorder' && dropIndicator.targetRowId) {
    // Check if drop is valid
    if (dragValidation && dragValidation.validRowIds.has(dropIndicator.targetRowId)) {
      const startLocation = findStackLocation(active.id);
      
      // Same row? Just reorder
      if (startLocation.rowId === dropIndicator.targetRowId) {
        actions.reorderStack(rowId, oldIndex, newIndex);
      } 
      // Different row? Move item
      else {
        actions.moveItem(itemId, targetRowId, targetStackIndex);
      }
    }
  }
}
```

#### **Actions:**
- **Same Row:** `reorderStack()` - Changes position within row
- **Different Row:** `moveItem()` - Moves to different row

### Visual Feedback:
- ✅ **Green ring** on valid target rows
- ✅ **Blue line** showing insertion position
- ✅ **Red overlay** on invalid rows
- ✅ **Ghost placeholder** at drop position

---

## 🔍 How Stack Mode Works

### Purpose:
- Stack items on top of each other
- Only for vertical stacking
- Cannot add from palette or reorder

### Drag Behavior:

#### **handleDragOver() Logic:**
```typescript
if (interactionMode === 'stack') {
  // Check if hovering over a valid stack target
  const isStackingPossible = dragValidation?.validStackTargetIds.has(overId);
  
  if (isStackingPossible && overType === 'stack' && activeId !== overId) {
    setDropIndicator({ type: 'stack', targetId: overId });
    return;
  }
}
```

#### **What Happens:**
1. **Only works on existing items** (can't drag from palette)
2. **Hovering over stack:**
   - If valid target → Shows blue glow
   - If invalid → No indicator
3. **Drop indicator:** `type: 'stack'`

#### **handleDragEnd() Logic:**
```typescript
if (interactionMode === 'stack') {
  if (dropIndicator?.type === 'stack') {
    // Stack the item
    actions.stackItem(draggedId, targetId);
    setInvalidModeAttempts(0);
  } 
  else if (over) {
    // Failed attempt - increment counter
    const newAttemptCount = invalidModeAttempts + 1;
    setInvalidModeAttempts(newAttemptCount);
    
    // Show prompt after 2 failed attempts
    if (newAttemptCount >= 2) {
      setShowModePrompt(true);
    }
  }
}
```

#### **Actions:**
- **Valid Stack:** `stackItem()` - Adds item to top of target stack
- **Invalid Drop:** Shows prompt suggesting to switch to Re-Order Mode

### Visual Feedback:
- ✅ **Blue glow** on valid stack targets
- ✅ **Opacity reduced** on invalid targets
- ⚠️ **Mode prompt** appears after 2 failed attempts

---

## 🔧 Validation System

### runValidation() Function:

#### **Two Separate Validations:**

**1. Re-Ordering Validation:**
```typescript
// For each row:
// - Check product type (if rules enabled)
// - Check height constraint (ALWAYS)
// - Check width capacity (ALWAYS)
// - Account for gaps between stacks

validRowIds.add(rowId); // Row is valid for placement/reorder
```

**2. Stacking Validation:**
```typescript
// Only if item is stackable:
if (isSingleItemStackable) {
  // For each stack in each row:
  // - Check product type (if rules enabled)
  // - Check if stack height + item height <= row maxHeight
  
  validStackTargetIds.add(stackId); // Stack is valid target
}
```

### Validation Results:
- `validRowIds` → Set of rows that can accept item (for reorder)
- `validStackTargetIds` → Set of stacks that can accept item (for stacking)

---

## 🎨 Visual Feedback System

### Stack Component Feedback:

**1. Valid Stack Target (Stack Mode):**
```tsx
{isStackHighlight && (
  <div className="absolute inset-0 bg-blue-400/20 rounded-lg blur-sm -z-10" />
)}
```
- Blue glow when hovering in stack mode
- Only shows if `dragValidation.validStackTargetIds` includes this stack

**2. Invalid Target (Any Mode):**
```tsx
{isVisuallyDisabled && (
  <div className="opacity-40" />
)}
```
- Reduces opacity to 40%
- Shows when parent row is invalid AND stack is not valid target

**3. Conflict Indicator:**
```tsx
{hasConflict && !isDragging && (
  <div className="ring-2 ring-red-500 ring-offset-2" />
)}
```
- Red ring around items violating rules
- Detected by `findConflicts()` function

---

## 📊 Current User Flow

### Scenario 1: Add Item from Palette
```
1. User in any mode
2. Drag item from palette
3. System forces reorder mode (activeType === 'sku')
4. Shows valid rows with green ring
5. Shows blue line at drop position
6. Drop → Item added to row
```

### Scenario 2: Move Item Between Rows (Re-Order Mode)
```
1. User in Re-Order Mode
2. Drag existing item
3. Hover over different row
4. Green ring if valid, red if invalid
5. Blue line shows insertion point
6. Drop → Item moves to new position
```

### Scenario 3: Reorder Within Same Row (Re-Order Mode)
```
1. User in Re-Order Mode
2. Drag existing item
3. Hover over different position in same row
4. Blue line shows new position
5. Drop → Item reorders within row
```

### Scenario 4: Stack Items (Stack Mode)
```
1. User switches to Stack Mode
2. Drag existing item
3. Hover over another stack
4. Blue glow if valid to stack
5. Drop → Item stacks on top
```

### Scenario 5: Failed Stack Attempt (Stack Mode)
```
1. User in Stack Mode
2. Drag item
3. Try to drop in invalid location (not on stack)
4. Counter increments
5. After 2 failed attempts → Prompt appears
6. Prompt suggests switching to Re-Order Mode
```

---

## 🐛 Current Issues

### Issue 1: **No Auto-Stack in Re-Order Mode**
- **Problem:** Dragging item onto another item in re-order mode doesn't stack
- **Current Behavior:** Creates new stack beside it
- **User Expectation:** Should stack when dragging onto valid stack
- **Why:** Re-order mode only checks for row/position, not stacking opportunity

### Issue 2: **Mode Confusion**
- **Problem:** Users don't know when to use which mode
- **Examples:**
  - "I want to stack, but I'm in re-order mode" → Must switch
  - "I dragged onto item but it didn't stack" → Wrong mode
  - "Why won't it let me add from palette in stack mode?" → Mode limitation

### Issue 3: **No Visual Hint for Stacking in Re-Order Mode**
- **Problem:** When hovering item over another item in re-order mode:
  - No indication that stacking is possible
  - No green glow
  - No "will stack here" message
- **User sees:** Blue line (reorder indicator)
- **User expects:** Some indication it could stack

### Issue 4: **Height Validation Missing in stackItem()**
- **Problem:** `stackItem()` action doesn't validate height before stacking
- **Result:** Can stack beyond row height limit
- **Example:** 4 cans (232px) in 164px row
- **Why Critical:** Violates physical constraints

### Issue 5: **No Validation Check in Stack Mode handleDragEnd**
- **Problem:** Stack mode doesn't verify `validStackTargetIds` before calling action
- **Risk:** Could bypass validation
- **Current Code:**
```typescript
if (dropIndicator?.type === 'stack') {
  actions.stackItem(active.id, dropIndicator.targetId); // No validation check!
}
```

---

## 💡 What Works Well

### ✅ Strengths:

1. **Clear Mode Separation**
   - Re-Order for positioning
   - Stack for stacking
   - Simple mental model (when understood)

2. **Good Visual Feedback**
   - Green rings for valid rows
   - Blue lines for positions
   - Blue glow for stack targets
   - Red for conflicts

3. **Validation Logic is Solid**
   - `runValidation()` checks all constraints
   - Height, width, product type all considered
   - `validRowIds` and `validStackTargetIds` are accurate

4. **Helpful Prompt**
   - After failed stack attempts
   - Guides user to correct mode
   - Reduces frustration

5. **Performance Optimized**
   - Throttled drag operations (16ms)
   - Memoized calculations
   - React.memo on components

---

## 🎯 What Needs Improvement

### Priority 1: **Critical Fixes**
1. ❌ **Add height validation to `stackItem()` action**
2. ❌ **Add validation check before stacking in handleDragEnd**
3. ❌ **Prevent stacking beyond height limit**

### Priority 2: **UX Enhancements**
1. ⚠️ **Enable auto-stack detection in re-order mode**
   - When hovering item over stackable item → Show stack opportunity
   - Don't force mode switch
2. ⚠️ **Add visual feedback for stacking in any mode**
   - Green glow when hover detects stacking opportunity
   - Works regardless of current mode
3. ⚠️ **Smarter drop handling**
   - If dropping on stack → Try to stack first
   - If can't stack → Fall back to reorder

### Priority 3: **Future Enhancements**
1. 💡 Consider removing modes (single "Smart Mode")
2. 💡 Add direct palette-to-stack functionality
3. 💡 Add keyboard shortcuts for explicit mode override

---

## 🔄 How Validation Works End-to-End

### Flow Diagram:

```
1. User starts drag (handleDragStart)
   ↓
2. System runs runValidation()
   ↓
3. Returns { validRowIds, validStackTargetIds }
   ↓
4. User moves cursor (handleDragOver - throttled 16ms)
   ↓
5. Check current mode:
   
   RE-ORDER MODE:
   ├─ Hover over row → Green ring if in validRowIds
   ├─ Hover over stack → Calculate position, show blue line
   └─ Set dropIndicator: { type: 'reorder', ... }
   
   STACK MODE:
   ├─ Hover over stack → Blue glow if in validStackTargetIds
   └─ Set dropIndicator: { type: 'stack', ... }
   ↓
6. User drops (handleDragEnd)
   ↓
7. Check dropIndicator type:
   
   type === 'reorder':
   ├─ Verify validRowIds.has(targetRowId)
   └─ Call actions.reorderStack() or actions.moveItem()
   
   type === 'stack':
   └─ Call actions.stackItem() ⚠️ NO VALIDATION CHECK
   ↓
8. Action executes
   ↓
9. State updates
   ↓
10. UI re-renders with new positions
```

---

## 📝 Key Takeaways

### What's Working:
- ✅ Validation logic is comprehensive and correct
- ✅ Visual feedback is clear and helpful
- ✅ Mode separation provides control
- ✅ Performance is optimized

### What's Broken:
- ❌ **CRITICAL:** No height validation in `stackItem()` action
- ❌ No validation check before calling stack action
- ❌ Can stack beyond physical limits

### What's Missing:
- ⚠️ Smart auto-stack detection in re-order mode
- ⚠️ Visual feedback for stacking in any mode
- ⚠️ Intuitive "drag onto item = stack" behavior

### What's Confusing:
- 😕 Two modes with different capabilities
- 😕 Must switch modes to stack
- 😕 No visual hint that stacking is possible in re-order mode

---

## 🚀 Next Steps (Without Changing Modes)

### Keep Both Modes But Make Them Smarter:

1. **Fix Critical Bugs First:**
   - Add validation to `stackItem()` action
   - Check height before stacking
   - Prevent overflow violations

2. **Enhance Re-Order Mode:**
   - Detect stacking opportunities
   - Show visual feedback (green glow)
   - Allow stacking if user drops on stack

3. **Enhance Stack Mode:**
   - Add validation check before action
   - Better error messages
   - Show why stack failed

4. **Keep Mode Toggle:**
   - Users who want explicit control can use it
   - Default to Re-Order (most versatile)
   - Smart detection works in both modes

---

## ✅ Conclusion

**Current system is well-designed but has critical bugs and UX gaps:**

- **Architecture:** ✅ Solid separation of concerns
- **Validation:** ✅ Comprehensive and accurate  
- **Visual Feedback:** ✅ Clear and helpful
- **Performance:** ✅ Optimized for 60fps
- **Bug: Height Constraint:** ❌ Not enforced in action
- **UX: Mode Switching:** ⚠️ Required for stacking
- **UX: Visual Hints:** ⚠️ Missing for stacking in re-order mode

**Strategy:** Keep modes, fix bugs, add smart detection to both modes!

---

**Analysis Complete** ✅  
**Ready for implementation planning** 🚀
