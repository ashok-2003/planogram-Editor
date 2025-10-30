# Visual Feedback System - Complete Analysis

## Current Implementation

### 1. **Stack Mode Visual Indicators**

#### A. Blue Glow (Subtle - 20% opacity + blur)
- **Location**: `stack.tsx` lines 75-83
- **When**: `isStackHighlight === true` (valid stack target in stack mode)
- **Style**: `bg-blue-400/20 rounded-lg blur-sm`
- **Problem**: Too subtle, hard to notice

#### B. Opacity Reduction (40% - Passive)
- **Location**: `stack.tsx` line 65
- **When**: `isVisuallyDisabled` (drag happening + parent row invalid + not valid stack target)
- **Style**: `opacity-40`
- **Problem**: Passive feedback, doesn't grab attention

#### C. Conflict Red Ring
- **Location**: `stack.tsx` lines 87-95
- **When**: `hasConflict` (placement rule violation)
- **Style**: `ring-2 ring-red-500 ring-offset-2`
- **Problem**: Only for rule violations, NOT for drag feedback

### 2. **Re-Order Mode Visual Indicators**

#### A. Green Ring on Row (Row-level)
- **Location**: `row.tsx` line 60
- **When**: `isValidRowTarget` (valid row for dropping)
- **Style**: `ring-2 ring-offset-2 ring-offset-gray-900 ring-green-500`
- **Works Well**: Clear row-level feedback

#### B. Blue Ghost Line (Insert Position)
- **Location**: `row.tsx` lines 92-103, 122-131
- **When**: `showGhost` (showing where item will be inserted)
- **Style**: Animated blue line with dot
- **Works Well**: Clear insertion point

#### C. Red Overlay "Cannot drop here"
- **Location**: `row.tsx` lines 78-84
- **When**: `isDisabled` (row not valid for dropping)
- **Style**: `bg-red-800/40` with text
- **Works Well**: Clear rejection feedback

### 3. **Validation System**

#### Flow:
1. **handleDragStart** → calls `runValidation()` → sets `dragValidation`
2. **runValidation** returns:
   - `validRowIds: Set<string>` - rows that can accept the item
   - `validStackTargetIds: Set<string>` - stacks that can be stacked onto
3. **handleDragOver** → determines `dropIndicator` based on mode
4. **Components** use `dragValidation` to show visual feedback

## Problems Identified

### Stack Mode Issues:
1. ❌ **Blue glow too subtle** - 20% opacity with blur is barely visible
2. ❌ **No clear green "YES" indicator** - only subtle blue glow
3. ❌ **No clear red "NO" indicator** - only passive opacity reduction
4. ❌ **Invalid targets don't stand out** - need obvious "cannot stack here" signal
5. ❌ **Valid targets blend in** - need bright "stack here!" signal

### Re-Order Mode Issues:
1. ✅ Row-level feedback works well (green ring)
2. ✅ Ghost insertion line works well
3. ✅ "Cannot drop here" overlay works well
4. ⚠️ Individual stacks within valid rows could show hover feedback

## Proposed Improvements

### **Stack Mode Visual Enhancements**

#### 1. **Valid Stack Target (Green Box)**
Replace subtle blue glow with:
```tsx
// Bright green border + green glow + scale up
className="ring-4 ring-green-500 ring-offset-2 scale-105"
background: "0 0 20px rgba(34, 197, 94, 0.6)" (green shadow)
+ Green check icon or "STACK HERE" label
```

#### 2. **Invalid Stack Target (Red Box)**
Replace passive opacity with:
```tsx
// Bright red border + red glow
className="ring-4 ring-red-500 ring-offset-2"
background: "0 0 20px rgba(239, 68, 68, 0.6)" (red shadow)
+ Red X icon or "CANNOT STACK" label
+ Keep opacity-40 as secondary indicator
```

#### 3. **Neutral Stacks (No feedback needed)**
- Items in invalid rows → Keep opacity-40
- Items in valid rows but not hovered → No change

### **Implementation Strategy**

#### Changes Needed:

1. **stack.tsx** - Add new visual states:
   ```tsx
   // NEW: Determine if invalid target (drag happening + not valid)
   const isInvalidStackTarget = useMemo(
     () => isDraggingGlobal && !isValidStackTarget && !isParentRowValid,
     [isDraggingGlobal, isValidStackTarget, isParentRowValid]
   );
   
   // Replace blue glow with green box
   {isValidStackTarget && (
     <div className="absolute -inset-1 ring-4 ring-green-500 ring-offset-2 rounded-lg pointer-events-none" />
     <div className="absolute inset-0 bg-green-500/20 rounded-lg blur-xl -z-10" />
     <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-green-500 text-white px-2 py-1 rounded text-xs font-bold">
       STACK HERE
     </div>
   )}
   
   // NEW: Add red box for invalid targets
   {isInvalidStackTarget && (
     <div className="absolute -inset-1 ring-4 ring-red-500 ring-offset-2 rounded-lg pointer-events-none" />
     <div className="absolute inset-0 bg-red-500/20 rounded-lg blur-xl -z-10" />
     <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
       CANNOT STACK
     </div>
   )}
   ```

2. **planogramEditor.tsx** - Already passing correct props:
   - ✅ `dragValidation` passed to row
   - ✅ Row passes to stack
   - No changes needed

3. **row.tsx** - Already calculating:
   - ✅ `isParentRowValid` passed to stack
   - No changes needed

## Visual Feedback Priority

### High Priority (Implement Now):
1. ✅ **Green box + glow** for valid stack targets in stack mode
2. ✅ **Red box + glow** for invalid targets when hovering
3. ✅ **"STACK HERE" / "CANNOT STACK"** labels for clarity

### Medium Priority (Future):
1. Hover effects in re-order mode to preview stacking opportunities
2. Capacity warnings ("80% full") on rows
3. Animated arrows pointing to valid targets

### Low Priority (Polish):
1. Sound effects on valid/invalid hover
2. Haptic feedback (if supported)
3. Tutorial tooltips for first-time users

## Testing Plan

### Test Scenarios:
1. **Stack Mode - Valid Target**:
   - Drag stackable item over valid stack
   - ✅ Should show green box + "STACK HERE"

2. **Stack Mode - Invalid Target (Height)**:
   - Drag tall item over stack near height limit
   - ✅ Should show red box + "CANNOT STACK"

3. **Stack Mode - Invalid Target (Row Rule)**:
   - Drag dairy item over beverage-only row
   - ✅ Should show red box + "CANNOT STACK"

4. **Stack Mode - Non-stackable Item**:
   - Drag non-stackable item
   - ✅ All stacks should show red or reduced opacity

5. **Re-Order Mode**:
   - ✅ Should not affect existing feedback
   - Green ring on valid rows should still work

## Implementation Notes

### Key Considerations:
1. **Performance**: Use `AnimatePresence` for smooth animations
2. **Z-index**: Ensure feedback layers don't block interactions
3. **Color Contrast**: Green/red must be visible on dark/light backgrounds
4. **Accessibility**: Consider color-blind users (add icons + text)
5. **Mode Consistency**: Keep re-order mode unchanged (already works well)

### Files to Modify:
- ✅ `stack.tsx` - Add green/red box logic
- ❌ `planogramEditor.tsx` - No changes needed
- ❌ `row.tsx` - No changes needed
- ❌ `validation.ts` - No changes needed

---

**Status**: Ready to implement
**Estimated Time**: 15-20 minutes
**Risk Level**: Low (only visual changes, no logic changes)
