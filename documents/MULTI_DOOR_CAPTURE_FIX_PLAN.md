# Multi-Door Capture & Backend Transform Fix Plan

## 🎯 Problem Statement

### Current Issues

1. **Image Capture Problem**
   - When clicking capture button in multi-door mode, only ONE door is captured
   - Should capture BOTH doors together in a single image
   - Current implementation uses element ID that only targets single door

2. **Backend Transform Dimension Issues**
   - X-coordinates don't account for multiple doors properly
   - Bounding boxes need adjustment for door positions
   - Middle width (frame borders between doors: 16px + 16px = 32px) not considered
   - External applications need accurate multi-door bounding box data

3. **Dimension Calculation Problems**
   - `getElementDimensions()` only captures one door
   - Total width calculation missing door gaps and middle frames
   - Backend export dimensions don't match visual layout

---

## 📋 Current Implementation Analysis

### 1. Capture Utility (`lib/capture-utils.ts`)

**Current Code:**
```typescript
export async function captureElementAsImage(
  elementId: string,  // Only captures ONE element by ID
  filename: string = 'refrigerator-planogram'
): Promise<{ width: number; height: number } | null> {
  const element = document.getElementById(elementId);
  // Captures single element only
  const rect = element.getBoundingClientRect();
  const width = Math.round(rect.width);
  const height = Math.round(rect.height);
  // ...
}
```

**Problem:**
- ❌ `elementId` targets only one door (e.g., `'refrigerator-door-1'`)
- ❌ In multi-door mode, only captures first door
- ❌ Doesn't capture the entire multi-door layout

---

### 2. Element ID Structure

**Current Structure:**
```tsx
// Single-door mode:
<div id="refrigerator">...</div>

// Multi-door mode:
<div>  // No ID on parent container! ❌
  <div id="refrigerator-door-1">Door 1</div>
  <div id="refrigerator-door-2">Door 2</div>
</div>
```

**Problem:**
- ❌ No ID on the parent container that holds both doors
- ❌ Can only capture individual doors, not the complete layout

---

### 3. Backend Transform Dimensions

**Current Code (`lib/backend-transform.ts`):**
```typescript
export function convertMultiDoorFrontendToBackend(
  refrigerators: MultiDoorRefrigerator,
  doorConfigs: DoorConfig[],
  headerHeight: number = HEADER_HEIGHT,
  grilleHeight: number = GRILLE_HEIGHT,
  frameBorder: number = FRAME_BORDER
): BackendOutput {
  // Calculate total dimensions with door gaps
  const totalWidth = doorConfigs.reduce((sum, door, index) => {
    return sum + door.width + (frameBorder * 2) + (index > 0 ? DOOR_GAP : 0);
  }, 0);
  
  const totalHeight = doorConfigs[0].height + headerHeight + grilleHeight + (frameBorder * 2);
  
  // Returns dimensions but may not match captured image
}
```

**Problem:**
- ⚠️ Formula is correct BUT...
- ❌ Captured image dimensions don't match these calculated dimensions 
-[user answer] - yes caputured image dimesion just slight differ from original dimesion so for create the bouding box and all we are using  the fallbacks and all you can see 
- ❌ Bounding boxes may be misaligned
-[user answer] - as for the single door bounding box was working perfectly with that offset adding of +10 

---

## 🔍 What Needs to be Fixed

### Priority 1: Multi-Door Capture (CRITICAL)

#### Issue: Can only capture one door at a time

**What needs to happen:**
1. Add ID to the parent container that wraps all doors
2. Update capture function to detect single vs multi-door mode
3. Capture the entire multi-door layout in one image - yes we shold 

**Example Fix:**
```tsx
// MultiDoorRefrigerator.tsx
<div 
  id="refrigerator-layout"  // ✅ NEW: ID for entire layout
  className="flex items-start" 
  style={{ gap: `${DOOR_GAP}px` }}
>
  {doorIds.map((doorId, index) => (
    <RefrigeratorComponent
      key={doorId}
      doorId={doorId}
      // Each door still has its own ID for individual access if needed
    />
  ))}
</div>
```

---

### Priority 2: Dimension Calculation (HIGH)

#### Issue: Captured dimensions don't match backend calculations

**What needs to happen:**
1. Ensure captured image dimensions match backend total dimensions exactly
2. Account for:
   - Door widths
   - Frame borders (16px on each side of each door)
   - Door gaps (DOOR_GAP between doors)
   - Header height
   - Grille height

**Formula Verification:**
```typescript
// For 2-door layout:
// Door 1: 673px width
// Door 2: 673px width
// Frame borders: 16px × 4 = 64px (left of door1, between doors×2, right of door2)
// Door gap: 0px (flush)

Total Width = 16 + 673 + 16 + 16 + 673 + 16 + 0
            = 1410px

Total Height = HEADER_HEIGHT + doorHeight + GRILLE_HEIGHT + (FRAME_BORDER × 2)
             = 100 + 1308 + 90 + 32
             = 1530px
```

**Verification needed:**
- ✅ Visual layout matches these dimensions
- ❓ Captured image matches these dimensions - slight off in height so that's why we have to use the +10 thing and the fallbacks so getting the original demision you can see in teh current code 
- ❓ Backend bounding boxes use these dimensions
yes the dirrent backend usage this dimenison and for single door the ealier was working perfectly fine 

---

### Priority 3: Backend Bounding Box Coordinates (HIGH)

#### Issue: X-coordinates need adjustment for door positions

**Current Situation:**
- Door-1 items: X starts at `FRAME_BORDER` (16px) ✅
- Door-2 items: X should start at `16 + 673 + 16 + 16 + DOOR_GAP` = 721px ❓ 
-[user answer] - yes you are correct then second door items start from 721px 


**What needs verification:**
1. `getDoorXOffset()` calculates correctly
2. Product X-coordinates include door offset
3. Bounding boxes match visual positions
4. External app can parse coordinates correctly

**Example Door-2 Item:**
```typescript
// Item in Door-2, Row-1, Stack position 50px from left
const itemX = getDoorXOffset(doorConfigs, 1) + stackPosition + FRAME_BORDER;
// = 721 + 50 + 16 = 787px

// This should match the item's visual position in the captured image
```

---

## 🛠️ Implementation Plan

### Step 1: Fix Multi-Door Capture (30 minutes)

#### 1.1 Update MultiDoorRefrigerator Component

**File:** `app/planogram/components/MultiDoorRefrigerator.tsx`

**Changes:**
```tsx
// Add ID to parent container
<div 
  id="multi-door-refrigerator-layout"  // ✅ NEW
  className="flex items-start" 
  style={{ gap: `${DOOR_GAP}px` }}
>
  {doorIds.map((doorId, index) => (
    // Each door renders as before
  ))}
</div>
```

#### 1.2 Update Single-Door Refrigerator Component

**File:** `app/planogram/components/Refrigerator.tsx`

**Verify it has:**
```tsx
<div id="single-door-refrigerator-layout">
  {/* Refrigerator content */}
</div>
```

#### 1.3 Update Capture Utility

