# 🎯 Bounding Box Implementation Plan

## 📋 Problem Statement

The backend AI detection system provides bounding boxes for each detected product in the format:
```json
"Bounding-Box": [
  [x1, y1],  // Top-left corner
  [x2, y2],  // Bottom-left corner
  [x3, y3],  // Bottom-right corner
  [x4, y4]   // Top-right corner
]
```

**Goal**: Generate matching bounding boxes for each product in our planogram editor so the backend can:
1. Compare AI-detected layout vs user-edited layout
2. Validate placement accuracy
3. Calculate compliance scores
4. Identify discrepancies

---

## 🔍 Analysis of Current State

### What We Have
1. ✅ **Frontend Item Data**:
   - `width` (pixels)
   - `height` (pixels)
   - Position in stack
   - Row assignment

2. ✅ **Row Data**:
   - `maxHeight` (pixels)
   - `capacity` (pixels)
   - Stack positions

3. ✅ **Refrigerator Dimensions**:
   - Total `width` (pixels)
   - Total `height` (pixels)

### What We're Missing
1. ❌ **Absolute Coordinates**: Items only know their relative position within stacks/rows
2. ❌ **Y-axis Origin**: Need to know where each row starts vertically
3. ❌ **X-axis Stack Positions**: Need cumulative width calculations
4. ❌ **Coordinate System**: Need to match backend's coordinate system

---

## 🎨 Coordinate System Analysis

### Backend Coordinate System
Looking at the AI detection data:
```json
"dimensions": { "width": 1958, "height": 2612 }

Row 1 Section "data": [[1834, 81], [77, 7]]  // Top section
Row 5 Section "data": [[1621, 2221], [247, 2356]]  // Bottom section
```

**Observations**:
- **Origin**: Top-left corner (0, 0)
- **X-axis**: Left to right (0 → 1958)
- **Y-axis**: Top to bottom (0 → 2612)
- Sections stack vertically from top to bottom

### Our Frontend Coordinate System
- Each item has `width × height` in pixels
- Items are positioned using CSS flex layout
- No explicit coordinate tracking currently

---

## 💡 Solution Architecture

### Approach 1: **Calculate Bounding Boxes During Export** ⭐ RECOMMENDED

**Strategy**: Calculate absolute coordinates when converting frontend → backend

**Advantages**:
- ✅ No changes to existing UI/state management
- ✅ Clean separation of concerns
- ✅ Works with current data structure
- ✅ Easy to maintain

**Implementation**:
1. Track cumulative row positions (Y-coordinates)
2. Calculate stack positions within rows (X-coordinates)
3. Generate bounding boxes during `convertFrontendToBackend()`

---

### Approach 2: Store Coordinates in State

**Strategy**: Add coordinate tracking to store

**Advantages**:
- Real-time coordinate access
- Useful for advanced features (collision detection, etc.)

**Disadvantages**:
- ❌ Increases state complexity
- ❌ Need to recalculate on every change
- ❌ Performance overhead
- ❌ Overkill for this use case

---

## 🏗️ Implementation Plan (Approach 1)

### Step 1: Enhance Backend Transform Function

Add coordinate calculation logic to `convertFrontendToBackend()`:

```typescript
// lib/backend-transform.ts

interface RowMetadata {
  rowId: string;
  yStart: number;      // Top Y position of row
  yEnd: number;        // Bottom Y position of row
  capacity: number;    // Width capacity
  maxHeight: number;   // Height limit
}

function calculateRowPositions(refrigerator: Refrigerator): RowMetadata[] {
  const rowKeys = Object.keys(refrigerator).sort();
  let currentY = 0;
  const metadata: RowMetadata[] = [];
  
  rowKeys.forEach((rowKey) => {
    const row = refrigerator[rowKey];
    
    metadata.push({
      rowId: rowKey,
      yStart: currentY,
      yEnd: currentY + row.maxHeight,
      capacity: row.capacity,
      maxHeight: row.maxHeight
    });
    
    currentY += row.maxHeight;
  });
  
  return metadata;
}
```

### Step 2: Calculate Stack X-Positions

```typescript
function calculateStackPositions(row: Row): number[] {
  let currentX = 0;
  const positions: number[] = [];
  
  row.stacks.forEach((stack) => {
    positions.push(currentX);
    const stackWidth = getStackWidth(stack); // Already exists in store.ts
    currentX += stackWidth + 1; // +1 for gap
  });
  
  return positions;
}
```

### Step 3: Generate Bounding Boxes

