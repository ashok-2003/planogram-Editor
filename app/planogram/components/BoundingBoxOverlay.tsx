'use client';

import React, { useMemo } from 'react';
import { usePlanogramStore } from '@/lib/store';
import { convertFrontendToBackend, BackendProduct } from '@/lib/backend-transform';
import { availableLayoutsData } from '@/lib/planogram-data';

interface BoundingBoxOverlayProps {
  isVisible: boolean;
  selectedLayoutId: string;
}

export function BoundingBoxOverlay({ isVisible, selectedLayoutId }: BoundingBoxOverlayProps) {
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
  const { products, sections } = useMemo(() => {
    const backendData = convertFrontendToBackend(refrigerator, dimensions.width, dimensions.height);
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
  }, [refrigerator, dimensions]);
  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      {/* Render bounding boxes for each product */}
      {products.map((product: BackendProduct, index: number) => {
        const bbox = product['Bounding-Box'];
        if (!bbox || bbox.length !== 4) return null;

        // Extract coordinates: [[xLeft, yTop], [xLeft, yBottom], [xRight, yBottom], [xRight, yTop]]
        const xLeft = bbox[0][0];
        const yTop = bbox[0][1];
        const xRight = bbox[2][0];
        const yBottom = bbox[2][1];

        const width = xRight - xLeft;
        const height = yBottom - yTop;

        // Generate a color based on product index for variety
        const hue = (index * 137.5) % 360; // Golden angle for good color distribution
        const color = `hsl(${hue}, 70%, 50%)`;        return (
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
      })}      {/* Section outlines - Removed for cleaner view */}{/* Info panel */}
      {/* <div className="absolute top-2 right-2 bg-black/80 text-white text-xs font-mono p-3 rounded shadow-lg max-w-xs pointer-events-auto">
        <div className="font-bold text-green-400 mb-2">🎯 Bounding Box Debug Mode</div>
        <div className="space-y-1 text-[10px]">
          <div>📦 Products: {products.length}</div>
          <div>📐 Refrigerator: {String(dimensions.width)}×{String(dimensions.height)}px</div>
          <div>🔲 Sections: {sections.length}</div>
          <div className="mt-2 pt-2 border-t border-gray-600">
            <div className="text-yellow-300">💡 Tips:</div>
            <div>• Each box shows SKU code</div>
            <div>• (x,y) = top-left coordinate</div>
            <div>• w×h = dimensions</div>
            <div>• Colors distinguish products</div>
          </div>
        </div>
      </div> */}
    </div>
  );
}
