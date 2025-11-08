import { Refrigerator, Row, Item } from './types';
import { 
  generateBoundingBox, 
  generateSectionPolygon,
  scaleBackendBoundingBoxes
} from './bounding-box-utils';

// Re-export for convenience
export { scaleBackendBoundingBoxes };

// --- Define types for the Backend structure ---

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
    totalWidth?: number;   // NEW: Total width including frame
    totalHeight?: number;  // NEW: Total height including header + grille + frame
    headerHeight?: number; // NEW: Header height
    grilleHeight?: number; // NEW: Grille height
    frameBorder?: number;  // NEW: Frame border width
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

// --- Type-Safe Converter Function ---

/**
 * Converts the frontend row data back into the backend 'Sections' format with bounding boxes.
 * 
 * CRITICAL: Bounding boxes MUST match frontend visual positions exactly!
 * 
 * @param {Refrigerator} frontendData - The frontend refrigerator data
 * @param {number} refrigeratorWidth - Content width in pixels (internal dimensions)
 * @param {number} refrigeratorHeight - Content height in pixels (internal dimensions)
 * @param {number} headerHeight - Header height in pixels (default: 100px)
 * @param {number} grilleHeight - Grille height in pixels (default: 90px)
 * @param {number} frameBorder - Frame border width in pixels (default: 16px)
 * @returns {BackendOutput} - Backend data with accurate bounding boxes
 */
export function convertFrontendToBackend(
  frontendData: Refrigerator,
  refrigeratorWidth: number = 0,
  refrigeratorHeight: number = 0,
  headerHeight: number = 100,
  grilleHeight: number = 90,
  frameBorder: number = 16
): BackendOutput {
  
  // Calculate total dimensions including all visual elements
  const totalWidth = refrigeratorWidth + (frameBorder * 2);
  const totalHeight = refrigeratorHeight + headerHeight + grilleHeight + (frameBorder * 2);
  
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
      width: totalWidth, 
      height: totalHeight,
      // totalWidth,
      // totalHeight,
      // headerHeight,
      // grilleHeight,
      // frameBorder
    },
  };

  // 2. Calculate row positions (Y coordinates)
  const rowMetadata = calculateRowPositions(frontendData);
  const rowKeys = Object.keys(frontendData).sort();
  
  rowKeys.forEach((rowKey, rowIndex) => {
    const currentRow: Row = frontendData[rowKey];
    const rowMeta = rowMetadata[rowIndex];    // 3. Create section for this row
    const newSection: BackendSection = {
      data: generateSectionPolygon(rowMeta.yStart, rowMeta.yEnd, refrigeratorWidth),
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
      let cumulativeHeight = 0;      // 7. Process stacked items (items on top) - BOTTOM to TOP order
      const backendStackedProducts: BackendProduct[] = stackedProductsFE.map((feProduct: Item): BackendProduct | null => {
        // Calculate bounding box for this stacked item WITH offsets
        const boundingBox = generateBoundingBox(
          feProduct,
          xPosition,
          rowMeta.yStart,
          cumulativeHeight,
          rowMeta.maxHeight,
          frameBorder,    // Add frame border offset
          headerHeight    // Add header height offset
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
      }).filter((p): p is BackendProduct => p !== null);      // 8. Calculate front product bounding box (bottom item)
      // The front product sits at the bottom with all stacked items above it
      const frontBoundingBox = generateBoundingBox(
        frontProductFE,
        xPosition,
        rowMeta.yStart,
        cumulativeHeight, // All stacked items are above the front product
        rowMeta.maxHeight,
        frameBorder,    // Add frame border offset
        headerHeight    // Add header height offset
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