```typescript
function generateBoundingBox(
  item: Item,
  xPosition: number,
  yPosition: number,
  rowMaxHeight: number
): number[][] {
  // Calculate item's actual vertical position in stack
  // Items are bottom-aligned in stacks
  const itemBottom = yPosition + rowMaxHeight;
  const itemTop = itemBottom - item.height;
  
  // Generate clockwise coordinates starting from top-left
  return [
    [xPosition, itemTop],                          // Top-left
    [xPosition, itemBottom],                       // Bottom-left
    [xPosition + item.width, itemBottom],          // Bottom-right
    [xPosition + item.width, itemTop]              // Top-right
  ];
}
```

### Step 4: Integrate into Export Function

```typescript
export function convertFrontendToBackend(
  frontendData: Refrigerator,
  refrigeratorWidth: number,   // NEW
  refrigeratorHeight: number    // NEW
): BackendOutput {
  
  const backendOutput: BackendOutput = {
    Cooler: {
      "Door-1": {
        data: [], // Can calculate refrigerator outline
        Sections: [],
        "Door-Visible": true,
      },
    },
    dimensions: {
      width: refrigeratorWidth,
      height: refrigeratorHeight,
    },
  };

  const rowMetadata = calculateRowPositions(frontendData);
  const rowKeys = Object.keys(frontendData).sort();

  rowKeys.forEach((rowKey, rowIndex) => {
    const currentRow = frontendData[rowKey];
    const rowMeta = rowMetadata[rowIndex];
    
    const newSection: BackendSection = {
      data: generateSectionPolygon(rowMeta), // Calculate section outline
      position: rowIndex + 1,
      products: [],
    };

    const stackXPositions = calculateStackPositions(currentRow);

    currentRow.stacks.forEach((stackArray, stackIndex) => {
      if (stackArray.length === 0) return;
      
      const frontProductFE = stackArray[0];
      if (frontProductFE.skuId === "sku-blank-space") return;

      const stackedProductsFE = stackArray.slice(1);
      const xPosition = stackXPositions[stackIndex];
      
      // Calculate Y position for stacked items
      let cumulativeHeight = 0;
      
      const backendStackedProducts: BackendProduct[] = stackedProductsFE.map((feProduct) => {
        if (feProduct.skuId === "sku-blank-space") return null;
        
        const yPositionInStack = rowMeta.yStart + (rowMeta.maxHeight - cumulativeHeight - feProduct.height);
        cumulativeHeight += feProduct.height;
        
        return {
          product: feProduct.name,
          stacked: null,
          Position: feProduct.id,
          "SKU-Code": feProduct.skuId,
          stackSize: 0,
          Confidence: "1.0",
          "Bounding-Box": generateBoundingBox(
            feProduct,
            xPosition,
            yPositionInStack,
            rowMeta.maxHeight
          ),
        };
      }).filter((p): p is BackendProduct => p !== null);

      // Calculate front product position
      const frontYPosition = rowMeta.yStart + (rowMeta.maxHeight - cumulativeHeight - frontProductFE.height);
      
      const backendFrontProduct: BackendProduct = {
        product: frontProductFE.name,
        stacked: backendStackedProducts.length > 0 ? backendStackedProducts : null,
        Position: (stackIndex + 1).toString(),
        "SKU-Code": frontProductFE.skuId,
        stackSize: stackArray.filter(p => p.skuId !== "sku-blank-space").length,
        Confidence: "1.0",
        "Bounding-Box": generateBoundingBox(
          frontProductFE,
          xPosition,
          frontYPosition,
          rowMeta.maxHeight
        ),
      };

      newSection.products.push(backendFrontProduct);
    });

    backendOutput.Cooler["Door-1"].Sections.push(newSection);
  });

  return backendOutput;
}
```

---

## 🚧 Key Challenges & Solutions

### Challenge 1: **Row Height Tracking**
**Problem**: Rows don't know their absolute Y position

**Solution**: 
```typescript
// Calculate cumulative heights during export
let yOffset = 0;
rows.forEach(row => {
  row.absoluteY = yOffset;
  yOffset += row.maxHeight;
});
```

### Challenge 2: **Stacked Items Positioning**
**Problem**: Items in a stack need different Y coordinates

**Solution**:
```typescript
// Stack items bottom-up
let stackHeight = 0;
stack.forEach(item => {
  item.yInStack = rowMaxHeight - stackHeight - item.height;
  stackHeight += item.height;
});
```

### Challenge 3: **Coordinate System Mismatch**
**Problem**: Our internal pixels might not match backend's image coordinates

**Solution**:
```typescript
// Option 1: Scale coordinates
const scaleX = backendImageWidth / frontendWidth;
const scaleY = backendImageHeight / frontendHeight;
boundingBox = boundingBox.map(([x, y]) => [x * scaleX, y * scaleY]);

// Option 2: Use millimeters as common unit
// Convert both to MM for comparison
```

### Challenge 4: **Gap Handling**
**Problem**: 1px gaps between stacks affect positioning

