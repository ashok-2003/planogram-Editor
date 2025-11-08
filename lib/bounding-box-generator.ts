/**
 * Bounding Box Generation Module
 * 
 * Handles the generation of bounding boxes for products in the refrigerator.
 * Uses absolute positioning from the top-left of the refrigerator component.
 */

import { Item } from './types';

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
