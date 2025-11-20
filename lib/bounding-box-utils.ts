/**
 * Bounding Box Utilities
 * 
 * Handles generation and scaling of bounding boxes for products.
 * - Generation: Creates bounding boxes with absolute positioning
 * - Scaling: Scales coordinates to match captured image dimensions
 */

import { PIXEL_RATIO } from './config';
import { Item } from './types';
import { BackendProduct, BackendOutput } from './backend-transform';

// ==================== BOUNDING BOX GENERATION ====================

/**
 * Generate bounding box for an item with absolute positioning.
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
export function generateBoundingBox(
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
  const offsetY = frameBorder + headerHeight+ 10; // +10 is intenstially added as the shelfwidht each are thick two pixels so it make the bounding box more accurate 
    // CRITICAL FIX: Use floor/ceil to prevent rounding errors
  // - Floor for top/left edges: ensures box doesn't go too high/left
  // - Ceil for bottom/right edges: ensures box covers the full item
  // This prevents accumulation errors in bottom rows where Math.round() would
  // cause boxes to "float" above actual items
  
  const left = Math.floor(itemLeft + offsetX);
  const right = Math.ceil(itemRight + offsetX);
  const top = Math.floor(itemTop + offsetY);
  const bottom = Math.ceil(itemBottom + offsetY);
  
  // Debug logging for verification (remove in production)
  // if (item.name.includes('bottom') || rowYStart > 600) {
  //   console.log(`📦 Box for ${item.name}:`, {
  //     raw: { top: itemTop + offsetY, bottom: itemBottom + offsetY },
  //     floored: { top, bottom },
  //     diff: { top: (itemTop + offsetY) - top, bottom: bottom - (itemBottom + offsetY) }
  //   });
  // }
  
  // Return 4 corners with absolute coordinates
  return [
    [left, top],       // Top-left
    [left, bottom],    // Bottom-left
    [right, bottom],   // Bottom-right
    [right, top]       // Top-right
  ];
}

/**
 * Generate section polygon outline (optional feature)
 * 
 * @param yStart - Top edge of the section
 * @param yEnd - Bottom edge of the section
 * @param width - Width of the section
 * @returns Array of coordinates forming the section polygon
 */
export function generateSectionPolygon(
  yStart: number,
  yEnd: number,
  width: number
): number[][] {
  // Currently returns empty array as it's not critical
  // Can be implemented later if backend requires it
  return [];
}

// ==================== BOUNDING BOX SCALING ====================

/**
 * Scale a single bounding box by the pixel ratio.
 * 
 * @param bbox - Bounding box with 4 corners [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
 * @param pixelRatio - The pixel ratio to scale by
 * @returns Scaled bounding box
 */
export function scaleBoundingBox(bbox: number[][], pixelRatio: number): number[][] {
  return bbox.map(([x, y]) => [
    Math.round(x * pixelRatio),
    Math.round(y * pixelRatio)
  ]);
}

/**
 * Scale a product's bounding box, dimensions, and all stacked products recursively.
 * This function mutates the product object.
 * 
 * @param product - The product to scale
 * @param pixelRatio - The pixel ratio to scale by
 */
export function scaleProduct(product: BackendProduct, pixelRatio: number): void {
  // Scale this product's bounding box
  product["Bounding-Box"] = scaleBoundingBox(product["Bounding-Box"], pixelRatio);
  
  // Scale width and height
  product.width = Math.round(product.width * pixelRatio);
  product.height = Math.round(product.height * pixelRatio);
  
  // Recursively scale stacked products
  if (product.stacked && Array.isArray(product.stacked)) {
    product.stacked.forEach(stackedProduct => scaleProduct(stackedProduct, pixelRatio));
  }
}

/**
 * Scale all bounding boxes in the backend output by a pixel ratio.
 * This is used to match bounding box coordinates to captured images.
 * 
 * When capturing with PIXEL_RATIO from config, the image is rendered at higher resolution.
 * Bounding boxes must be scaled by the same ratio to match the image coordinates.
 * 
 * @param backendData - The backend output with bounding boxes
 * @param pixelRatio - The pixel ratio to scale by (defaults to PIXEL_RATIO from config)
 * @returns New backend output with scaled bounding boxes
 */
export function scaleBackendBoundingBoxes(
  backendData: BackendOutput,
  pixelRatio: number = PIXEL_RATIO
): BackendOutput {
  // Deep clone to avoid mutating original data
  const scaledOutput: BackendOutput = JSON.parse(JSON.stringify(backendData));
  
  // Scale all doors and their sections/products
  Object.keys(scaledOutput.Cooler).forEach(doorKey => {
    const door = scaledOutput.Cooler[doorKey];
    
    // Scale door polygon if it exists
    if (door.data && door.data.length > 0) {
      door.data = scaleBoundingBox(door.data, pixelRatio);
    }
    
    // Scale all sections in this door
    door.Sections.forEach(section => {
      // Scale section polygon if it exists
      if (section.data && section.data.length > 0) {
        section.data = scaleBoundingBox(section.data, pixelRatio);
      }
      
      // Scale all products in this section
      section.products.forEach(product => scaleProduct(product, pixelRatio));
    });
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
