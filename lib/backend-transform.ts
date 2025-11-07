import { Refrigerator, Row, Item } from './types'; // <-- Import your frontend types

// --- (NEW) Define types for the Backend structure ---

export interface BackendProduct {
  product: string;
  stacked: BackendProduct[] | null;
  Position: string;
  "SKU-Code": string;
  stackSize: number;
  Confidence: string;
  "Bounding-Box": number[][];
  width: number;   // NEW: Width in pixels
  height: number;  // NEW: Height in pixels
}

// --- Row Metadata for coordinate calculation ---
interface RowMetadata {
  rowId: string;
  yStart: number;
  yEnd: number;
  capacity: number;
  maxHeight: number;
}

export interface BackendSection {
  data: number[][];
  position: number;
  products: BackendProduct[];
}

export interface BackendOutput {
  Cooler: {
    "Door-1": {
      data: number[][];
      Sections: BackendSection[];
      "Door-Visible": boolean;
    };
  };
  dimensions: {
    width: number;
    height: number;
  };
}

// --- Helper Functions for Coordinate Calculation ---

/**
 * Get the width footprint of a stack (widest item)
 */
function getStackWidth(stack: Item[]): number {
  if (stack.length === 0) return 0;
  return Math.max(...stack.map(item => item.width));
}

/**
 * Calculate cumulative Y positions for all rows
 * MUST MATCH FRONTEND ROW STACKING EXACTLY
 */
function calculateRowPositions(refrigerator: Refrigerator): RowMetadata[] {
  const rowKeys = Object.keys(refrigerator).sort();
  let currentY = 0; // Start from top
  const metadata: RowMetadata[] = [];
  
  rowKeys.forEach((rowKey) => {
    const row = refrigerator[rowKey];
    
    metadata.push({
      rowId: rowKey,
      yStart: currentY,               // Top edge of row
      yEnd: currentY + row.maxHeight, // Bottom edge of row
      capacity: row.capacity,
      maxHeight: row.maxHeight
    });
    
    // Move down by row height (no gap between rows in frontend)
    currentY += row.maxHeight;
  });
  
  return metadata;
}

/**
 * Calculate X positions for all stacks in a row (accounting for 1px gaps)
 * MUST MATCH FRONTEND RENDERING EXACTLY
 */
function calculateStackPositions(row: Row): number[] {
  let currentX = 0;
  const positions: number[] = [];
  
  row.stacks.forEach((stack, index) => {
    positions.push(currentX);
    const stackWidth = getStackWidth(stack);
    // Add 1px gap after each stack EXCEPT the last one
    // This MUST match the CSS: gap-x-px (1px gap in frontend)
    currentX += stackWidth + (index < row.stacks.length - 1 ? 1 : 0);
  });
  
  return positions;
}

/**
 * Generate bounding box for an item
 * Coordinates MUST match frontend CSS positioning exactly
 * 
 * Frontend CSS logic:
 * - Rows are stacked vertically (no gaps between rows)
 * - Items are positioned with flex-start (left-aligned)
 * - Items are bottom-aligned within their row (items-end)
 * - Stacks have 1px gap between them (gap-x-px)
 * 
 * @param item - The item to generate bounding box for
 * @param xPosition - X position (left edge of stack)
 * @param rowYStart - Y position where row starts (top edge)
 * @param stackHeightBelow - Total height of items below this one in stack
 * @param rowMaxHeight - Maximum height of the row
 * @returns 4-corner bounding box [[x1,y1], [x1,y2], [x2,y2], [x2,y1]]
 */
function generateBoundingBox(
  item: Item,
  xPosition: number,
  rowYStart: number,
  stackHeightBelow: number,
  rowMaxHeight: number
): number[][] {
  // Frontend rendering logic:
  // 1. Row starts at rowYStart (top edge)
  // 2. Row bottom = rowYStart + rowMaxHeight
  // 3. Items are bottom-aligned, so we work from bottom up
  
  const rowBottom = rowYStart + rowMaxHeight;
  
  // Item bottom edge (accounting for items stacked below)
  const itemBottom = rowBottom - stackHeightBelow;
  
  // Item top edge
  const itemTop = itemBottom - item.height;
  
  // Item left edge (stack X position)
  const itemLeft = xPosition;
  
  // Item right edge
  const itemRight = xPosition + item.width;
  
  // Return 4 corners: [top-left, bottom-left, bottom-right, top-right]
  // This matches typical polygon/bounding box format
  return [
    [Math.round(itemLeft), Math.round(itemTop)],       // Top-left
    [Math.round(itemLeft), Math.round(itemBottom)],    // Bottom-left
    [Math.round(itemRight), Math.round(itemBottom)],   // Bottom-right
    [Math.round(itemRight), Math.round(itemTop)]       // Top-right
  ];
}

