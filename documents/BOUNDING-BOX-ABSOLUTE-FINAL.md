# ✅ Bounding Box Absolute Coordinates - IMPLEMENTED

## Overview
Bounding boxes now use **ABSOLUTE coordinates** with origin (0,0) at the refrigerator's **top-left corner**, including ALL offsets (frame border + header + grille).

## Coordinate System

```
┌─────────────────────────────────────┐ ← (0, 0) ORIGIN
│  Frame Border (16px)                │
│  ┌───────────────────────────────┐  │
│  │  Header (100px)               │  │
│  │  - Badge, dimensions          │  │
│  ├───────────────────────────────┤  │
│  │  Content Area                 │  │ ← Content starts at (16, 116)
│  │  ┌─────────────────────────┐  │  │
│  │  │ First product at (16,116)│  │  │
│  │  │ with absolute coords     │  │  │
│  │  └─────────────────────────┘  │  │
│  ├───────────────────────────────┤  │
│  │  Grille (90px)                │  │
│  └───────────────────────────────┘  │
│  Frame Border (16px)                │
└─────────────────────────────────────┘
```

## Implementation

### Backend Transform (`lib/backend-transform.ts`)

```typescript
function generateBoundingBox(
  item: Item,
  xPosition: number,
  rowYStart: number,
  stackHeightBelow: number,
  rowMaxHeight: number,
  frameBorder: number = 0,    // 16px
  headerHeight: number = 0    // 100px
): number[][] {
  // Calculate content-relative coordinates
  const itemLeft = xPosition;
  const itemTop = rowBottom - stackHeightBelow - item.height;
  const itemRight = xPosition + item.width;
  const itemBottom = rowBottom - stackHeightBelow;
  
  // Apply offsets to convert to ABSOLUTE coordinates
  const offsetX = frameBorder;               // 16px from left
  const offsetY = frameBorder + headerHeight; // 116px from top (16 + 100)
  
  return [
    [itemLeft + offsetX, itemTop + offsetY],       // Top-left
    [itemLeft + offsetX, itemBottom + offsetY],    // Bottom-left
    [itemRight + offsetX, itemBottom + offsetY],   // Bottom-right
    [itemRight + offsetX, itemTop + offsetY]       // Top-right
  ];
}
```

### Function Calls

```typescript
// Stacked items
const boundingBox = generateBoundingBox(
  feProduct,
  xPosition,
  rowMeta.yStart,
  cumulativeHeight,
  rowMeta.maxHeight,
  frameBorder,    // 16px
  headerHeight    // 100px
);

// Front product
const frontBoundingBox = generateBoundingBox(
  frontProductFE,
  xPosition,
  rowMeta.yStart,
  cumulativeHeight,
  rowMeta.maxHeight,
  frameBorder,    // 16px
  headerHeight    // 100px
);
```

## Example Output

### Product at First Position

**Visual Position:**
- First stack in first row
- Bottom-aligned in row
- 80px wide, 180px tall

**Backend JSON:**
```json
{
  "SKU-Code": "sku-aquafina-1l",
  "width": 80,
  "height": 180,
  "Bounding-Box": [
    [16, 1043],    // Top-left (absolute from refrigerator top-left)
    [16, 1223],    // Bottom-left
    [96, 1223],    // Bottom-right
    [96, 1043]     // Top-right
  ]
}
```

**Breakdown:**
- X: 0 (content) + 16 (frame) = **16px**
- Y: 927 (content) + 16 (frame) + 100 (header) = **1043px**
- Width: 80px
- Height: 180px

### Product at Second Stack, First Row

**Visual Position:**
- Second stack (after 1px gap)
- First row
- 75px wide, 270px tall

**Backend JSON:**
```json
{
  "SKU-Code": "sku-pepsi-400",
  "width": 75,
  "height": 270,
  "Bounding-Box": [
    [97, 963],     // Top-left
    [97, 1223],    // Bottom-left
    [172, 1223],   // Bottom-right
    [172, 963]     // Top-right
  ]
}
```

**Breakdown:**
- X: 81 (content, after first stack + gap) + 16 (frame) = **97px**
- Y: 847 (content) + 16 (frame) + 100 (header) = **963px**

## Bounding Box Overlay

The overlay is positioned **inside the content area**, so it needs to subtract offsets when rendering:

```typescript
// Backend has absolute coordinates
const xLeftAbsolute = bbox[0][0];   // e.g., 16
const yTopAbsolute = bbox[0][1];    // e.g., 1043

// Overlay is inside content, so subtract offsets
const xLeft = xLeftAbsolute - 16;              // 16 - 16 = 0
const yTop = yTopAbsolute - 16 - headerHeight; // 1043 - 116 = 927

// Render at content-relative position
<div style={{ left: `${xLeft}px`, top: `${yTop}px` }} />
```

## Offset Calculations

### X Offset
```
Content X + Frame Border = Absolute X
0 + 16 = 16
81 + 16 = 97
```

### Y Offset
```
Content Y + Frame Border + Header = Absolute Y
0 + 16 + 100 = 116
927 + 16 + 100 = 1043
```

## Benefits

✅ **Cross-Application Compatible**: Coordinates work anywhere  
✅ **Complete Reference**: Origin is the entire refrigerator  
✅ **Consistent**: All measurements from same (0,0) point  
✅ **Accurate**: Matches exact visual positions  

## Usage in Other Applications

Other applications can use these absolute coordinates directly:

```typescript
// Load backend JSON
const data = await fetch('/api/planogram').then(r => r.json());

// Get total dimensions
const { totalWidth, totalHeight } = data.dimensions;

// Create canvas
const canvas = document.createElement('canvas');
canvas.width = totalWidth;
canvas.height = totalHeight;

// Draw products using absolute coordinates
data.Cooler['Door-1'].Sections.forEach(section => {
  section.products.forEach(product => {
    const bbox = product['Bounding-Box'];
    const x = bbox[0][0];     // Absolute X
    const y = bbox[0][1];     // Absolute Y
    const width = product.width;
    const height = product.height;
    
    // Draw product at exact position
    ctx.drawImage(productImage, x, y, width, height);
  });
});
```

## Testing

### Visual Verification
1. Enable bounding box overlay
2. Colored dots should align perfectly with product corners
3. Dimension labels should match product sizes

### Data Verification
```json
{
  "dimensions": {
    "width": 1200,           // Content width
    "height": 1308,          // Content height
    "totalWidth": 1232,      // Content + frame (1200 + 32)
    "totalHeight": 1530,     // Content + header + grille + frame
    "headerHeight": 100,
    "grilleHeight": 90,
    "frameBorder": 16
  }
}
```

### Coordinate Check
- First product X should be: **16** (frame offset)
- First product Y should be: **116+** (frame + header + row position)
- Coordinates should never be < 16 (minimum frame offset)

## Files Modified

1. ✅ `lib/backend-transform.ts`
   - Added `frameBorder` and `headerHeight` parameters to `generateBoundingBox()`
   - Calculate absolute coordinates with offsets

2. ✅ `app/planogram/components/BoundingBoxOverlay.tsx`
   - Updated to handle absolute coordinates
   - Subtract offsets when rendering (since overlay is in content area)
   - Updated info panel to show coordinate system

---

**Status**: ✅ **COMPLETE** - Bounding boxes now use absolute coordinates with ALL offsets included!
