# Bounding Box Scaling for Captured Images

## Problem

When capturing the refrigerator as an image with `pixelRatio: 3`, the image is rendered at **3x internal resolution** but maintains the browser's display dimensions. This creates a mismatch:

- **Browser dimensions**: 301×788px (what you see on screen)
- **Captured image dimensions**: 903×2364px (3x internal resolution)

If bounding boxes use browser coordinates (301×788), they won't align with the captured image (903×2364).

## Solution

The `scaleBackendBoundingBoxes()` function multiplies all bounding box coordinates by the pixel ratio (3x) to match the captured image coordinates.

## Usage

### 1. Get Base Backend Data (Browser Coordinates)

```typescript
import { convertFrontendToBackend } from '@/lib/backend-transform';

const baseData = convertFrontendToBackend(
  refrigerator,
  layoutWidth,
  layoutHeight
);
// Bounding boxes are in browser coordinates (1x)
```

### 2. Scale for Captured Images

```typescript
import { scaleBackendBoundingBoxes } from '@/lib/backend-transform';

const scaledData = scaleBackendBoundingBoxes(baseData, 3);
// Bounding boxes are now scaled 3x to match captured image
```

### 3. Complete Example

```typescript
import { 
  convertFrontendToBackend, 
  scaleBackendBoundingBoxes 
} from '@/lib/backend-transform';

// Step 1: Convert frontend data to backend format
const backendData = convertFrontendToBackend(
  refrigerator,
  301, // Browser width
  788  // Browser height
);

// Step 2: Scale for image overlay (pixelRatio: 3)
const scaledForImage = scaleBackendBoundingBoxes(backendData, 3);

// Now scaledForImage coordinates match the 903×2364px captured image
```

## What Gets Scaled?

The function scales **everything** by the pixel ratio:

### 1. Product Bounding Boxes
```json
// Before (browser coords)
"Bounding-Box": [[16, 116], [16, 296], [96, 296], [96, 116]]

// After (3x scaled for image)
"Bounding-Box": [[48, 348], [48, 888], [288, 888], [288, 348]]
```

### 2. Product Dimensions
```json
// Before
{ "width": 80, "height": 180 }

// After
{ "width": 240, "height": 540 }
```

### 3. Stacked Products
All stacked products are recursively scaled as well.

### 4. Dimensions Metadata
```json
// Before
{
  "width": 301,
  "height": 788,
  "totalWidth": 333,
  "totalHeight": 1004,
  "headerHeight": 100,
  "grilleHeight": 90,
  "frameBorder": 16
}

// After (3x)
{
  "width": 903,
  "height": 2364,
  "totalWidth": 999,
  "totalHeight": 3012,
  "headerHeight": 300,
  "grilleHeight": 270,
  "frameBorder": 48
}
```

## UI Toggle in State Preview

The State Preview component now includes a toggle button:

- **🟢 3x Scaled** - Bounding boxes match captured images (pixelRatio: 3)
- **⚪ 1x Browser** - Bounding boxes match browser coordinates

### Visual Indicator

```
Live State Preview (Backend Format)
✓ Scaled 3x (matches captured image at pixelRatio: 3)
```

or

```
Live State Preview (Backend Format)
Browser coordinates (1x)
```

## When to Use Each Version?

### Use 3x Scaled When:
- ✅ Overlaying bounding boxes on captured images
- ✅ Sending to ML/CV systems that process captured images
- ✅ Exporting for external tools that use screenshots

### Use 1x Browser When:
- ✅ Debugging in browser DevTools
- ✅ Comparing with CSS dimensions
- ✅ Backend systems that work with logical dimensions

## Implementation Details

### Function Signature

```typescript
export function scaleBackendBoundingBoxes(
  backendData: BackendOutput,
  pixelRatio: number = 3
): BackendOutput
```

### Features

1. **Deep Clone** - Original data is never mutated
2. **Recursive Scaling** - Stacked products are handled correctly
3. **All Coordinates** - Bounding boxes, dimensions, metadata all scaled
4. **Type Safe** - Full TypeScript support with `BackendOutput` interface

### Performance

- Uses `JSON.parse(JSON.stringify())` for deep cloning (fast for this data size)
- Scales all coordinates in a single pass
- O(n) complexity where n = number of products

## Image Capture Integration

```typescript
// lib/capture-utils.ts
const blob = await htmlToImage.toBlob(element, {
  pixelRatio: 3,  // 3x internal resolution
  width,          // Browser width (e.g., 301px)
  height,         // Browser height (e.g., 788px)
});

// Result: 903×2364px image (3× browser dimensions)
// Bounding boxes MUST be scaled by 3× to match
```

## Coordinate System Reference

```
┌─────────────────────────────────────┐
│  Refrigerator Component             │
│  Browser: 333×1004px                │
│  Image:   999×3012px (3x)           │
│                                     │
│  ┌───────────────────────┐          │
│  │ Frame (16px → 48px)   │          │
│  │ ┌─────────────────┐   │          │
│  │ │ Header (100→300)│   │          │
│  │ ├─────────────────┤   │          │
│  │ │                 │   │          │
│  │ │   Product Area  │   │          │
│  │ │   301×788px     │   │          │
│  │ │   (903×2364 @3x)│   │          │
│  │ │                 │   │          │
│  │ ├─────────────────┤   │          │
│  │ │ Grille (90→270) │   │          │
│  │ └─────────────────┘   │          │
│  └───────────────────────┘          │
└─────────────────────────────────────┘
```

## Testing

1. **Capture an image** with the download or clipboard button
2. **Copy backend JSON** with "3x Scaled" enabled
3. **Overlay bounding boxes** on the captured image
4. **Verify alignment** - boxes should match product positions exactly

## Related Files

- `lib/backend-transform.ts` - Transform and scaling functions
- `lib/capture-utils.ts` - Image capture with pixelRatio: 3
- `app/planogram/components/statePreview.tsx` - UI with scaling toggle
- `app/planogram/components/BoundingBoxOverlay.tsx` - Visual debug overlay

## Summary

✅ **Browser coordinates** → Use `convertFrontendToBackend()`  
✅ **Image coordinates** → Use `scaleBackendBoundingBoxes(data, 3)`  
✅ **Toggle in UI** → State Preview component  
✅ **Pixel-perfect alignment** → Bounding boxes match captured images exactly
