# Image Capture & Bounding Box Scaling - Complete Implementation

## 🎯 Problem Solved

When capturing the refrigerator planogram as an image with high quality (`pixelRatio: 3`), the image dimensions don't match browser coordinates. This caused bounding boxes to be misaligned when overlaying on captured images.

## ✅ Solution Implemented

### 1. **Scaling Function** (`scaleBackendBoundingBoxes`)
A new utility function that multiplies all bounding box coordinates by the pixel ratio to match captured image dimensions.

### 2. **UI Toggle** (State Preview Component)
Users can switch between browser coordinates (1x) and scaled coordinates (3x) with a single click.

### 3. **Comprehensive Documentation**
Two detailed guides explaining the scaling system and providing quick examples.

---

## 📁 Files Modified

### 1. `lib/backend-transform.ts`
**Added**: `scaleBackendBoundingBoxes()` function

```typescript
export function scaleBackendBoundingBoxes(
  backendData: BackendOutput,
  pixelRatio: number = 3
): BackendOutput
```

**Features**:
- ✅ Scales all bounding box coordinates
- ✅ Scales product width/height
- ✅ Recursively handles stacked products
- ✅ Scales dimension metadata
- ✅ Deep clones (doesn't mutate original)
- ✅ Type-safe with full TypeScript support

### 2. `app/planogram/components/statePreview.tsx`
**Added**: Toggle button and scaled coordinate support

**Changes**:
- Added `useScaledCoords` state (default: `true`)
- Import `scaleBackendBoundingBoxes` function
- Apply scaling conditionally based on toggle
- New UI with toggle button and status indicator
- Visual feedback: Green "3x Scaled" or Gray "1x Browser"

### 3. Documentation Files Created
- `BOUNDING-BOX-SCALING-FOR-IMAGES.md` - Complete technical guide
- `BOUNDING-BOX-SCALING-QUICK-EXAMPLE.md` - Visual examples and quick reference

---

## 🚀 How It Works

### Image Capture (No Changes Needed)

```typescript
// lib/capture-utils.ts - Already configured correctly
const blob = await htmlToImage.toBlob(element, {
  pixelRatio: 3,  // 3x internal resolution for quality
  width: 301,     // Browser width
  height: 788,    // Browser height
});
// Result: 903×2364px image (3× browser dimensions)
```

### Coordinate Transformation

```typescript
// Step 1: Convert frontend → backend (browser coordinates)
const backendData = convertFrontendToBackend(refrigerator, 301, 788);

// Bounding box in browser coords:
// [[16, 116], [16, 296], [96, 296], [96, 116]]

// Step 2: Scale for image overlay
const scaledData = scaleBackendBoundingBoxes(backendData, 3);

// Bounding box in image coords (3x):
// [[48, 348], [48, 888], [288, 888], [288, 348]]
```

### UI Toggle Flow

```
User clicks [3x Scaled] button
         ↓
useScaledCoords = true
         ↓
useMemo recalculates backendData
         ↓
scaleBackendBoundingBoxes(baseData, 3)
         ↓
All coordinates × 3
         ↓
JSON shows scaled coordinates
         ↓
User copies JSON → Perfect alignment on image! ✨
```

---

## 📊 Coordinate Examples

### Example 1: First Product Position

| Coordinate | Browser (1x) | Image (3x) |
|-----------|--------------|------------|
| Top-Left X | 16px | 48px |
| Top-Left Y | 116px | 348px |
| Width | 80px | 240px |
| Height | 180px | 540px |

### Example 2: Dimensions

| Element | Browser (1x) | Image (3x) |
|---------|--------------|------------|
| Content Width | 301px | 903px |
| Content Height | 788px | 2364px |
| Total Width | 333px | 999px |
| Total Height | 1004px | 3012px |
| Frame Border | 16px | 48px |
| Header Height | 100px | 300px |
| Grille Height | 90px | 270px |

---

## 🎨 UI Changes

### State Preview Header (Before)
```
┌─────────────────────────────────────────┐
│ Live State Preview (Backend Format)     │
│                                         │
│                           [Copy JSON]   │
└─────────────────────────────────────────┘
```

### State Preview Header (After)
```
┌──────────────────────────────────────────────────┐
│ Live State Preview (Backend Format)              │
│ ✓ Scaled 3x (matches captured image)            │
│                                                  │
│              [3x Scaled] [Copy JSON]             │
└──────────────────────────────────────────────────┘
```

**Button States**:
- 🟢 **3x Scaled** (Green) - Coordinates for captured images
- ⚪ **1x Browser** (Gray) - Browser coordinates

**Status Text**:
- "✓ Scaled 3x (matches captured image at pixelRatio: 3)"
- "Browser coordinates (1x)"

---

## 🧪 Testing Guide

### Test 1: Verify Scaling Math
1. Open State Preview
2. Toggle to "1x Browser"
3. Note a coordinate, e.g., `[16, 116]`
4. Toggle to "3x Scaled"
5. Verify it's multiplied by 3: `[48, 348]` ✅

### Test 2: Image Overlay Alignment
1. Capture refrigerator image (Download or Clipboard)
2. Toggle to "3x Scaled" in State Preview
3. Copy JSON to clipboard
4. Open captured image in image editor
5. Draw rectangle using bounding box coordinates
6. Verify perfect alignment with product ✅

### Test 3: Stacked Products
1. Create a stack with 2-3 products
2. Capture image
3. Copy JSON (3x Scaled)
4. Verify all stacked products have scaled coordinates ✅

### Test 4: Dimensions Metadata
1. Toggle to "3x Scaled"
2. Check `dimensions` object in JSON
3. Verify all values are × 3:
   - `width: 903` (301 × 3)
   - `height: 2364` (788 × 3)
   - `frameBorder: 48` (16 × 3)
   - etc. ✅

---

## 📝 Usage Examples

### Example 1: Copy Scaled JSON for ML/CV Pipeline

```typescript
// User workflow:
// 1. Click "Download Image" → Gets 903×2364px image
// 2. Toggle to "3x Scaled"
// 3. Click "Copy JSON" → Gets scaled coordinates
// 4. Send both to ML pipeline → Perfect alignment!
```

### Example 2: Debug in Browser

```typescript
// User workflow:
// 1. Toggle to "1x Browser"
// 2. Copy JSON
// 3. Compare with CSS/DevTools → Matches perfectly!
```

### Example 3: Programmatic Scaling

```typescript
import { 
  convertFrontendToBackend, 
  scaleBackendBoundingBoxes 
} from '@/lib/backend-transform';

// Get browser coordinates
const browserData = convertFrontendToBackend(
  refrigerator,
  301,
  788
);

// Scale for different quality levels
const scaled2x = scaleBackendBoundingBoxes(browserData, 2);
const scaled3x = scaleBackendBoundingBoxes(browserData, 3);
const scaled4x = scaleBackendBoundingBoxes(browserData, 4);

// Use appropriate version based on capture pixelRatio
```

---

## 🎯 Benefits

### For Users
✅ **One-Click Toggle** - Easy switching between coordinate systems  
✅ **Visual Feedback** - Clear indication of which mode is active  
✅ **Perfect Alignment** - Bounding boxes match captured images exactly

### For Developers
✅ **Type-Safe** - Full TypeScript support  
✅ **Non-Destructive** - Original data never mutated  
✅ **Flexible** - Works with any pixel ratio  
✅ **Documented** - Comprehensive guides included

### For ML/CV Pipelines
✅ **Accurate Coordinates** - Match captured image dimensions  
✅ **Consistent Format** - Same structure as before  
✅ **Easy Integration** - Just use scaled version

---

## 🔧 Configuration

### Change Pixel Ratio for Image Capture

If you want different quality:

```typescript
// lib/capture-utils.ts
const blob = await htmlToImage.toBlob(element, {
  pixelRatio: 4,  // Change from 3 to 4 for even higher quality
  // ...
});
```

Then scale accordingly:

```typescript
// In your code
const scaledData = scaleBackendBoundingBoxes(backendData, 4);
```

### Default Toggle State

Change the default in `statePreview.tsx`:

```typescript
const [useScaledCoords, setUseScaledCoords] = useState(true);  // Default: Scaled
// or
const [useScaledCoords, setUseScaledCoords] = useState(false); // Default: Browser
```

---

## 📐 Coordinate System Reference

```
BROWSER VIEW (333×1004px)
┌─────────────────────────────┐
│ Frame (16px)                │
│ ┌─────────────────────────┐ │
│ │ Header (100px)          │ │
│ ├─────────────────────────┤ │
│ │                         │ │
│ │ Content (301×788)       │ │
│ │                         │ │
│ │ Product: [16, 116]      │ │
│ │ Size: 80×180            │ │
│ │                         │ │
│ ├─────────────────────────┤ │
│ │ Grille (90px)           │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘

         × 3 (pixelRatio)
                ↓

CAPTURED IMAGE (999×3012px)
┌─────────────────────────────┐
│ Frame (48px)                │
│ ┌─────────────────────────┐ │
│ │ Header (300px)          │ │
│ ├─────────────────────────┤ │
│ │                         │ │
│ │ Content (903×2364)      │ │
│ │                         │ │
│ │ Product: [48, 348]      │ │
│ │ Size: 240×540           │ │
│ │                         │ │
│ ├─────────────────────────┤ │
│ │ Grille (270px)          │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

---

## 🐛 Troubleshooting

### Bounding boxes don't align with image

**Check**:
1. ✅ Is toggle set to "3x Scaled"?
2. ✅ Does image pixelRatio match scaling factor?
3. ✅ Are you using the correct JSON version?

### Toggle button not appearing

**Check**:
1. ✅ Is State Preview component mounted?
2. ✅ Check browser console for errors
3. ✅ Verify `useScaledCoords` state exists

### Coordinates seem wrong

**Check**:
1. ✅ Verify browser dimensions are correct (301×788)
2. ✅ Check if frame/header offsets are included
3. ✅ Ensure stacking order is correct

---

## 📚 Related Documentation

- `BOUNDING-BOX-ABSOLUTE-FINAL.md` - Absolute coordinate system
- `IMAGE-CAPTURE-EXACT-DIMENSIONS.md` - Image capture details
- `BOUNDING-BOX-SCALING-FOR-IMAGES.md` - Technical scaling guide
- `BOUNDING-BOX-SCALING-QUICK-EXAMPLE.md` - Quick examples

---

## ✨ Summary

**What was added**:
- ✅ `scaleBackendBoundingBoxes()` function in `backend-transform.ts`
- ✅ Toggle button in State Preview component
- ✅ Visual status indicator for current mode
- ✅ Two comprehensive documentation files

**What it solves**:
- ✅ Bounding box alignment on captured images
- ✅ Easy switching between coordinate systems
- ✅ Perfect overlay for ML/CV pipelines

**How to use**:
1. Capture image (automatically 3x quality)
2. Toggle to "3x Scaled" in State Preview
3. Copy JSON
4. Overlay on image → Perfect alignment! 🎯

---

**Implementation Date**: Based on conversation summary  
**Status**: ✅ Complete and Tested  
**Pixel Ratio**: 3 (configurable)  
**Coordinate Systems**: Browser (1x) and Image (3x)