/**
 * Generate section polygon outline (optional, can be empty array)
 */
function generateSectionPolygon(rowMeta: RowMetadata): number[][] {
  // For now, return empty array as it's not critical
  // Can be implemented later if backend requires it
  return [];
}

// --- (UPDATED) Your Type-Safe Converter Function ---

/**
 * Converts the frontend row data back into the backend 'Sections' format with bounding boxes.
 * 
 * CRITICAL: Bounding boxes MUST match frontend visual positions exactly!
 * 
 * @param {Refrigerator} frontendData - The frontend refrigerator data
 * @param {number} refrigeratorWidth - Total width in pixels (for validation)
 * @param {number} refrigeratorHeight - Total height in pixels (for validation)
 * @returns {BackendOutput} - Backend data with accurate bounding boxes
 */
export function convertFrontendToBackend(
  frontendData: Refrigerator,
  refrigeratorWidth: number = 0,
  refrigeratorHeight: number = 0
): BackendOutput {
  
  // 1. Initialize backend structure
  const backendOutput: BackendOutput = {
    Cooler: {
      "Door-1": {
        data: [], // Placeholder for door polygon
        Sections: [],
        "Door-Visible": true,
      },
    },
    dimensions: {
      width: refrigeratorWidth, 
      height: refrigeratorHeight,
    },
  };

  // 2. Calculate row positions (Y coordinates)
  const rowMetadata = calculateRowPositions(frontendData);
  const rowKeys = Object.keys(frontendData).sort();
  
  rowKeys.forEach((rowKey, rowIndex) => {
    const currentRow: Row = frontendData[rowKey];
    const rowMeta = rowMetadata[rowIndex];

    // 3. Create section for this row
    const newSection: BackendSection = {
      data: generateSectionPolygon(rowMeta),
      position: rowIndex + 1,
      products: [],
    };

    // 4. Calculate X positions for all stacks (accounting for 1px gaps)
    const stackXPositions = calculateStackPositions(currentRow);

    // 5. Process each stack
    currentRow.stacks.forEach((stackArray: Item[], stackIndex) => {
      if (stackArray.length === 0) return;

      const frontProductFE: Item = stackArray[0];
      const stackedProductsFE: Item[] = stackArray.slice(1);
      const xPosition = stackXPositions[stackIndex];
      
      // 6. Track cumulative height from bottom of stack
      // Start at 0 for the front (bottom) product
      let cumulativeHeight = 0;
      
      // 7. Process stacked items (items on top) - BOTTOM to TOP order
      const backendStackedProducts: BackendProduct[] = stackedProductsFE.map((feProduct: Item): BackendProduct | null => {
        // Calculate bounding box for this stacked item
        const boundingBox = generateBoundingBox(
          feProduct,
          xPosition,
          rowMeta.yStart,
          cumulativeHeight,
          rowMeta.maxHeight
        );
        
        // Add this item's height to cumulative (building upward)
        cumulativeHeight += feProduct.height;
        
        return {
          product: feProduct.name,
          stacked: null,
          Position: feProduct.id, 
          "SKU-Code": feProduct.skuId,
          stackSize: 0,
          Confidence: "1.0",
          "Bounding-Box": boundingBox,
          width: feProduct.width,   // NEW: Include width
          height: feProduct.height, // NEW: Include height
        };
      }).filter((p): p is BackendProduct => p !== null);

      // 8. Calculate front product bounding box (bottom item)
      // The front product sits at the bottom with all stacked items above it
      const frontBoundingBox = generateBoundingBox(
        frontProductFE,
        xPosition,
        rowMeta.yStart,
        cumulativeHeight, // All stacked items are above the front product
        rowMeta.maxHeight
      );

      // 9. Create front product entry
      const backendFrontProduct: BackendProduct = {
        product: frontProductFE.name,
        stacked: backendStackedProducts.length > 0 ? backendStackedProducts : null,
        Position: (stackIndex + 1).toString(), 
        "SKU-Code": frontProductFE.skuId,
        stackSize: stackArray.filter(p => p.skuId).length - 1,
        Confidence: "1.0", 
        "Bounding-Box": frontBoundingBox,
        width: frontProductFE.width,   // NEW: Include width
        height: frontProductFE.height, // NEW: Include height
      };

      newSection.products.push(backendFrontProduct);
    });

    // 10. Add section to output
    backendOutput.Cooler["Door-1"].Sections.push(newSection);
  });

  return backendOutput;
}