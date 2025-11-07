'use client';

import React, { useMemo } from 'react';
import { usePlanogramStore } from '@/lib/store';
import { convertFrontendToBackend, BackendProduct } from '@/lib/backend-transform';
import { availableLayoutsData } from '@/lib/planogram-data';

interface BoundingBoxOverlayProps {
  isVisible: boolean;
  selectedLayoutId: string;
  headerHeight: number;
  grilleHeight: number;
  contentYOffset: number;
}

export function BoundingBoxOverlay({ isVisible, selectedLayoutId, headerHeight, grilleHeight, contentYOffset }: BoundingBoxOverlayProps) {
  const refrigerator = usePlanogramStore((state) => state.refrigerator);
  
  // Get refrigerator dimensions
  const dimensions = useMemo(() => {
    const layout = availableLayoutsData[selectedLayoutId];
    if (layout) {
      return { width: layout.width, height: layout.height };
    }
    return { width: 600, height: 800 };
  }, [selectedLayoutId]);
  // Generate backend data with bounding boxes and extract products
  // Backend uses ABSOLUTE coordinates (includes frame border + header offset)
  const { products, sections } = useMemo(() => {
    const backendData = convertFrontendToBackend(
      refrigerator, 
      dimensions.width, 
      dimensions.height,
      headerHeight,  // Used to calculate absolute Y offset
      grilleHeight,  // Stored in dimensions
      16 // frameBorder - Used to calculate absolute X and Y offset
    );
    const allProducts: BackendProduct[] = [];
    const allSections: Array<{ id: string; polygon: number[][] }> = [];

    // Extract products from the nested structure
    const door1 = backendData.Cooler['Door-1'];
    if (door1 && door1.Sections) {
      door1.Sections.forEach((section, sectionIndex) => {
        if (section.products) {
          allProducts.push(...section.products);
        }
        if (section.data) {
          allSections.push({
            id: `section-${sectionIndex + 1}`,
            polygon: section.data
          });
        }
      });
    }    return { products: allProducts, sections: allSections };
  }, [refrigerator, dimensions, headerHeight, grilleHeight]);
  
  if (!isVisible) return null;  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      {/* Render bounding boxes for each product */}
      {products.map((product: BackendProduct, index: number) => {
        const bbox = product['Bounding-Box'];
        if (!bbox || bbox.length !== 4) return null;

        // Backend coordinates are ABSOLUTE (from refrigerator top-left at 0,0)
        // But overlay is positioned inside content area, so we need to subtract offsets
        const FRAME_OFFSET = 16; // Frame border
        const HEADER_OFFSET = headerHeight; // Header height
        
        // Extract absolute coordinates from backend data
        const xLeftAbsolute = bbox[0][0];
        const yTopAbsolute = bbox[0][1];
        const xRightAbsolute = bbox[2][0];
        const yBottomAbsolute = bbox[2][1];
        
        // Convert to content-relative for rendering in overlay
        const xLeft = xLeftAbsolute - FRAME_OFFSET;
        const yTop = yTopAbsolute - FRAME_OFFSET - HEADER_OFFSET;
        const xRight = xRightAbsolute - FRAME_OFFSET;
        const yBottom = yBottomAbsolute - FRAME_OFFSET - HEADER_OFFSET;

        const width = xRight - xLeft;
        const height = yBottom - yTop;

        // Generate a color based on product index for variety
        const hue = (index * 137.5) % 360; // Golden angle for good color distribution
        const color = `hsl(${hue}, 70%, 50%)`;

        return (
          <React.Fragment key={`bbox-${product['SKU-Code']}-${index}`}>
            {/* Top-left corner */}
            <div
              className="absolute w-1 h-1 rounded-full shadow-lg"
              style={{
                left: `${xLeft}px`,
                top: `${yTop}px`,
                backgroundColor: color,
                transform: 'translate(-50%, -50%)',
              }}
              title={`${product['SKU-Code']} - Top Left (${xLeft}, ${yTop})`}
            />
            
            {/* Top-right corner */}
            <div
              className="absolute w-1 h-1 rounded-full shadow-lg"
              style={{
                left: `${xRight}px`,
                top: `${yTop}px`,
                backgroundColor: color,
                transform: 'translate(-50%, -50%)',
              }}
              title={`${product['SKU-Code']} - Top Right (${xRight}, ${yTop})`}
            />
            
            {/* Bottom-left corner */}
            <div
              className="absolute w-1 h-1 rounded-full shadow-lg"
              style={{
                left: `${xLeft}px`,
                top: `${yBottom}px`,
                backgroundColor: color,
                transform: 'translate(-50%, -50%)',
              }}
              title={`${product['SKU-Code']} - Bottom Left (${xLeft}, ${yBottom})`}
            />
            
            {/* Bottom-right corner */}
            <div
              className="absolute w-1 h-1 rounded-full shadow-lg"
              style={{
                left: `${xRight}px`,
                top: `${yBottom}px`,
                backgroundColor: color,
                transform: 'translate(-50%, -50%)',
              }}
              title={`${product['SKU-Code']} - Bottom Right (${xRight}, ${yBottom})`}
            />
          </React.Fragment>
        );
      })}      {/* Info panel with comprehensive dimensions */}
      <div className="absolute top-2 right-2 bg-black/90 text-white text-xs font-mono p-3 rounded-lg shadow-xl max-w-sm pointer-events-auto">
        <div className="font-bold text-green-400 mb-3 flex items-center gap-2">
          🎯 Bounding Box Debug Mode
        </div>
        
        <div className="space-y-3">
          {/* Refrigerator Dimensions */}
          <div className="bg-blue-900/30 p-2 rounded border border-blue-500/30">
            <div className="text-blue-300 font-semibold mb-1">📐 Refrigerator</div>
            <div className="text-[10px] space-y-0.5">
              <div>Content Width: <span className="text-blue-400 font-bold">{dimensions.width}px</span></div>
              <div>Content Height: <span className="text-blue-400 font-bold">{dimensions.height}px</span></div>
              <div className="border-t border-blue-500/20 mt-1 pt-1">
                <div>Header Height: <span className="text-yellow-400 font-bold">{headerHeight}px</span></div>
                <div>Grille Height: <span className="text-yellow-400 font-bold">{grilleHeight}px</span></div>
                <div>Frame Border: <span className="text-yellow-400 font-bold">16px</span></div>
              </div>
              <div className="border-t border-blue-500/20 mt-1 pt-1">
                <div>Total Width: <span className="text-green-400 font-bold">{dimensions.width + 32}px</span></div>
                <div>Total Height: <span className="text-green-400 font-bold">{dimensions.height + headerHeight + grilleHeight + 32}px</span></div>
              </div>
              <div>Layout: <span className="text-blue-400 font-bold">{selectedLayoutId}</span></div>
            </div>
          </div>

          {/* Product Statistics */}
          <div className="bg-purple-900/30 p-2 rounded border border-purple-500/30">
            <div className="text-purple-300 font-semibold mb-1">📦 Products</div>
            <div className="text-[10px] space-y-0.5">
              <div>Count: <span className="text-purple-400 font-bold">{products.length}</span></div>
              <div>Sections: <span className="text-purple-400 font-bold">{sections.length}</span></div>
            </div>
          </div>

          {/* Product Dimensions Summary */}
          {products.length > 0 && (
            <div className="bg-green-900/30 p-2 rounded border border-green-500/30">
              <div className="text-green-300 font-semibold mb-1">📏 Product Sizes</div>
              <div className="text-[10px] space-y-0.5 max-h-32 overflow-y-auto">
                {products.slice(0, 10).map((product, idx) => {
                  const bbox = product['Bounding-Box'];
                  if (!bbox || bbox.length !== 4) return null;
                  
                  const width = Math.round(bbox[2][0] - bbox[0][0]);
                  const height = Math.round(bbox[2][1] - bbox[0][1]);
                  
                  return (
                    <div key={idx} className="flex justify-between gap-2">
                      <span className="truncate flex-1" title={product['SKU-Code']}>
                        {product['SKU-Code'].substring(0, 15)}...
                      </span>
                      <span className="text-green-400 font-bold">
                        {width}×{height}
                      </span>
                    </div>
                  );
                })}
                {products.length > 10 && (
                  <div className="text-gray-400 italic">
                    +{products.length - 10} more...
                  </div>
                )}
              </div>
            </div>
          )}          {/* Tips */}
          <div className="text-[10px] text-gray-400 border-t border-gray-700 pt-2">
            <div className="text-yellow-300 mb-1">💡 Coordinate System:</div>
            <div>• Origin (0,0) at refrigerator top-left</div>
            <div>• Includes frame (16px) + header ({headerHeight}px)</div>
            <div>• Bounding boxes in absolute coordinates</div>
            <div>• Content starts at ({16}, {16 + headerHeight})</div>
          </div>
        </div>
      </div>
    </div>
  );
}
