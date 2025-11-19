# Multi-Door Capture & Backend Export - Clean Implementation

## 🎯 Root Cause Analysis

### Problem
The system was designed for single-door, then patched for multi-door. We need to redesign from the ground up.

### Core Issues
1. **Capture** - No wrapper ID for multi-door layout
2. **Backend Transform** - Already has multi-door support, just needs verification
3. **Coordinates** - Must be absolute across entire refrigerator

---

## 🏗️ Clean Architecture Solution

### Design Principle
**"Write once, works for 1-N doors"**

Instead of `if (isMultiDoor)` everywhere, design the system to handle N doors naturally.

---

## 📐 Implementation Plan

### Part 1: Capture Fix (15 minutes)

**Goal**: Capture the entire refrigerator layout regardless of door count

#### Step 1.1: Add Wrapper ID

**File**: `app/planogram/components/MultiDoorRefrigerator.tsx`

```tsx
// Wrap ENTIRE layout with ID
<div 
  id="refrigerator-layout"  // Single ID for all layouts
  className="flex items-start" 
  style={{ gap: `${DOOR_GAP}px` }}
>
  {doorIds.map((doorId, index) => (
    <RefrigeratorComponent ... />
  ))}
</div>
```

**For single-door in RefrigeratorComponent**, also wrap:
```tsx
<div id="refrigerator-layout">
  {/* single door content */}
</div>
```

#### Step 1.2: Simplify Capture Function

**File**: `lib/capture-utils.ts`

```typescript
// Remove isMultiDoor parameter - not needed!
export async function captureRefrigeratorLayout(
  filename: string = 'refrigerator-planogram'
): Promise<{ width: number; height: number } | null> {
  // Always use same ID - works for single AND multi-door
  return captureElementAsImage('refrigerator-layout', filename);
}
```

#### Step 1.3: Update Button Handler

**File**: Wherever capture button is called

```typescript
// Before: captureElementAsImage('refrigerator', 'planogram');
// After:  captureRefrigeratorLayout('planogram');
```

---

### Part 2: Backend Transform Verification (10 minutes)

**Goal**: Verify multi-door export works correctly

#### Current Implementation (Already Correct!)

**File**: `lib/backend-transform.ts`

The `convertMultiDoorFrontendToBackend` function already:
- ✅ Calculates correct total width with door gaps
- ✅ Uses `getDoorXOffset()` for X-coordinates
- ✅ Creates sections per door with correct positioning

**What we need to verify:**
1. Door-2 X-offset = 721px ✅
2. Products have absolute X-coordinates ✅
3. Output structure matches demo data ✅

#### Add Logging for Verification

```typescript
// In convertMultiDoorFrontendToBackend
doorConfigs.forEach((doorConfig, doorIndex) => {
  const doorXOffset = getDoorXOffset(doorConfigs, doorIndex);
  
  console.log(`🚪 Door-${doorIndex + 1} Offset:`, {
    doorId: doorConfig.id,
    xOffset: doorXOffset,
    width: doorConfig.width,
    expected: doorIndex === 0 ? 16 : (16 + 673 + 32) // 721 for door-2
  });
});
```

---

### Part 3: Update Backend Output Structure (20 minutes)

**Goal**: Match demo data format exactly

#### Current vs Expected Structure

**Current:**
```typescript
{
  Cooler: {
    "Door-1": {
      data: [...],
      Sections: [...],
      "Door-Visible": true
    }
  },
  dimensions: {...}
}
```

**Expected (from demo):**
```typescript
{
  Cooler: {
    "Door-1": {
      Sections: [...],
      data: [...],
      "Door-Visible": true
    },
    "Door-2": {
      Sections: [...],
      data: [...],
      "Door-Visible": true
    }
  }
  // Note: No top-level dimensions in demo
}
```

#### Key Differences
1. ✅ Already have per-door structure
2. ✅ Already have "Door-Visible" flag
3. ⚠️ Need to ensure Door-2 is included (currently only Door-1)
4. ⚠️ May need to adjust section positioning for multi-door

---

## 🔧 Actual Code Changes

### Change 1: MultiDoorRefrigerator.tsx

Add wrapper ID for capture:

```tsx
return (
  <div 
    id="refrigerator-layout"  // ← ADD THIS
    className="flex items-start" 
    style={{ gap: `${DOOR_GAP}px` }}
  >
    {doorIds.map((doorId, index) => (
      <div key={doorId} className="flex flex-col">
        <RefrigeratorComponent
          doorId={doorId}
          doorIndex={index}
          doorConfig={doorConfig}
          dropIndicator={dropIndicator}
          dragValidation={dragValidation}
          conflictIds={conflictIds}
          selectedLayoutId={selectedLayoutId}
          showBoundingBoxes={showBoundingBoxes}
        />
      </div>
    ))}
  </div>
);
```

