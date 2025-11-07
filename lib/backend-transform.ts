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
 */
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

/**
 * Calculate X positions for all stacks in a row (accounting for 1px gaps)
 */
function calculateStackPositions(row: Row): number[] {
  let currentX = 0;
  const positions: number[] = [];
  
  row.stacks.forEach((stack, index) => {
    positions.push(currentX);
    const stackWidth = getStackWidth(stack);
    // Add gap only if not the last stack
    currentX += stackWidth + (index < row.stacks.length - 1 ? 1 : 0);
  });
  
  return positions;
}

/**
 * Generate bounding box for an item
 * @param item - The item to generate bounding box for
 * @param xPosition - X position (left edge)
 * @param yPosition - Y position (row start)
 * @param stackHeightBelow - Height of items below this one in stack
 * @param rowMaxHeight - Maximum height of the row
 * @returns 4-corner bounding box [[x1,y1], [x1,y2], [x2,y2], [x2,y1]]
 */
function generateBoundingBox(
  item: Item,
  xPosition: number,
  yPosition: number,
  stackHeightBelow: number,
  rowMaxHeight: number
): number[][] {
  // Items are bottom-aligned in rows
  const rowBottom = yPosition + rowMaxHeight;
  const itemBottom = rowBottom - stackHeightBelow;
  const itemTop = itemBottom - item.height;
  
  const itemLeft = xPosition;
  const itemRight = xPosition + item.width;
  
  // Round to avoid floating point issues
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
 * @param {Refrigerator} frontendData - The strongly-typed frontend data object.
 * @param {number} refrigeratorWidth - Total width of refrigerator in pixels
 * @param {number} refrigeratorHeight - Total height of refrigerator in pixels
 * @returns {BackendOutput} - The strongly-typed backend data with bounding boxes.
 */
export function convertFrontendToBackend(
  frontendData: Refrigerator,
  refrigeratorWidth: number = 0,
  refrigeratorHeight: number = 0
): BackendOutput {
  
  // 1. Initialize the final backend structure
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

  // 2. Calculate row positions for coordinate system
  const rowMetadata = calculateRowPositions(frontendData);
  const rowKeys = Object.keys(frontendData).sort();
  rowKeys.forEach((rowKey, rowIndex) => {
    const currentRow: Row = frontendData[rowKey];
    const rowMeta = rowMetadata[rowIndex];

    // 3. Create a new Section for this row
    const newSection: BackendSection = {
      data: generateSectionPolygon(rowMeta),
      position: rowIndex + 1,
      products: [],
    };

    // 4. Calculate X positions for all stacks in this row
    const stackXPositions = calculateStackPositions(currentRow);

    // 5. Iterate over the stacks
    currentRow.stacks.forEach((stackArray: Item[], stackIndex) => {
      if (stackArray.length === 0) {
        return;
      }

      const frontProductFE: Item = stackArray[0];
      
      // Skip blank spaces
      // if (frontProductFE.skuId === "sku-blank-space") {
      //   return;
      // }

      const stackedProductsFE: Item[] = stackArray.slice(1);
      const xPosition = stackXPositions[stackIndex];
      
      // 6. Calculate cumulative height for stacked items
      // Start from bottom of stack (front product)
      let cumulativeHeight = 0;
      
      // 7. Convert stacked items (items on top)
      const backendStackedProducts: BackendProduct[] = stackedProductsFE.map((feProduct: Item): BackendProduct | null => {
        // if (feProduct.skuId === "sku-blank-space") {
        //   return null; 
        // }
        
        // Calculate this item's bounding box
        const boundingBox = generateBoundingBox(
          feProduct,
          xPosition,
          rowMeta.yStart,
          cumulativeHeight,
          rowMeta.maxHeight
        );
        
        cumulativeHeight += feProduct.height;
        
        return {
          product: feProduct.name,
          stacked: null,
          Position: feProduct.id, 
          "SKU-Code": feProduct.skuId,
          stackSize: 0,
          Confidence: "1.0",
          "Bounding-Box": boundingBox,
        };
      }).filter((p): p is BackendProduct => p !== null);

      // 8. Calculate front product bounding box
      const frontBoundingBox = generateBoundingBox(
        frontProductFE,
        xPosition,
        rowMeta.yStart,
        cumulativeHeight,
        rowMeta.maxHeight
      );

      // 9. Create the front product
      const backendFrontProduct: BackendProduct = {
        product: frontProductFE.name,
        stacked: backendStackedProducts.length > 0 ? backendStackedProducts : null,
        Position: (stackIndex + 1).toString(), 
        "SKU-Code": frontProductFE.skuId,
        stackSize: stackArray.filter(p => p.skuId).length-1,
        Confidence: "1.0", 
        "Bounding-Box": frontBoundingBox,
      };

      newSection.products.push(backendFrontProduct);
    });

    // 10. Add the completed section to the final output
    backendOutput.Cooler["Door-1"].Sections.push(newSection);
  });

  return backendOutput;
}