**File:** `lib/capture-utils.ts`

**Add new function:**
```typescript
/**
 * Capture the complete refrigerator layout (single or multi-door)
 * Automatically detects which element to capture based on mode
 */
export async function captureRefrigeratorLayout(
  isMultiDoor: boolean,
  filename: string = 'refrigerator-planogram'
): Promise<{ width: number; height: number } | null> {
  const elementId = isMultiDoor 
    ? 'multi-door-refrigerator-layout' 
    : 'single-door-refrigerator-layout';
  
  return captureElementAsImage(elementId, filename);
}
```

#### 1.4 Update Capture Button Click Handler

**File:** `app/planogram/components/planogramEditor.tsx`

**Change from:**
```typescript
// Old: hardcoded single door
await captureElementAsImage('refrigerator', 'planogram');
```

**To:**
```typescript
// New: detects mode automatically
await captureRefrigeratorLayout(isMultiDoor, 'planogram');
```

---

### Step 2: Verify Dimension Calculations (20 minutes)

#### 2.1 Add Dimension Logging

**File:** `lib/backend-transform.ts`

**Add logging:**
```typescript
export function convertMultiDoorFrontendToBackend(...) {
  const totalWidth = /* calculation */;
  const totalHeight = /* calculation */;
  
  console.log('🎨 BACKEND DIMENSIONS:', {
    totalWidth,
    totalHeight,
    doorCount: doorConfigs.length,
    doorGap: DOOR_GAP,
    frameBorder: FRAME_BORDER,
    breakdown: {
      doorsWidth: doorConfigs.reduce((sum, door) => sum + door.width, 0),
      frameWidth: (FRAME_BORDER * 2) * doorConfigs.length,
      gaps: (doorConfigs.length - 1) * DOOR_GAP,
      headerHeight: HEADER_HEIGHT,
      grilleHeight: GRILLE_HEIGHT
    }
  });
  
  // Return dimensions...
}
```

#### 2.2 Add Capture Dimension Logging

**File:** `lib/capture-utils.ts`

**Already has logging, but enhance:**
```typescript
console.log('📸 CAPTURE DIMENSIONS:', { 
  width, 
  height,
  scaledWidth: width * PIXEL_RATIO,
  scaledHeight: height * PIXEL_RATIO,
  elementId,
  mode: isMultiDoor ? 'multi-door' : 'single-door'
});
```

#### 2.3 Compare Dimensions

**Test:**
1. Load `g-52c` (2-door layout)
2. Open backend preview → Note dimensions
3. Capture image → Note dimensions
4. **Expected:** Dimensions should match!

---

### Step 3: Verify Bounding Box Coordinates (30 minutes)

#### 3.1 Visual Verification

**Test:**
1. Load `g-52c`
2. Add items to Door-1 and Door-2
3. Enable "Show Bounding Boxes"
4. Verify boxes align with items visually
5. Capture image
6. Open backend preview
7. Verify X-coordinates match visual positions

#### 3.2 Add Coordinate Logging

**File:** `lib/backend-transform.ts`

**In product loop:**
```typescript
// Log each product's position
console.log(`📦 Product ${product.name}:`, {
  doorId,
  doorIndex,
  doorXOffset: getDoorXOffset(doorConfigs, doorIndex),
  stackPosition: stackXPositions[stackIndex],
  finalX: stackXPositions[stackIndex] + doorXOffset,
  boundingBox: product["Bounding-Box"]
});
```

#### 3.3 Manual Testing

**For Door-2 items:**
```
Expected X calculation:
- Door-2 X offset: 16 + 673 + 16 + 16 + 0 = 721px
- Item at stack position 50px: 721 + 50 = 771px
- Bounding box should show X starting at ~771px
```

---

### Step 4: Backend Data Structure (After receiving demo data)

#### 4.1 Analyze Demo Data

**You mentioned:**
> "I will show you demo data of how double door data looks like"

**What we need to verify:**
1. Section numbering/positioning for multi-door
2. Product X-coordinate format
3. Door identification in backend format
4. Bounding box structure

**Questions for demo data:**
- How are doors distinguished? (separate sections? door IDs?)
- How are X-coordinates represented? (absolute? per-door relative?)
- What's the section polygon structure?
- How are stacked items represented?

#### 4.2 Update Backend Transform Based on Demo

**After seeing demo data:**
1. Adjust section creation for multi-door
2. Update coordinate calculations if needed
3. Ensure bounding boxes match expected format
4. Test with external application

---

## 📊 Testing Checklist

### Visual Tests

- [ ] Single-door capture works (baseline test)
- [ ] Multi-door capture includes BOTH doors
- [ ] Captured image dimensions match backend dimensions
- [ ] No clipping or cropping of doors
- [ ] Image quality is good (PIXEL_RATIO = 3)

### Dimension Tests

- [ ] Backend reports: 1410px × 1530px (for g-52c)
- [ ] Captured image: 1410px × 1530px
- [ ] Visual layout: 1410px × 1530px
- [ ] All three match exactly

### Bounding Box Tests

- [ ] Door-1 items: X starts at ~16px
- [ ] Door-2 items: X starts at ~721px
- [ ] Y-coordinates are correct per row
- [ ] Stacked items have correct Y offsets
- [ ] Bounding boxes align with visual items
- [ ] Toggle bounding box overlay works

### Backend Export Tests

- [ ] Single-door export works (backward compatibility)
- [ ] Multi-door export has correct structure
- [ ] All products included from both doors
- [ ] Sections are properly numbered
- [ ] Coordinates are absolute (not per-door relative)
- [ ] External app can parse the data

---

## 🎯 Expected Outcomes

### After Fix is Complete

1. **Capture Button Works for Multi-Door**
   - ✅ Clicking capture in multi-door mode captures entire layout
   - ✅ Both doors visible in single image
   - ✅ Image dimensions match calculations

2. **Backend Dimensions Match Visual**
   - ✅ `totalWidth` calculation is correct
   - ✅ `totalHeight` calculation is correct
   - ✅ Captured image matches these dimensions exactly

3. **Bounding Boxes are Accurate**
   - ✅ Door-1 items have correct X-coordinates
   - ✅ Door-2 items have correct X-coordinates (offset by door width + frames)
   - ✅ Visual overlay matches captured image
   - ✅ External app can accurately locate items

4. **Backend Export is Correct**
   - ✅ Structure matches demo data format
   - ✅ All doors' products included
   - ✅ Coordinates are correct
   - ✅ External app can parse and display

---

## 🚨 Known Considerations

### Middle Width Between Doors

**You mentioned:**
> "Consider the middle width: 16px + 16px = 32px for double door"

**Current Formula (CORRECT):**
```typescript
// For flush doors (DOOR_GAP = 0):
const totalWidth = doorConfigs.reduce((sum, door, index) => {
  return sum + door.width + (FRAME_BORDER * 2) + (index > 0 ? DOOR_GAP : 0);
}, 0);

// Breakdown for 2 doors:
// Door-1: 16 (left frame) + 673 (door) + 16 (right frame) = 705px
// Door-2: 16 (left frame) + 673 (door) + 16 (right frame) = 705px
// Gap: 0px
// Total: 705 + 705 + 0 = 1410px ✅

// Middle section = Door-1 right frame (16px) + Door-2 left frame (16px) = 32px ✅
```

