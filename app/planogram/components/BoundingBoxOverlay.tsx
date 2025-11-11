'use client';

import React, { useMemo, useState } from 'react';
import { usePlanogramStore } from '@/lib/store';
import { convertFrontendToBackend, convertMultiDoorFrontendToBackend, BackendProduct } from '@/lib/backend-transform';
import { availableLayoutsData } from '@/lib/planogram-data';
import { getDoorConfigs } from '@/lib/multi-door-utils';

interface BoundingBoxOverlayProps {
  isVisible: boolean;
  selectedLayoutId: string;
  headerHeight: number;
  grilleHeight: number;
  contentYOffset: number;
}

export function BoundingBoxOverlay({ isVisible, selectedLayoutId, headerHeight, grilleHeight, contentYOffset }: BoundingBoxOverlayProps) {
  const refrigerator = usePlanogramStore((state) => state.refrigerator);
  const refrigerators = usePlanogramStore((state) => state.refrigerators);
  const isMultiDoor = usePlanogramStore((state) => state.isMultiDoor);
  const [showInfoPanel, setShowInfoPanel] = useState(true); // NEW: State for info panel visibility

  // Get refrigerator dimensions
  const dimensions = useMemo(() => {
    const layout = availableLayoutsData[selectedLayoutId];
    if (layout) {
      const width = layout.width || (layout.doors?.[0]?.width ?? 600);
      const height = layout.height || (layout.doors?.[0]?.height ?? 800);
      return { width, height };
    }
    return { width: 600, height: 800 };
  }, [selectedLayoutId]);

  // Generate backend data with bounding boxes and extract products
  // Backend uses ABSOLUTE coordinates (includes frame border + header offset)
  const { products, sections } = useMemo(() => {
    const layoutData = availableLayoutsData[selectedLayoutId];
    let backendData;
    
    if (isMultiDoor) {
      // Multi-door mode
      const doorConfigs = getDoorConfigs(layoutData);
      backendData = convertMultiDoorFrontendToBackend(
        refrigerators,
        doorConfigs,
        headerHeight,
        grilleHeight,
        16 // frameBorder
      );
    } else {
      // Single-door mode
      backendData = convertFrontendToBackend(
        refrigerator, 
        dimensions.width, 
        dimensions.height,
        headerHeight,
        grilleHeight,
        16 // frameBorder
      );
    }
    
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
    }
    return { products: allProducts, sections: allSections };
  }, [refrigerator, refrigerators, isMultiDoor, dimensions, headerHeight, grilleHeight, selectedLayoutId]);

  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-50">      {/* Render bounding boxes for each product */}
      {products.map((product: BackendProduct, index: number) => {
        const bbox = product['Bounding-Box'];
        if (!bbox || bbox.length !== 4) return null;

        // Backend coordinates are ABSOLUTE (from refrigerator top-left at 0,0)
        // But overlay is positioned inside content area, so we need to subtract offsets
        const FRAME_OFFSET = 16; // Frame border
        const HEADER_OFFSET = headerHeight; // Header height
        const SHELF_THICKNESS_OFFSET = 10; // Shelf bottom thickness adjustment
        
        // Extract absolute coordinates from backend data
        const xLeftAbsolute = bbox[0][0];
        const yTopAbsolute = bbox[0][1];
        const xRightAbsolute = bbox[2][0];
        const yBottomAbsolute = bbox[2][1];
        
        // CRITICAL: Convert to content-relative for rendering in overlay
        // Backend added: frameBorder + headerHeight + shelfThickness (10px)
        // So we subtract: frameBorder + headerHeight + shelfThickness
        const xLeft = xLeftAbsolute - FRAME_OFFSET;
        const yTop = yTopAbsolute - FRAME_OFFSET - HEADER_OFFSET - SHELF_THICKNESS_OFFSET;
        const xRight = xRightAbsolute - FRAME_OFFSET;
        const yBottom = yBottomAbsolute - FRAME_OFFSET - HEADER_OFFSET - SHELF_THICKNESS_OFFSET;

        const width = xRight - xLeft;
        const height = yBottom - yTop;

        // Generate a color based on product index for variety
        const hue = (index * 137.5) % 360; // Golden angle for good color distribution
        const color = `hsl(${hue}, 70%, 50%)`;

        return (
          <React.Fragment key={`bbox-${product['SKU-Code']}-${index}`}>
            {/* Bounding box rectangle with thin lines */}
            <svg
              className="absolute pointer-events-none"
              style={{
                left: `${xLeft}px`,
                top: `${yTop}px`,
                width: `${width}px`,
                height: `${height}px`,
              }}
            >
              {/* Rectangle outline */}
              <rect
                x="0"
                y="0"
                width={width}
                height={height}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeDasharray="4 2"
                opacity="0.8"
              />
              
              {/* Corner markers for better visibility */}
              <circle cx="0" cy="0" r="2" fill={color} />
              <circle cx={width} cy="0" r="2" fill={color} />
              <circle cx="0" cy={height} r="2" fill={color} />
              <circle cx={width} cy={height} r="2" fill={color} />
            </svg>
            
            {/* Label with product name */}
            <div
              className="absolute text-[9px] font-bold px-1 py-0.5 rounded pointer-events-none"
              style={{
                left: `${xLeft}px`,
                top: `${yTop - 14}px`,
                backgroundColor: color,
                color: 'white',
                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                whiteSpace: 'nowrap',
              }}
              title={`${product['SKU-Code']} - ${width}×${height}px`}
            >
              {product['SKU-Code'].substring(0, 12)}
            </div>
          </React.Fragment>
        );
      })}

      {/* NEW: Toggle button for info panel */}
      <button
        onClick={() => setShowInfoPanel(!showInfoPanel)}
        className="absolute top-2 right-2 bg-gray-600 hover:bg-blue-600 text-white p-2 rounded-lg shadow-xl pointer-events-auto transition-colors z-50"
        title={showInfoPanel ? "Hide Info Panel" : "Show Info Panel"}
      >
        {showInfoPanel ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
            <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
          </svg>
        )}
      </button>

      {/* Info panel - NOW CONDITIONAL */}
      {showInfoPanel && (
        <div className="absolute top-14 right-2 bg-black/90 text-white text-xs font-mono p-3 rounded-lg shadow-xl max-w-sm pointer-events-auto">
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
            )}

            {/* Tips */}
            {/* <div className="text-[10px] text-gray-400 border-t border-gray-700 pt-2">
              <div className="text-yellow-300 mb-1">💡 Coordinate System:</div>
              <div>• Origin (0,0) at refrigerator top-left</div>
              <div>• Includes frame (16px) + header ({headerHeight}px)</div>
              <div>• Bounding boxes in absolute coordinates</div>
              <div>• Content starts at ({16}, {16 + headerHeight})</div>
            </div> */}
          </div>
        </div>
      )}
    </div>
  );
}
