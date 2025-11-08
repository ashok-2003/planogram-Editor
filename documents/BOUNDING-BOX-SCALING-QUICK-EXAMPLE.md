# Bounding Box Scaling - Quick Example

## The Problem Visualized

```
┌─────────────────────────────────────────────────────────┐
│  Browser View (333×1004px)                              │
│                                                         │
│  Product at position (16, 116)                         │
│  Size: 80×180px                                        │
│                                                         │
│     ┌──────┐  ← Bounding box in browser coordinates   │
│     │      │     [[16, 116], [16, 296], [96, 296], ... │
│     │ 80px │                                            │
│     │      │                                            │
│     │180px │                                            │
│     │      │                                            │
│     └──────┘                                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

When you capture this with `pixelRatio: 3`:

```
┌──────────────────────────────────────────────────────────────┐
│  Captured Image (999×3012px) - 3x larger!                   │
│                                                              │
│  Product at position (48, 348) - 3x coordinates!            │
│  Size: 240×540px - 3x size!                                 │
│                                                              │
│     ┌─────────────────┐  ← Bounding box MUST be 3x        │
│     │                 │     [[48, 348], [48, 888],         │
│     │     240px       │      [288, 888], [288, 348]]       │
│     │                 │                                     │
│     │                 │                                     │
│     │     540px       │                                     │
│     │                 │                                     │
│     │                 │                                     │
│     │                 │                                     │
│     └─────────────────┘                                     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## The Solution

```typescript
// ❌ WRONG - Browser coordinates don't match image
const backendData = convertFrontendToBackend(refrigerator, 301, 788);
// Bounding box: [[16, 116], ...] - only 16px from edge
// Image is 999px wide, so 16px is too small! ❌

// ✅ CORRECT - Scale by pixelRatio
const backendData = convertFrontendToBackend(refrigerator, 301, 788);
const scaledData = scaleBackendBoundingBoxes(backendData, 3);
// Bounding box: [[48, 348], ...] - 48px from edge (3x 16px)
// Perfect match for 999px wide image! ✅
```

## Example Product

### Browser Coordinates (1x)
```json
{
  "product": "Aquafina 1L",
  "SKU-Code": "sku-aquafina-1l",
  "width": 80,
  "height": 180,
  "Bounding-Box": [
    [16, 116],   // Top-left: 16px from left, 116px from top
    [16, 296],   // Bottom-left
    [96, 296],   // Bottom-right: 96px from left (16 + 80 width)
    [96, 116]    // Top-right
  ]
}
```

### Scaled for Image (3x)
```json
{
  "product": "Aquafina 1L",
  "SKU-Code": "sku-aquafina-1l",
  "width": 240,     // 80 × 3 = 240
  "height": 540,    // 180 × 3 = 540
  "Bounding-Box": [
    [48, 348],      // 16 × 3 = 48,  116 × 3 = 348
    [48, 888],      // 16 × 3 = 48,  296 × 3 = 888
    [288, 888],     // 96 × 3 = 288, 296 × 3 = 888
    [288, 348]      // 96 × 3 = 288, 116 × 3 = 348
  ]
}
```

## Usage Pattern

```typescript
// Step 1: Get your refrigerator data
const refrigerator = usePlanogramStore.getState().refrigerator;

// Step 2: Convert to backend format (browser coordinates)
const backendData = convertFrontendToBackend(
  refrigerator,
  301,  // Browser width
  788   // Browser height
);

// Step 3: Scale for image overlay
const scaledForImage = scaleBackendBoundingBoxes(backendData, 3);

// Step 4: Use scaled data with captured image
// Now coordinates match the 903×2364px image perfectly!
```

## Testing the Alignment

1. **Capture the refrigerator** (Download or Copy to Clipboard)
2. **Toggle to "3x Scaled"** in State Preview
3. **Copy the JSON**
4. **Open image in any tool** (Photoshop, GIMP, Paint.NET)
5. **Draw rectangles** using the bounding box coordinates
6. **Verify perfect alignment** ✨

## Math Reference

```
Browser coordinate × pixelRatio = Image coordinate

Examples:
- 16px × 3 = 48px
- 80px × 3 = 240px
- 116px × 3 = 348px
- 301px × 3 = 903px
- 788px × 3 = 2364px
```

## Why This Matters

### Without Scaling (❌ Misaligned)
```
Image: 999×3012px
Bounding box: [16, 116] → Only 16px from edge
Visual: Box appears in wrong position! 😞
```

### With Scaling (✅ Perfect)
```
Image: 999×3012px
Bounding box: [48, 348] → Scaled correctly (16×3, 116×3)
Visual: Box aligns perfectly with product! 🎯
```

## Quick Commands

```typescript
// Import both functions
import { 
  convertFrontendToBackend, 
  scaleBackendBoundingBoxes 
} from '@/lib/backend-transform';

// Get browser coords
const browserData = convertFrontendToBackend(fridge, w, h);

// Get image coords (3x)
const imageData = scaleBackendBoundingBoxes(browserData, 3);

// Get image coords (2x) - if you change pixelRatio to 2
const imageData2x = scaleBackendBoundingBoxes(browserData, 2);

// Get image coords (4x) - super high quality
const imageData4x = scaleBackendBoundingBoxes(browserData, 4);
```

## State Preview Toggle

Look for this in the UI:

```
┌─────────────────────────────────────────────────┐
│ Live State Preview (Backend Format)             │
│ ✓ Scaled 3x (matches captured image)           │
│                                                 │
│ [3x Scaled] [Copy JSON]  ← Click to toggle     │
└─────────────────────────────────────────────────┘
```

- **Green "3x Scaled"** = Coordinates for captured image
- **Gray "1x Browser"** = Coordinates for browser dimensions

## Summary

🎯 **Always scale by pixelRatio when overlaying on captured images**  
📐 **Browser: 301×788 → Image: 903×2364 (when pixelRatio: 3)**  
🔢 **All coordinates × 3 = Perfect alignment**  
🎨 **Toggle in UI for easy switching**