**This is already implemented correctly!**

---

## 📝 Summary

### What Will Be Fixed

1. **Capture Function**
   - Add ID to multi-door container
   - Update capture to detect mode
   - Capture entire layout in one image

2. **Dimension Verification**
   - Add logging to compare dimensions
   - Ensure captured image matches calculations
   - Test with visual measurements

3. **Coordinate Verification**
   - Verify Door-2 X-offset calculation
   - Test bounding box positions
   - Compare with visual layout

4. **Backend Structure**
   - Wait for demo data
   - Adjust format if needed
   - Test with external application

### Time Estimate

- **Step 1 (Capture Fix)**: 30 minutes
- **Step 2 (Dimension Verify)**: 20 minutes
- **Step 3 (Coordinate Verify)**: 30 minutes
- **Step 4 (Backend Adjust)**: TBD (after demo data)

**Total: ~1.5 hours + demo data review**

---

## 🚀 Ready to Implement

**Next Steps:**

1. ✅ **Review this plan** - Make sure approach is correct
2. ⏳ **Receive demo data** - See expected backend format
3. ⏳ **Implement Step 1** - Fix multi-door capture
4. ⏳ **Implement Step 2** - Verify dimensions
5. ⏳ **Implement Step 3** - Verify coordinates
6. ⏳ **Implement Step 4** - Adjust backend format

**Waiting for:**
- Demo data showing double-door backend format
- Your approval to proceed with Step 1

---

## 📤 Questions Before Implementation

1. **Demo Data**: Do you have the demo backend data ready to share?
2. **External App**: What application will consume the backend data?
3. **Coordinate Format**: Should X-coordinates be absolute or per-door relative?
user answer - x cordinates should be absolute not per door 
4. **Section Structure**: How should sections be organized for multi-door?
user answer - take idea from the demo data 

**Ready to proceed once you share the demo data!** 🎯


