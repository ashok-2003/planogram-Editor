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

/**
 * Generate bounding box for an item
 * Coordinates are calculated with ABSOLUTE positioning
 * (includes frame border and header offsets)
 * 
 * Origin (0,0) is at the top-left of the entire refrigerator component.
 * 
 * Frontend CSS logic:
 * - Frame border: 16px on all sides
 * - Header: 100px height at top
 * - Content area: Rows stacked vertically (no gaps between rows)
 * - Items: Bottom-aligned within rows (items-end)
 * - Stacks: 1px gap between them (gap-x-px)
 * 
 * @param item - The item to generate bounding box for
 * @param xPosition - X position relative to content area (left edge of stack)
 * @param rowYStart - Y position relative to content area (top edge of row)
 * @param stackHeightBelow - Total height of items below this one in stack
 * @param rowMaxHeight - Maximum height of the row
 * @param frameBorder - Frame border width to add as X and Y offset
 * @param headerHeight - Header height to add as Y offset
 * @returns 4-corner bounding box [[x1,y1], [x1,y2], [x2,y2], [x2,y1]]
 */
function generateBoundingBox(
  item: Item,
  xPosition: number,
  rowYStart: number,
  stackHeightBelow: number,
  rowMaxHeight: number,
  frameBorder: number = 0,
  headerHeight: number = 0
): number[][] {
  // Calculate content-relative coordinates first
  const rowBottom = rowYStart + rowMaxHeight;
  const itemBottom = rowBottom - stackHeightBelow;
  const itemTop = itemBottom - item.height;
  const itemLeft = xPosition;
  const itemRight = xPosition + item.width;
  
  // Apply offsets to convert to absolute refrigerator coordinates
  // X offset: frame border on left side
  // Y offset: frame border on top + header height
  const offsetX = frameBorder;
  const offsetY = frameBorder + headerHeight;
  
  // Return 4 corners with absolute coordinates
  return [
    [Math.round(itemLeft + offsetX), Math.round(itemTop + offsetY)],       // Top-left
    [Math.round(itemLeft + offsetX), Math.round(itemBottom + offsetY)],    // Bottom-left
    [Math.round(itemRight + offsetX), Math.round(itemBottom + offsetY)],   // Bottom-right
    [Math.round(itemRight + offsetX), Math.round(itemTop + offsetY)]       // Top-right
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

/**
 * Scale all bounding boxes in the backend output by a pixel ratio.
 * This is used to match bounding box coordinates to captured images.
 * 
 * When capturing with pixelRatio: 3, the image is rendered at 3x resolution.
 * So a 301x788px browser element becomes a 903x2364px image.
 * Bounding boxes must be scaled by 3x to match the image coordinates.
 * 
 * @param backendData - The backend output with bounding boxes
 * @param pixelRatio - The pixel ratio to scale by (e.g., 3 for high-quality capture)
 * @returns New backend output with scaled bounding boxes
 */
export function scaleBackendBoundingBoxes(
  backendData: BackendOutput,
  pixelRatio: number = 3
): BackendOutput {
  // Deep clone to avoid mutating original data
  const scaledOutput: BackendOutput = JSON.parse(JSON.stringify(backendData));
  
  // Helper function to scale a single bounding box
  const scaleBoundingBox = (bbox: number[][]): number[][] => {
    return bbox.map(([x, y]) => [
      Math.round(x * pixelRatio),
      Math.round(y * pixelRatio)
    ]);
  };
  
  // Helper function to scale a product and its stacked items recursively
  const scaleProduct = (product: BackendProduct): void => {
    // Scale this product's bounding box
    product["Bounding-Box"] = scaleBoundingBox(product["Bounding-Box"]);
    
    // Scale width and height
    product.width = Math.round(product.width * pixelRatio);
    product.height = Math.round(product.height * pixelRatio);
    
    // Recursively scale stacked products
    if (product.stacked && Array.isArray(product.stacked)) {
      product.stacked.forEach(stackedProduct => scaleProduct(stackedProduct));
    }
  };
  
  // Scale all sections and products
  scaledOutput.Cooler["Door-1"].Sections.forEach(section => {
    // Scale section polygon if it exists
    if (section.data && section.data.length > 0) {
      section.data = scaleBoundingBox(section.data);
    }
    
    // Scale all products in this section
    section.products.forEach(product => scaleProduct(product));
  });
  
  // Scale dimensions
  scaledOutput.dimensions.width = Math.round(scaledOutput.dimensions.width * pixelRatio);
  scaledOutput.dimensions.height = Math.round(scaledOutput.dimensions.height * pixelRatio);
  
  if (scaledOutput.dimensions.totalWidth) {
    scaledOutput.dimensions.totalWidth = Math.round(scaledOutput.dimensions.totalWidth * pixelRatio);
  }
  if (scaledOutput.dimensions.totalHeight) {
    scaledOutput.dimensions.totalHeight = Math.round(scaledOutput.dimensions.totalHeight * pixelRatio);
  }
  if (scaledOutput.dimensions.headerHeight) {
    scaledOutput.dimensions.headerHeight = Math.round(scaledOutput.dimensions.headerHeight * pixelRatio);
  }
  if (scaledOutput.dimensions.grilleHeight) {
    scaledOutput.dimensions.grilleHeight = Math.round(scaledOutput.dimensions.grilleHeight * pixelRatio);
  }
  if (scaledOutput.dimensions.frameBorder) {
    scaledOutput.dimensions.frameBorder = Math.round(scaledOutput.dimensions.frameBorder * pixelRatio);
  }
  
  return scaledOutput;
}

/**
 * Log comparison between browser and scaled coordinates for debugging
 * Useful for verifying scaling is working correctly
 * 
 * @param backendData - The backend output with browser coordinates
 * @param pixelRatio - The pixel ratio to scale by (default: 3)
 */
export function logScalingComparison(
  backendData: BackendOutput,
  pixelRatio: number = 3
): void {
  const scaledData = scaleBackendBoundingBoxes(backendData, pixelRatio);
  
  console.group('🎯 Bounding Box Scaling Comparison');
  console.log(`Pixel Ratio: ${pixelRatio}x`);
  console.log('━'.repeat(80));
  
  // Log dimensions
  console.group('📐 Dimensions');
  console.log('Browser (1x):', {
    width: backendData.dimensions.width,
    height: backendData.dimensions.height,
  });
  console.log(`Scaled (${pixelRatio}x):`, {
    width: scaledData.dimensions.width,
    height: scaledData.dimensions.height,
  });
  console.groupEnd();
  
  // Log first product from first section
  const firstSection = backendData.Cooler["Door-1"].Sections[0];
  const scaledFirstSection = scaledData.Cooler["Door-1"].Sections[0];
  
  if (firstSection?.products[0]) {
    const browserProduct = firstSection.products[0];
    const scaledProduct = scaledFirstSection.products[0];
    
    console.group('📦 First Product Example');
    console.log('Product:', browserProduct.product);
    console.log('SKU:', browserProduct["SKU-Code"]);
    console.log('━'.repeat(80));
    
    console.log('Browser (1x) Bounding Box:', browserProduct["Bounding-Box"]);
    console.log(`Scaled (${pixelRatio}x) Bounding Box:`, scaledProduct["Bounding-Box"]);
    console.log('━'.repeat(80));
    
    console.log('Browser (1x) Size:', {
      width: browserProduct.width,
      height: browserProduct.height
    });
    console.log(`Scaled (${pixelRatio}x) Size:`, {
      width: scaledProduct.width,
      height: scaledProduct.height
    });
    console.groupEnd();
  }
  
  // Log totals
  const browserCount = backendData.Cooler["Door-1"].Sections.reduce(
    (sum, section) => sum + section.products.length, 0
  );
  
  console.log('━'.repeat(80));
  console.log(`📊 Total Products Scaled: ${browserCount}`);
  console.log('✅ All coordinates multiplied by', pixelRatio);
  console.groupEnd();
}

// --- (UPDATED) Your Type-Safe Converter Function ---

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