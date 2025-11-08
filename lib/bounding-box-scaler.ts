/**
 * Bounding Box Scaling Module
 * 
 * Handles scaling of bounding boxes to match captured image coordinates.
 * When images are captured with high pixelRatio, coordinates must be scaled accordingly.
 */

import { PIXEL_RATIO } from './config';
import { BackendProduct, BackendOutput } from './backend-transform';

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
  
  // Scale all sections and products
  scaledOutput.Cooler["Door-1"].Sections.forEach(section => {
    // Scale section polygon if it exists
    if (section.data && section.data.length > 0) {
      section.data = scaleBoundingBox(section.data, pixelRatio);
    }
    
    // Scale all products in this section
    section.products.forEach(product => scaleProduct(product, pixelRatio));
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