here is the demo data that can offer you just sneak peekk of how the mulit door is converted as door 1 and door 2 
{
    "Cooler": {
        "Door-1": {
            "Sections": [
                {
                    "products": [
                        {
                            "product": "STING_RED_250ML_PET",
                            "SKU-Code": "shelfscan_00180",
                            "Confidence": "0.94",
                            "Bounding-Box": [
                                [
                                    59.03126525878906,
                                    195.9780120849609
                                ],
                                [
                                    59.03126525878906,
                                    373.9662475585938
                                ],
                                [
                                    115.8507232666016,
                                    373.9662475585938
                                ],
                                [
                                    115.8507232666016,
                                    195.9780120849609
                                ]
                            ],
                            "Position": "1",
                            "stacked": [],
                            "stackSize": 0
                        },
                        {
                            "product": "STING_RED_250ML_PET",
                            "SKU-Code": "shelfscan_00180",
                            "Confidence": "0.95",
                            "Bounding-Box": [
                                [
                                    112.3227005004883,
                                    200.8065643310547
                                ],
                                [
                                    112.3227005004883,
                                    374.425048828125
                                ],
                                [
                                    170.7854156494141,
                                    374.425048828125
                                ],
                                [
                                    170.7854156494141,
                                    200.8065643310547
                                ]
                            ],
                            "Position": "2",
                            "stacked": [],
                            "stackSize": 0
                        },
                        {
                            "product": "STING_RED_250ML_PET",
                            "SKU-Code": "shelfscan_00180",
                            "Confidence": "0.95",
                            "Bounding-Box": [
                                [
                                    167.0683898925781,
                                    203.4311218261719
                                ],
                                [
                                    167.0683898925781,
                                    376.4234008789062
                                ],
                                [
                                    224.5764617919922,
                                    376.4234008789062
                                ],
                                [
                                    224.5764617919922,
                                    203.4311218261719
                                ]
                            ],
                            "Position": "3",
                            "stacked": [],
                            "stackSize": 0
                        },
                        {
                            "product": "STING_RED_250ML_PET",
                            "SKU-Code": "shelfscan_00180",
                            "Confidence": "0.96",
                            "Bounding-Box": [
                                [
                                    220.8809204101562,
                                    208.4682006835938
                                ],
                                [
                                    220.8809204101562,
                                    379.74267578125
                                ],
                                [
                                    273.7112731933594,
                                    379.74267578125
                                ],
                                [
                                    273.7112731933594,
                                    208.4682006835938
                                ]
                            ],
                            "Position": "4",
                            "stacked": [],
                            "stackSize": 0
                        },
                        {
                            "product": "STING_RED_250ML_PET",
                            "SKU-Code": "shelfscan_00180",
                            "Confidence": "0.96",
                            "Bounding-Box": [
                                [
                                    271.8612365722656,
                                    209.4389801025391
                                ],
                                [
                                    271.8612365722656,
                                    382.0426025390625
                                ],
                                [
                                    328.5214538574219,
                                    382.0426025390625
                                ],
                                [
                                    328.5214538574219,
                                    209.4389801025391
                                ]
                            ],
                            "Position": "5",
                            "stacked": [],
                            "stackSize": 0
                        },
                        {
                            "product": "STING_RED_250ML_PET",
                            "SKU-Code": "shelfscan_00180",
                            "Confidence": "0.95",
                            "Bounding-Box": [
                                [
                                    323.5272216796875,
                                    209.7187805175781
                                ],
                                [
                                    323.5272216796875,
                                    381.9757995605469
                                ],
                                [
                                    378.7904357910156,
                                    381.9757995605469
                                ],
                                [
                                    378.7904357910156,
                                    209.7187805175781
                                ]
                            ],
                            "Position": "6",
                            "stacked": [],
                            "stackSize": 0
                        },
                        {
                            "product": "STING_RED_250ML_PET",
                            "SKU-Code": "shelfscan_00180",
                            "Confidence": "0.95",
                            "Bounding-Box": [
                                [
                                    373.8220520019531,
                                    212.1139831542969
                                ],
                                [
                                    373.8220520019531,
                                    382.9345092773438
                                ],
                                [
                                    427.3514099121094,
                                    382.9345092773438
                                ],
                                [
                                    427.3514099121094,
                                    212.1139831542969
                                ]
                            ],
                            "Position": "7",
                            "stacked": [],
                            "stackSize": 0
                        },
                        {
                            "product": "CREAMBELL_CHOCLATE_180ML_PET",
                            "SKU-Code": "shelfscan_00045",
                            "Confidence": "0.86",
                            "Bounding-Box": [
                                [
                                    421.7077941894531,
                                    247.0900726318359
                                ],
                                [
                                    421.7077941894531,
                                    383.889892578125
                                ],
                                [
                                    467.7178344726562,
                                    383.889892578125
                                ],
                                [
                                    467.7178344726562,
                                    247.0900726318359
                                ]
                            ],
                            "Position": "8",
                            "stacked": [],
                            "stackSize": 0
                        },
                        {
                            "product": "CREAMBELL_CHOCLATE_180ML_PET",
                            "SKU-Code": "shelfscan_00045",
                            "Confidence": "0.81",
                            "Bounding-Box": [
                                [
                                    465.4682006835938,
                                    248.3864288330078
                                ],
                                [
                                    465.4682006835938,
                                    383.6654663085938
                                ],
                                [
                                    500.9716491699219,
                                    383.6654663085938
                                ],
                                [
                                    500.9716491699219,
                                    248.3864288330078
                                ]
                            ],
                            "Position": "9",
                            "stacked": [],
                            "stackSize": 0
                        }
                    ],
                    "data": [
                        [
                            279,
                            71
                        ],
                        [
                            488,
                            88
                        ],
                        [
                            501,
                            90
                        ],
                        [
                            501,
                            390
                        ],
                        [
                            488,
                            391
                        ],
                        [
                            343,
                            391
                        ],
                        [
                            145,
                            390
                        ],
                        [
                            43,
                            388
                        ],
                        [
                            43,
                            71
                        ]
                    ],
                    "position": 1
                },
                {
                    "products": [
                        {
                            "product": "7UP_NIMBOOZ_345ML_PET",
                            "SKU-Code": "shelfscan_00023",
                            "Confidence": "0.94",
                            "Bounding-Box": [
                                [
                                    86.86529541015625,
                                    482.3446044921875
                                ],
                                [
                                    86.86529541015625,
                                    665.7117309570312
                                ],
                                [
                                    148.2420196533203,
                                    665.7117309570312
                                ],
                                [
                                    148.2420196533203,
                                    482.3446044921875
                                ]
                            ],
                            "Position": "1",
                            "stacked": [],
                            "stackSize": 0
                        },
                        {
                            "product": "7UP_NIMBOOZ_345ML_PET",
                            "SKU-Code": "shelfscan_00023",
                            "Confidence": "0.94",
                            "Bounding-Box": [
                                [
                                    141.4280090332031,
                                    481.5943908691406
                                ],
                                [
                                    141.4280090332031,
                                    665.84814453125
                                ],
                                [
                                    199.7955932617188,
                                    665.84814453125
                                ],
                                [
                                    199.7955932617188,
                                    481.5943908691406
                                ]
                            ],
                            "Position": "2",
                            "stacked": [],
                            "stackSize": 0
                        },
                        {
                            "product": "7UP_NIMBOOZ_345ML_PET",
                            "SKU-Code": "shelfscan_00023",
                            "Confidence": "0.96",
                            "Bounding-Box": [
                                [
                                    193.5469360351562,
                                    482.3770141601562
                                ],
                                [
                                    193.5469360351562,
                                    666.6887817382812
                                ],
                                [
                                    252.8826904296875,
                                    666.6887817382812
                                ],
                                [
                                    252.8826904296875,
                                    482.3770141601562
                                ]
                            ],
                            "Position": "3",
                            "stacked": [],
                            "stackSize": 0
                        },
                        {
                            "product": "7UP_NIMBOOZ_345ML_PET",
                            "SKU-Code": "shelfscan_00023",
                            "Confidence": "0.95",
                            "Bounding-Box": [
                                [
                                    246.82958984375,
                                    486.46533203125
                                ],
                                [
                                    246.82958984375,
                                    666.3469848632812
                                ],
                                [
                                    304.0860290527344,
                                    666.3469848632812
                                ],
                                [
                                    304.0860290527344,
                                    486.46533203125
                                ]
                            ],
                            "Position": "4",
                            "stacked": [],
                            "stackSize": 0
                        },
                        {
                            "product": "7UP_NIMBOOZ_345ML_PET",
                            "SKU-Code": "shelfscan_00023",
                            "Confidence": "0.94",
                            "Bounding-Box": [
                                [
                                    298.6577758789062,
                                    494.0326843261719
                                ],
                                [
                                    298.6577758789062,
                                    667.1717529296875
                                ],
                                [
                                    353.4894714355469,
                                    667.1717529296875
                                ],
                                [
                                    353.4894714355469,
                                    494.0326843261719
                                ]
                            ],
                            "Position": "5",
                            "stacked": [],
                            "stackSize": 0
                        },
                        {
                            "product": "TROP_MIX_FRUIT_MAGIC_180ML_PET",
                            "SKU-Code": "shelfscan_00209",
                            "Confidence": "0.92",
                            "Bounding-Box": [
                                [
                                    346.8329162597656,
                                    539.6875
                                ],
                                [
                                    346.8329162597656,
                                    665.3019409179688
                                ],
                                [
                                    390.0200805664062,
                                    665.3019409179688
                                ],
                                [
                                    390.0200805664062,
                                    539.6875
                                ]
                            ],
                            "Position": "6",
                            "stacked": [],
                            "stackSize": 0
                        },
                        {
                            "product": "TROP_MIX_FRUIT_MAGIC_180ML_PET",
                            "SKU-Code": "shelfscan_00209",
                            "Confidence": "0.93",
                            "Bounding-Box": [
                                [
                                    388.2467346191406,
                                    540.918701171875
                                ],
                                [
                                    388.2467346191406,
                                    664.0592041015625
                                ],
                                [
                                    431.99658203125,
                                    664.0592041015625
                                ],
                                [
                                    431.99658203125,
                                    540.918701171875
                                ]
                            ],
                            "Position": "7",
                            "stacked": [],
                            "stackSize": 0
                        },
                        {
                            "product": "TROP_MIX_FRUIT_MAGIC_180ML_PET",
                            "SKU-Code": "shelfscan_00209",
                            "Confidence": "0.93",
                            "Bounding-Box": [
                                [
                                    431.0491943359375,
                                    539.8635864257812
                                ],
                                [
                                    431.0491943359375,
                                    664.293212890625
                                ],
                                [
                                    472.7793579101562,
                                    664.293212890625
                                ],
                                [
                                    472.7793579101562,
                                    539.8635864257812
                                ]
                            ],
                            "Position": "8",
                            "stacked": [],
                            "stackSize": 0
                        },
                        {
                            "product": "TROP_MIX_FRUIT_MAGIC_180ML_PET",
                            "SKU-Code": "shelfscan_00209",
                            "Confidence": "0.91",
                            "Bounding-Box": [
                                [
                                    469.8996276855469,
                                    540.2719116210938
                                ],
                                [
                                    469.8996276855469,
                                    664.8333740234375
                                ],
                                [
                                    501.2374572753906,
                                    664.8333740234375
                                ],
                                [
                                    501.2374572753906,
                                    540.2719116210938
                                ]
                            ],
                            "Position": "9",
                            "stacked": [],
                            "stackSize": 0
                        }
                    ],
                    "data": [
                        [
                            501,
                            380
                        ],
                        [
                            501,
                            693
                        ],
                        [
                            488,
                            695
                        ],
                        [
                            424,
                            702
                        ],
                        [
                            51,
                            702
                        ],
                        [
                            51,
                            380
                        ]
                    ],
                    "position": 2
                },
                {
                    "products": [
                        {
                            "product": "MOUNTAIN_DEW_750ML_PET",
                            "SKU-Code": "shelfscan_00109",
                            "Confidence": "0.95",
                            "Bounding-Box": [
                                [
                                    65.80008697509766,
                                    749.7742309570312
                                ],
                                [
                                    65.80008697509766,
                                    978.5792846679688
                                ],
                                [
                                    151.9952392578125,
                                    978.5792846679688
                                ],
                                [
                                    151.9952392578125,
                                    749.7742309570312
                                ]
                            ],
                            "Position": "1",
                            "stacked": [],
                            "stackSize": 0
                        },
                        {
                            "product": "MOUNTAIN_DEW_750ML_PET",
                            "SKU-Code": "shelfscan_00109",
                            "Confidence": "0.95",
                            "Bounding-Box": [
                                [
                                    146.0829315185547,
                                    746.0341186523438
                                ],
                                [
                                    146.0829315185547,
                                    967.1124877929688
                                ],
                                [
                                    224.3432159423828,
                                    967.1124877929688
                                ],
                                [
                                    224.3432159423828,
                                    746.0341186523438
                                ]
                            ],
                            "Position": "2",
                            "stacked": [],
                            "stackSize": 0
                        },
                        {
                            "product": "MOUNTAIN_DEW_750ML_PET",
                            "SKU-Code": "shelfscan_00109",
                            "Confidence": "0.94",
                            "Bounding-Box": [
                                [
                                    215.9533386230469,
                                    744.7344360351562
                                ],
                                [
                                    215.9533386230469,
                                    968.7863159179688
                                ],
                                [
                                    296.1899108886719,
                                    968.7863159179688
                                ],
                                [
                                    296.1899108886719,
                                    744.7344360351562
                                ]
                            ],
                            "Position": "3",
                            "stacked": [],
                            "stackSize": 0
                        },
                        {
                            "product": "MOUNTAIN_DEW_750ML_PET",
                            "SKU-Code": "shelfscan_00109",
                            "Confidence": "0.93",
                            "Bounding-Box": [
                                [
                                    289.019287109375,
                                    735.6553344726562
                                ],
                                [
                                    289.019287109375,
                                    967.8928833007812
                                ],
                                [
                                    366.1689453125,
                                    967.8928833007812
                                ],
                                [
                                    366.1689453125,
                                    735.6553344726562
                                ]
                            ],
                            "Position": "4",
                            "stacked": [],
                            "stackSize": 0
                        },
                        {
                            "product": "MOUNTAIN_DEW_1L_PET",
                            "SKU-Code": "shelfscan_00099",
                            "Confidence": "0.6",
                            "Bounding-Box": [
                                [
                                    358.2294006347656,
                                    711.1195068359375
                                ],
                                [
                                    358.2294006347656,
                                    966.7653198242188
                                ],
                                [
                                    438.6324462890625,
                                    966.7653198242188
                                ],
                                [
                                    438.6324462890625,
                                    711.1195068359375
                                ]
                            ],
                            "Position": "5",
                            "stacked": [],
                            "stackSize": 0
                        },
                        {
                            "product": "MOUNTAIN_DEW_1L_PET",
                            "SKU-Code": "shelfscan_00099",
                            "Confidence": "0.63",
                            "Bounding-Box": [
                                [
                                    431.0279541015625,
                                    709.4597778320312
                                ],
                                [
                                    431.0279541015625,
                                    963.4080200195312
                                ],
                                [
                                    499.7059631347656,
                                    963.4080200195312
                                ],
                                [
                                    499.7059631347656,
                                    709.4597778320312
                                ]
                            ],
                            "Position": "6",
                            "stacked": [],
                            "stackSize": 0
                        }
                    ],
                    "data": [
                        [
                            501,
                            689
                        ],
                        [
                            501,
                            897
                        ],
                        [
                            492,
                            991
                        ],
                        [
                            490,
                            993
                        ],
                        [
                            486,
                            995
                        ],
                        [
                            222,
                            1011
                        ],
                        [
                            51,
                            1011
                        ],
                        [
                            51,
                            689
                        ]
                    ],
                    "position": 3
                },
                {
                    "products": [
                        {
                            "product": "MOUNTAIN_DEW_200ML_RGP",
                            "SKU-Code": "shelfscan_00114",
                            "Confidence": "0.93",
                            "Bounding-Box": [
                                [
                                    75.4605941772461,
                                    1028.267700195312
                                ],
                                [
                                    75.4605941772461,
                                    1244.003295898438
                                ],
                                [
                                    133.3770446777344,
                                    1244.003295898438
                                ],
                                [
                                    133.3770446777344,
                                    1028.267700195312
                                ]
                            ],
                            "Position": "1",
                            "stacked": [],
                            "stackSize": 0
                        },
                        {
                            "product": "MOUNTAIN_DEW_200ML_RGP",
                            "SKU-Code": "shelfscan_00114",
                            "Confidence": "0.93",
                            "Bounding-Box": [
                                [
                                    126.8848114013672,
                                    1022.846557617188
                                ],
                                [
                                    126.8848114013672,
                                    1242.304321289062
                                ],
                                [
                                    186.6524047851562,
                                    1242.304321289062
                                ],
                                [
                                    186.6524047851562,
                                    1022.846557617188
                                ]
                            ],
                            "Position": "2",
                            "stacked": [],
                            "stackSize": 0
                        },
                        {
                            "product": "MOUNTAIN_DEW_200ML_RGP",
                            "SKU-Code": "shelfscan_00114",
                            "Confidence": "0.94",
                            "Bounding-Box": [
                                [
                                    180.5099792480469,
                                    1020.300415039062
                                ],
                                [
                                    180.5099792480469,
                                    1239.669311523438
                                ],
                                [
                                    241.1440124511719,
                                    1239.669311523438
                                ],
                                [
                                    241.1440124511719,
                                    1020.300415039062
                                ]
                            ],
                            "Position": "3",
                            "stacked": [],
                            "stackSize": 0
                        },
                        {
                            "product": "MOUNTAIN_DEW_200ML_RGP",
                            "SKU-Code": "shelfscan_00114",
                            "Confidence": "0.9",
                            "Bounding-Box": [
                                [
                                    236.485107421875,
                                    1007.408020019531
                                ],
                                [
                                    236.485107421875,
                                    1240.125854492188
                                ],
                                [
                                    294.119140625,
                                    1240.125854492188
                                ],
                                [
                                    294.119140625,
                                    1007.408020019531
                                ]
                            ],
                            "Position": "4",
                            "stacked": [],
                            "stackSize": 0
                        },
                        {
                            "product": "MOUNTAIN_DEW_200ML_RGP",
                            "SKU-Code": "shelfscan_00114",
                            "Confidence": "0.92",
                            "Bounding-Box": [
                                [
                                    285.8565063476562,
                                    1018.169616699219
                                ],
                                [
                                    285.8565063476562,
                                    1238.736572265625
                                ],
                                [
                                    343.8727111816406,
                                    1238.736572265625
                                ],
                                [
                                    343.8727111816406,
                                    1018.169616699219
                                ]
                            ],
                            "Position": "5",
                            "stacked": [],
                            "stackSize": 0
                        },
                        {
                            "product": "MOUNTAIN_DEW_200ML_RGP",
                            "SKU-Code": "shelfscan_00114",
                            "Confidence": "0.94",
                            "Bounding-Box": [
                                [
                                    337.239990234375,
                                    1013.430480957031
                                ],
                                [
                                    337.239990234375,
                                    1234.787841796875
                                ],
                                [
                                    391.7320556640625,
                                    1234.787841796875
                                ],
                                [
                                    391.7320556640625,
                                    1013.430480957031
                                ]
                            ],
                            "Position": "6",
                            "stacked": [],
                            "stackSize": 0
                        },
                        {
                            "product": "MOUNTAIN_DEW_200ML_RGP",
                            "SKU-Code": "shelfscan_00114",
                            "Confidence": "0.94",
                            "Bounding-Box": [
                                [
                                    385.8808898925781,
                                    1011.952758789062
                                ],
                                [
                                    385.8808898925781,
                                    1235.08056640625
                                ],
                                [
                                    442.7647399902344,
                                    1235.08056640625
                                ],
                                [
                                    442.7647399902344,
                                    1011.952758789062
                                ]
                            ],
                            "Position": "7",
                            "stacked": [],
                            "stackSize": 0
                        },
                        {
                            "product": "MOUNTAIN_DEW_200ML_RGP",
                            "SKU-Code": "shelfscan_00114",
                            "Confidence": "0.93",
                            "Bounding-Box": [
                                [
                                    436.9287109375,
                                    1008.761840820312
                                ],
                                [
                                    436.9287109375,
                                    1231.751220703125
                                ],
                                [
                                    494.7833862304688,
                                    1231.751220703125
                                ],
                                [
                                    494.7833862304688,
                                    1008.761840820312
                                ]
                            ],
                            "Position": "8",
                            "stacked": [],
                            "stackSize": 0
                        }
                    ],
                    "data": [
                        [
                            492,
                            983
                        ],
                        [
                            492,
                            1100
                        ],
                        [
                            490,
                            1283
                        ],
                        [
                            488,
                            1287
                        ],
                        [
                            484,
                            1290
                        ],
                        [
                            469,
                            1292
                        ],
                        [
                            392,
                            1298
                        ],
                        [
                            70,
                            1321
                        ],
                        [
                            58,
                            1321
                        ],
                        [
                            58,
                            996
                        ],
                        [
                            260,
                            983
                        ]
                    ],
                    "position": 4
                }
            ],
            "data": [
                [
                    28,
                    61
                ],
                [
                    508,
                    61
                ],
                [
                    508,
                    1367
                ],
                [
                    28,
                    1367
                ]
            ],
            "Door-Visible": true
        },
        "Door-2": {
            "Sections": [
                {
                    "products": [
                        {
                            "product": "STING_RED_250ML_PET",
                            "SKU-Code": "shelfscan_00180",
                            "Confidence": "0.94",
                            "Bounding-Box": [
                                [
                                    618.9810791015625,
                                    219.7431640625
                                ],
                                [
                                    618.9810791015625,
                                    385.3169555664062
                                ],
                                [
                                    673.796630859375,
                                    385.3169555664062
                                ],
                                [
                                    673.796630859375,
                                    219.7431640625
                                ]
                            ],
                            "Position": "1",
                            "stacked": [],
                            "stackSize": 0
                        },
                        {
                            "product": "STING_RED_250ML_PET",
                            "SKU-Code": "shelfscan_00180",
                            "Confidence": "0.95",
                            "Bounding-Box": [
                                [
                                    669.3553466796875,
                                    221.3109588623047
                                ],
                                [
                                    669.3553466796875,
                                    386.6394958496094
                                ],
                                [
                                    721.6669921875,
                                    386.6394958496094
                                ],
                                [
                                    721.6669921875,
                                    221.3109588623047
                                ]
                            ],
                            "Position": "2",
                            "stacked": [],
                            "stackSize": 0
                        },
                        {
                            "product": "STING_RED_250ML_PET",
                            "SKU-Code": "shelfscan_00180",
                            "Confidence": "0.94",
                            "Bounding-Box": [
                                [
                                    717.185302734375,
                                    223.0082397460938
                                ],
                                [
                                    717.185302734375,
                                    388.4137878417969
                                ],
                                [
                                    771.605224609375,
                                    388.4137878417969
                                ],
                                [
                                    771.605224609375,
                                    223.0082397460938
                                ]
                            ],
                            "Position": "3",
                            "stacked": [],
                            "stackSize": 0
                        },
                        {
                            "product": "STING_RED_250ML_PET",
                            "SKU-Code": "shelfscan_00180",
                            "Confidence": "0.88",
                            "Bounding-Box": [
                                [
                                    765.7049560546875,
                                    222.1239929199219
                                ],
                                [
                                    765.7049560546875,
                                    388.6226806640625
                                ],
                                [
                                    819.9486694335938,
                                    388.6226806640625
                                ],
                                [
                                    819.9486694335938,
                                    222.1239929199219
                                ]
                            ],
                            "Position": "4",
                            "stacked": [],
                            "stackSize": 0
                        },
                        {
                            "product": "STING_RED_250ML_PET",
                            "SKU-Code": "shelfscan_00180",
                            "Confidence": "0.9",
                            "Bounding-Box": [
                                [
                                    856.8512573242188,
                                    222.1587371826172
                                ],
                                [
                                    856.8512573242188,
                                    390.9668579101562
                                ],
                                [
                                    912.8801879882812,
                                    390.9668579101562
                                ],
                                [
                                    912.8801879882812,
                                    222.1587371826172
                                ]
                            ],
                            "Position": "5",
                            "stacked": [],
                            "stackSize": 0
                        },
                        {
                            "product": "STING_RED_250ML_PET",
                            "SKU-Code": "shelfscan_00180",
                            "Confidence": "0.9",
                            "Bounding-Box": [
                                [
                                    905.4359130859375,
                                    219.7870025634766
                                ],
                                [
                                    905.4359130859375,
                                    390.9090881347656
                                ],
                                [
                                    959.88671875,
                                    390.9090881347656
                                ],
                                [
                                    959.88671875,
                                    219.7870025634766
                                ]
                            ],
                            "Position": "6",
                            "stacked": [],
                            "stackSize": 0
                        },
                        {
                            "product": "STING_RED_250ML_PET",
                            "SKU-Code": "shelfscan_00180",
                            "Confidence": "0.82",
                            "Bounding-Box": [
                                [
                                    955.0625610351562,
                                    220.4936065673828
                                ],
                                [
                                    955.0625610351562,
                                    391.0694274902344
                                ],
                                [
                                    1010.203247070312,
                                    391.0694274902344
                                ],
                                [
                                    1010.203247070312,
                                    220.4936065673828
                                ]
                            ],
                            "Position": "7",
                            "stacked": [],
                            "stackSize": 0
                        }
                    ],
                    "data": [
                        [
                            918,
                            94
                        ],
                        [
                            1004,
                            101
                        ],
                        [
                            1021,
                            103
                        ],
                        [
                            1021,
                            188
                        ],
                        [
                            1010,
                            369
                        ],
                        [
                            1008,
                            393
                        ],
                        [
                            1002,
                            408
                        ],
                        [
                            942,
                            408
                        ],
                        [
                            616,
                            395
                        ],
                        [
                            616,
                            94
                        ]
                    ],
                    "position": 1
                },
                {
                    "products": [
                        {
                            "product": "STING_RED_250ML_PET",
                            "SKU-Code": "shelfscan_00180",
                            "Confidence": "0.95",
                            "Bounding-Box": [
                                [
                                    611.7428588867188,
                                    506.6974182128906
                                ],
                                [
                                    611.7428588867188,
                                    671.0192260742188
                                ],
                                [
                                    669.5499877929688,
                                    671.0192260742188
                                ],
                                [
                                    669.5499877929688,
                                    506.6974182128906
                                ]
                            ],
                            "Position": "1",
                            "stacked": [],
                            "stackSize": 0
                        },
                        {
                            "product": "MOUNTAIN_DEW_250ML_PET",
                            "SKU-Code": "shelfscan_00105",
                            "Confidence": "0.61",
                            "Bounding-Box": [
                                [
                                    666.583251953125,
                                    507.5722351074219
                                ],
                                [
                                    666.583251953125,
                                    670.7509765625
                                ],
                                [
                                    720.2152099609375,
                                    670.7509765625
                                ],
                                [
                                    720.2152099609375,
                                    507.5722351074219
                                ]
                            ],
                            "Position": "2",
                            "stacked": [],
                            "stackSize": 0
                        }
                    ],
                    "data": [
                        [
                            1014,
                            388
                        ],
                        [
                            1014,
                            427
                        ],
                        [
                            997,
                            689
                        ],
                        [
                            993,
                            702
                        ],
                        [
                            609,
                            702
                        ],
                        [
                            609,
                            388
                        ]
                    ],
                    "position": 2
                },
                {
                    "products": [
                        {
                            "product": "CREAMBELL_COFFEE_180ML_PET",
                            "SKU-Code": "shelfscan_00047",
                            "Confidence": "0.78",
                            "Bounding-Box": [
                                [
                                    606.3260498046875,
                                    828.7244873046875
                                ],
                                [
                                    606.3260498046875,
                                    970.3826904296875
                                ],
                                [
                                    642.2888793945312,
                                    970.3826904296875
                                ],
                                [
                                    642.2888793945312,
                                    828.7244873046875
                                ]
                            ],
                            "Position": "1",
                            "stacked": [],
                            "stackSize": 0
                        },
                        {
                            "product": "CREAMBELL_COFFEE_180ML_PET",
                            "SKU-Code": "shelfscan_00047",
                            "Confidence": "0.9",
                            "Bounding-Box": [
                                [
                                    640.98046875,
                                    831.6824951171875
                                ],
                                [
                                    640.98046875,
                                    970.5642700195312
                                ],
                                [
                                    683.4495849609375,
                                    970.5642700195312
                                ],
                                [
                                    683.4495849609375,
                                    831.6824951171875
                                ]
                            ],
                            "Position": "2",
                            "stacked": [],
                            "stackSize": 0
                        },
                        {
                            "product": "CREAMBELL_COFFEE_180ML_PET",
                            "SKU-Code": "shelfscan_00047",
                            "Confidence": "0.93",
                            "Bounding-Box": [
                                [
                                    681.0843505859375,
                                    829.6052856445312
                                ],
                                [
                                    681.0843505859375,
                                    971.6118774414062
                                ],
                                [
                                    724.6254272460938,
                                    971.6118774414062
                                ],
                                [
                                    724.6254272460938,
                                    829.6052856445312
                                ]
                            ],
                            "Position": "3",
                            "stacked": [],
                            "stackSize": 0
                        },
                        {
                            "product": "CREAMBELL_COFFEE_180ML_PET",
                            "SKU-Code": "shelfscan_00047",
                            "Confidence": "0.93",
                            "Bounding-Box": [
                                [
                                    722.7191162109375,
                                    831.0850219726562
                                ],
                                [
                                    722.7191162109375,
                                    971.877685546875
                                ],
                                [
                                    767.4900512695312,
                                    971.877685546875
                                ],
                                [
                                    767.4900512695312,
                                    831.0850219726562
                                ]
                            ],
                            "Position": "4",
                            "stacked": [],
                            "stackSize": 0
                        },
                        {
                            "product": "CREAMBELL_COFFEE_180ML_PET",
                            "SKU-Code": "shelfscan_00047",
                            "Confidence": "0.93",
                            "Bounding-Box": [
                                [
                                    765.6026000976562,
                                    825.4721069335938
                                ],
                                [
                                    765.6026000976562,
                                    974.0682983398438
                                ],
                                [
                                    811.4588012695312,
                                    974.0682983398438
                                ],
                                [
                                    811.4588012695312,
                                    825.4721069335938
                                ]
                            ],
                            "Position": "5",
                            "stacked": [],
                            "stackSize": 0
                        },
                        {
                            "product": "CREAMBELL_COFFEE_180ML_PET",
                            "SKU-Code": "shelfscan_00047",
                            "Confidence": "0.93",
                            "Bounding-Box": [
                                [
                                    808.3715209960938,
                                    829.5179443359375
                                ],
                                [
                                    808.3715209960938,
                                    972.1492919921875
                                ],
                                [
                                    854.1207885742188,
                                    972.1492919921875
                                ],
                                [
                                    854.1207885742188,
                                    829.5179443359375
                                ]
                            ],
                            "Position": "6",
                            "stacked": [],
                            "stackSize": 0
                        },
                        {
                            "product": "CREAMBELL_COFFEE_180ML_PET",
                            "SKU-Code": "shelfscan_00047",
                            "Confidence": "0.94",
                            "Bounding-Box": [
                                [
                                    850.5331420898438,
                                    831.09716796875
                                ],
                                [
                                    850.5331420898438,
                                    970.4440307617188
                                ],
                                [
                                    896.0369262695312,
                                    970.4440307617188
                                ],
                                [
                                    896.0369262695312,
                                    831.09716796875
                                ]
                            ],
                            "Position": "7",
                            "stacked": [],
                            "stackSize": 0
                        },
                        {
                            "product": "CREAMBELL_KESAR_BADAM_180ML_PET",
                            "SKU-Code": "shelfscan_00049",
                            "Confidence": "0.93",
                            "Bounding-Box": [
                                [
                                    893.1307983398438,
                                    832.6820068359375
                                ],
                                [
                                    893.1307983398438,
                                    968.7671508789062
                                ],
                                [
                                    938.598876953125,
                                    968.7671508789062
                                ],
                                [
                                    938.598876953125,
                                    832.6820068359375
                                ]
                            ],
                            "Position": "8",
                            "stacked": [],
                            "stackSize": 0
                        },
                        {
                            "product": "CREAMBELL_KESAR_BADAM_180ML_PET",
                            "SKU-Code": "shelfscan_00049",
                            "Confidence": "0.87",
                            "Bounding-Box": [
                                [
                                    935.0850219726562,
                                    813.7244262695312
                                ],
                                [
                                    935.0850219726562,
                                    967.6780395507812
                                ],
                                [
                                    985.2453002929688,
                                    967.6780395507812
                                ],
                                [
                                    985.2453002929688,
                                    813.7244262695312
                                ]
                            ],
                            "Position": "9",
                            "stacked": [],
                            "stackSize": 0
                        }
                    ],
                    "data": [
                        [
                            997,
                            682
                        ],
                        [
                            999,
                            697
                        ],
                        [
                            999,
                            714
                        ],
                        [
                            995,
                            929
                        ],
                        [
                            993,
                            976
                        ],
                        [
                            991,
                            981
                        ],
                        [
                            989,
                            983
                        ],
                        [
                            985,
                            985
                        ],
                        [
                            972,
                            987
                        ],
                        [
                            903,
                            996
                        ],
                        [
                            601,
                            996
                        ],
                        [
                            601,
                            682
                        ]
                    ],
                    "position": 3
                },
                {
                    "products": [
                        {
                            "product": "MOUNTAIN_DEW_200ML_RGP",
                            "SKU-Code": "shelfscan_00114",
                            "Confidence": "0.93",
                            "Bounding-Box": [
                                [
                                    604.3115844726562,
                                    1008.774780273438
                                ],
                                [
                                    604.3115844726562,
                                    1232.328857421875
                                ],
                                [
                                    658.388427734375,
                                    1232.328857421875
                                ],
                                [
                                    658.388427734375,
                                    1008.774780273438
                                ]
                            ],
                            "Position": "1",
                            "stacked": [],
                            "stackSize": 0
                        },
                        {
                            "product": "MOUNTAIN_DEW_200ML_RGP",
                            "SKU-Code": "shelfscan_00114",
                            "Confidence": "0.87",
                            "Bounding-Box": [
                                [
                                    652.333984375,
                                    999.1564331054688
                                ],
                                [
                                    652.333984375,
                                    1218.944458007812
                                ],
                                [
                                    698.6836547851562,
                                    1218.944458007812
                                ],
                                [
                                    698.6836547851562,
                                    999.1564331054688
                                ]
                            ],
                            "Position": "2",
                            "stacked": [],
                            "stackSize": 0
                        },
                        {
                            "product": "TROP_SLICE_200ML_RGP",
                            "SKU-Code": "shelfscan_00167",
                            "Confidence": "0.79",
                            "Bounding-Box": [
                                [
                                    693.155517578125,
                                    1011.5859375
                                ],
                                [
                                    693.155517578125,
                                    1219.185546875
                                ],
                                [
                                    743.7960205078125,
                                    1219.185546875
                                ],
                                [
                                    743.7960205078125,
                                    1011.5859375
                                ]
                            ],
                            "Position": "3",
                            "stacked": [],
                            "stackSize": 0
                        },
                        {
                            "product": "TROP_SLICE_200ML_RGP",
                            "SKU-Code": "shelfscan_00167",
                            "Confidence": "0.77",
                            "Bounding-Box": [
                                [
                                    735.8118896484375,
                                    999.5973510742188
                                ],
                                [
                                    735.8118896484375,
                                    1203.491455078125
                                ],
                                [
                                    780.2734375,
                                    1203.491455078125
                                ],
                                [
                                    780.2734375,
                                    999.5973510742188
                                ]
                            ],
                            "Position": "4",
                            "stacked": [],
                            "stackSize": 0
                        },
                        {
                            "product": "TROP_SLICE_200ML_RGP",
                            "SKU-Code": "shelfscan_00167",
                            "Confidence": "0.76",
                            "Bounding-Box": [
                                [
                                    773.7686767578125,
                                    997.7501831054688
                                ],
                                [
                                    773.7686767578125,
                                    1208.520385742188
                                ],
                                [
                                    825.836669921875,
                                    1208.520385742188
                                ],
                                [
                                    825.836669921875,
                                    997.7501831054688
                                ]
                            ],
                            "Position": "5",
                            "stacked": [],
                            "stackSize": 0
                        },
                        {
                            "product": "PEPSI_COLA_200ML_RGP",
                            "SKU-Code": "shelfscan_00146",
                            "Confidence": "0.91",
                            "Bounding-Box": [
                                [
                                    827.0677490234375,
                                    1001.465454101562
                                ],
                                [
                                    827.0677490234375,
                                    1222.91845703125
                                ],
                                [
                                    886.2008666992188,
                                    1222.91845703125
                                ],
                                [
                                    886.2008666992188,
                                    1001.465454101562
                                ]
                            ],
                            "Position": "6",
                            "stacked": [],
                            "stackSize": 0
                        },
                        {
                            "product": "PEPSI_COLA_200ML_RGP",
                            "SKU-Code": "shelfscan_00146",
                            "Confidence": "0.92",
                            "Bounding-Box": [
                                [
                                    879.2498168945312,
                                    1001.083251953125
                                ],
                                [
                                    879.2498168945312,
                                    1220.315063476562
                                ],
                                [
                                    932.7345581054688,
                                    1220.315063476562
                                ],
                                [
                                    932.7345581054688,
                                    1001.083251953125
                                ]
                            ],
                            "Position": "7",
                            "stacked": [],
                            "stackSize": 0
                        },
                        {
                            "product": "PEPSI_COLA_200ML_RGP",
                            "SKU-Code": "shelfscan_00146",
                            "Confidence": "0.91",
                            "Bounding-Box": [
                                [
                                    925.9171142578125,
                                    996.00341796875
                                ],
                                [
                                    925.9171142578125,
                                    1224.305908203125
                                ],
                                [
                                    984.6553955078125,
                                    1224.305908203125
                                ],
                                [
                                    984.6553955078125,
                                    996.00341796875
                                ]
                            ],
                            "Position": "8",
                            "stacked": [],
                            "stackSize": 0
                        }
                    ],
                    "data": [
                        [
                            999,
                            976
                        ],
                        [
                            999,
                            1021
                        ],
                        [
                            989,
                            1256
                        ],
                        [
                            987,
                            1260
                        ],
                        [
                            985,
                            1262
                        ],
                        [
                            982,
                            1264
                        ],
                        [
                            970,
                            1266
                        ],
                        [
                            955,
                            1268
                        ],
                        [
                            938,
                            1270
                        ],
                        [
                            904,
                            1272
                        ],
                        [
                            789,
                            1277
                        ],
                        [
                            616,
                            1283
                        ],
                        [
                            601,
                            1283
                        ],
                        [
                            601,
                            983
                        ],
                        [
                            612,
                            976
                        ]
                    ],
                    "position": 4
                }
            ],
            "data": [
                [
                    589,
                    82
                ],
                [
                    1063,
                    82
                ],
                [
                    1063,
                    1336
                ],
                [
                    589,
                    1336
                ]
            ],
            "Door-Visible": true
        }
    }
}