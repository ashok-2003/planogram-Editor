import { Sku, Refrigerator, Item } from './types';
import { PIXELS_PER_MM } from './config';

// This is a simplified representation of the raw backend data structure.
// In a real app, you would generate more precise types from your API schema.
type BackendSku = any;
type BackendPlanogram = any;

const generateUniqueId = (skuId: string) => `${skuId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Transforms the raw 'skuDetails' array from the backend into the clean Sku[] format
 * our application's SKU Palette component expects.
 */
export function transformSkus(backendSkus: BackendSku[]): Sku[] {
  return backendSkus.map(sku => {
    // Since widthMM and heightMM are now part of the type, we'll add them, even if they are placeholders
    const widthMM = 0;
    const heightMM = 0;

    return {
      skuId: sku.code || sku.skuId, // Use 'code' as the unique identifier
      name: sku.name,
      widthMM: widthMM, // Add the missing property
      heightMM: heightMM, // Add the missing property
      // Use placeholder dimensions for now, as they are "0" in the backend data
      width: 60,
      height: 15,
      imageUrl: Array.isArray(sku.thumbnails) ? sku.thumbnails[0] : 'https://placehold.co/60x150?text=No+Img',
      // We'll use packCategory as the productType, with a fallback
      productType: sku.packCategory || 'GENERAL',
      constraints: {
        // For now, we'll assume all items are stackable and deletable.
        // This could be driven by backend data in the future.
        stackable: sku.packType === 'PET' || sku.packType === 'CAN' ? false : true,
        deletable: true,
      },
    }
  });
}

/**
 * Transforms the raw planogram data from the backend into the clean Refrigerator object
 * our application's components expect.
 */
export function transformPlanogram(planogramData: BackendPlanogram, allSkus: Sku[]): Refrigerator {
  const refrigerator: Refrigerator = {};
  const coolerData = planogramData.recognisedImages[0]?.metadata?.Cooler;
  if (!coolerData) return {};

  for (const doorKey in coolerData) {
    if (doorKey.startsWith('Door-')) {
      const door = coolerData[doorKey];
      for (const section of door.Sections) {
        // Each "Section" from the backend becomes a "Row" in our application
        const rowId = `row-${doorKey.split('-')[1]}-${section.position}`;
        
        const stacks: Item[][] = section.products.map((product: any) => {
          const sku = allSkus.find(s => s.skuId === String(product['SKU-Code']));
          if (!sku) return null;

          // The Item type doesn't have widthMM/heightMM, so we correctly spread the Sku
          // and then create the unique ID. The final Item object is correct.
          const baseItem: Item = {
            ...sku,
            id: generateUniqueId(sku.skuId),
          };

          // The 'stacked' array in your data is currently empty, but this shows how you'd handle it.
          const stackedItems: Item[] = product.stacked.map((stackedProduct: any) => {
              const stackedSku = allSkus.find(s => s.skuId === String(stackedProduct['SKU-Code']));
              return stackedSku ? { ...stackedSku, id: generateUniqueId(stackedSku.skuId) } : null;
          }).filter(Boolean);

          return [baseItem, ...stackedItems];
        }).filter(Boolean);

        refrigerator[rowId] = {
          id: rowId,
          capacity: 600, // This would likely come from backend metadata in a real scenario
          maxHeight: 30, // This would also come from the backend
          stacks: stacks,
          // For now, we'll allow all product types. This would be configured per cooler model.
          allowedProductTypes: 'all',
        };
      }
    }
  }

  return refrigerator;
}