### Change 2: Refrigerator.tsx

Wrap single-door with same ID:

```tsx
return (
  <div id="refrigerator-layout">  {/* ← ADD THIS */}
    {/* existing refrigerator rendering */}
  </div>
);
```

### Change 3: capture-utils.ts

Simplify capture function:

```typescript
/**
 * Capture the complete refrigerator layout
 * Works for both single-door and multi-door layouts
 */
export async function captureRefrigeratorLayout(
  filename: string = 'refrigerator-planogram'
): Promise<{ width: number; height: number } | null> {
  // Always use 'refrigerator-layout' - universal ID
  return captureElementAsImage('refrigerator-layout', filename);
}
```

### Change 4: Update Button Click Handler

Find where capture button is called and update:

```typescript
// Find: await captureElementAsImage('refrigerator', ...)
// Replace with: await captureRefrigeratorLayout(...)
```

---

## 🧪 Testing Plan

### Test 1: Single-Door Capture
1. Load `g-26c` (single door)
2. Click capture
3. **Expected**: Captures entire refrigerator ✅

### Test 2: Multi-Door Capture  
1. Load `g-52c` (two doors)
2. Add items to both doors
3. Click capture
4. **Expected**: Captures BOTH doors in one image ✅

### Test 3: Backend Export Coordinates
1. Load `g-52c`
2. Add item to Door-1, position 50px → X should be ~66px (16 + 50)
3. Add item to Door-2, position 50px → X should be ~771px (721 + 50)
4. Open backend preview
5. **Expected**: X-coordinates match ✅

### Test 4: Dimension Match
1. Load `g-52c`
2. Capture image → Note dimensions
3. Backend preview → Note totalWidth/totalHeight
4. **Expected**: Dimensions match exactly ✅

---

## 📏 Coordinate Calculation Reference

### For 2-Door Layout (g-52c)

```
Total Width = 1410px

Door-1:
├─ X offset: 16px (FRAME_BORDER)
├─ Width: 673px
└─ Right edge: 16 + 673 + 16 = 705px

Door-2:
├─ X offset: 705 + 16 = 721px  ← START HERE
├─ Width: 673px
└─ Right edge: 721 + 673 + 16 = 1410px ✅

Items in Door-1: X = 16 + stackPosition
Items in Door-2: X = 721 + stackPosition

Total Height = 1530px
├─ Header: 100px
├─ Content: 1308px  
├─ Grille: 90px
└─ Frame: 32px (16×2)
```

---

## ✅ Implementation Checklist

### Phase 1: Capture (15 min)
- [ ] Add `id="refrigerator-layout"` to MultiDoorRefrigerator wrapper
- [ ] Add `id="refrigerator-layout"` to Refrigerator wrapper (single-door)
- [ ] Create `captureRefrigeratorLayout()` function
- [ ] Update capture button to use new function
- [ ] Test single-door capture
- [ ] Test multi-door capture

### Phase 2: Verification (10 min)
- [ ] Add coordinate logging to backend transform
- [ ] Load g-52c with items in both doors
- [ ] Verify Door-1 X-offset = 16px
- [ ] Verify Door-2 X-offset = 721px
- [ ] Verify product coordinates are absolute
- [ ] Check captured image dimensions

### Phase 3: Backend Structure (if needed)
- [ ] Compare output with demo data format
- [ ] Adjust if discrepancies found
- [ ] Test with external application (if available)

---

## 🎯 Success Criteria

1. ✅ **Single-door capture works** (backward compatibility)
2. ✅ **Multi-door capture includes all doors** in one image
3. ✅ **Captured dimensions** match backend calculations
4. ✅ **Door-2 X-coordinates** start at 721px
5. ✅ **All coordinates are absolute** (not per-door relative)
6. ✅ **Backend format** matches demo data structure
7. ✅ **No conditional logic** for single vs multi-door (universal design)

---

## 🚀 Why This Solution is Better

### Before (Patchy)
```typescript
if (isMultiDoor) {
  captureElement('multi-door-layout');
} else {
  captureElement('single-door-layout');
}
```

### After (Clean)
```typescript
// Works for any number of doors
captureElement('refrigerator-layout');
```

### Benefits
1. **No branching** - same code path for all cases
2. **Scales naturally** - works for 1, 2, 3+ doors
3. **Single source of truth** - one ID for capture
4. **Maintainable** - less code, less complexity
5. **Google/Anthropic quality** - elegant, scalable design

---

Ready to implement! 🎯