**Solution**:
```typescript
// Account for gaps in X calculation
let xPosition = 0;
stacks.forEach((stack, index) => {
  positions[index] = xPosition;
  xPosition += getStackWidth(stack) + (index < stacks.length - 1 ? 1 : 0);
});
```

### Challenge 5: **Refrigerator Dimensions**
**Problem**: Need total width/height for scaling

**Solution**:
```typescript
// Pass from LayoutData
const layoutData = availableLayoutsData['g-26c'];
convertFrontendToBackend(
  refrigerator,
  layoutData.width,
  layoutData.height
);
```

---

## 🎯 Updated API Flow

### Current Export
```typescript
const backendData = convertFrontendToBackend(refrigerator);
```

### New Export with Bounding Boxes
```typescript
const currentLayout = usePlanogramStore(state => state.currentLayoutId);
const layoutData = availableLayoutsData[currentLayout];

const backendData = convertFrontendToBackend(
  refrigerator,
  layoutData.width,
  layoutData.height
);

// Now includes accurate bounding boxes for each item!
```

---

## 📊 Data Flow with Bounding Boxes

```
Frontend State
    ↓
Calculate Row Positions (Y)
    ↓
Calculate Stack Positions (X)
    ↓
For Each Item:
  - Get X from stack position
  - Get Y from row position + stack offset
  - Generate 4-corner bounding box
    ↓
Backend JSON with Bounding Boxes
    ↓
Send to API for Comparison
    ↓
Backend validates against AI detection
```

---

## 🧪 Testing Strategy

### 1. Visual Debugging
Add bounding box overlay to UI:
```typescript
// In ItemComponent
{process.env.NODE_ENV === 'development' && (
  <div className="absolute inset-0 border-2 border-red-500 opacity-50">
    <div className="text-xs bg-red-500 text-white p-1">
      X: {boundingBox[0][0]}, Y: {boundingBox[0][1]}
    </div>
  </div>
)}
```

### 2. Coordinate Validation
```typescript
// Verify bounding boxes don't overlap
function validateBoundingBoxes(backendData: BackendOutput) {
  // Check for overlaps, out-of-bounds, etc.
}
```

### 3. Mock Comparison
```typescript
// Compare against sample AI detection data
const aiData = loadAIDetectionSample();
const ourData = convertFrontendToBackend(refrigerator);
const diff = compareBoundingBoxes(aiData, ourData);
console.log('Difference:', diff);
```

---

## 🚀 Implementation Steps

### Phase 1: Core Functionality ⭐
1. ✅ Update `convertFrontendToBackend()` signature to accept dimensions
2. ✅ Implement `calculateRowPositions()`
3. ✅ Implement `calculateStackPositions()`
4. ✅ Implement `generateBoundingBox()`
5. ✅ Integrate into export function
6. ✅ Test with StatePreview component

### Phase 2: Validation & Debugging
1. Add bounding box visualization overlay (dev mode)
2. Add coordinate validation logic
3. Test with various layouts (g-26c, g-10f)
4. Verify against AI sample data

### Phase 3: Refinement
1. Handle edge cases (empty rows, single items)
2. Add coordinate scaling if needed
3. Optimize performance
4. Add error handling

---

## 📝 Code Changes Required

### Files to Modify:
1. ✅ `lib/backend-transform.ts` - Add bounding box logic
2. ✅ `app/planogram/components/statePreview.tsx` - Pass dimensions to converter
3. ✅ `app/planogram/components/planogramEditor.tsx` - Track current layout
4. ⚠️ `lib/store.ts` - Optional: Add helper methods

### New Files (Optional):
1. `lib/coordinate-calculator.ts` - Coordinate calculation utilities
2. `lib/bounding-box-validator.ts` - Validation logic
3. `app/planogram/components/BoundingBoxOverlay.tsx` - Dev visualization

---

## 💡 Key Insights

### Why This Approach Works:
1. **Deterministic**: Same frontend state → Same bounding boxes
2. **Accurate**: Based on actual pixel positions
3. **Scalable**: Works for any layout size
4. **Maintainable**: Clean separation from UI code
5. **Testable**: Pure functions, easy to unit test

### Important Considerations:
1. **Bottom-Aligned**: Items in stacks are bottom-aligned (matches our CSS)
2. **Gap Handling**: 1px gaps must be accounted for
3. **Coordinate Origin**: Top-left is (0, 0)
4. **Units**: Keep everything in pixels during calculation
5. **Precision**: Use `Math.round()` to avoid floating point issues

---

## 🎓 Next Steps

Ready to implement! Should I:

1. ✅ **Start with Phase 1**: Implement core bounding box calculation
2. 🔧 **Add visualization**: Create dev overlay to see bounding boxes
3. 🧪 **Setup testing**: Create validation suite
4. 📚 **All of the above**: Complete end-to-end implementation

Let me know which approach you prefer, and I'll start coding! 🚀
