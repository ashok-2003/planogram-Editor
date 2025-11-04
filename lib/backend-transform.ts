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

// --- (UPDATED) Your Type-Safe Converter Function ---

/**
 * Converts the frontend row data back into the backend 'Sections' format.
 * @param {Refrigerator} frontendData - The strongly-typed frontend data object.
 * @returns {BackendOutput} - The strongly-typed backend data.
 */
export function convertFrontendToBackend(frontendData: Refrigerator): BackendOutput {
  
  // 1. Initialize the final backend structure
  const backendOutput: BackendOutput = {
    Cooler: {
      "Door-1": {
        data: [], // Placeholder for door polygon
        Sections: [],
        "Door-Visible": true, // You can set this as needed
      },
    },
    dimensions: {
      width: 0, 
      height: 0,
    },
  };

  // 2. Iterate over each "row" in the frontend data
  const rowKeys = Object.keys(frontendData).sort();

  rowKeys.forEach((rowKey, rowIndex) => {
    const currentRow: Row = frontendData[rowKey]; // <-- Typed as Row

    // 3. Create a new Section for this row
    const newSection: BackendSection = { // <-- Typed as BackendSection
      data: [], // Placeholder for section polygon
      position: rowIndex + 1, // "row-1" -> 1, "row-2" -> 2
      products: [],
    };

    // 4. Iterate over the "stacks" array (the horizontal items)
    currentRow.stacks.forEach((stackArray: Item[], stackIndex) => { // <-- Typed as Item[]
      if (stackArray.length === 0) {
        return;
      }

      // 5. Get the front item and the items behind it
      const frontProductFE: Item = stackArray[0]; // <-- Typed as Item
      const stackedProductsFE: Item[] = stackArray.slice(1); // <-- Typed as Item[]

      if (frontProductFE.skuId === "sku-blank-space") {
        return;
      }

      // 7. Convert the "stacked" items
      const backendStackedProducts: BackendProduct[] = stackedProductsFE.map((feProduct: Item): BackendProduct | null => { // <-- Typed
        if (feProduct.skuId === "sku-blank-space") {
          return null; 
        }
        
        return {
          product: feProduct.name,
          stacked: null,
          Position: feProduct.id, 
          "SKU-Code": feProduct.skuId,
          stackSize: 0,
          Confidence: "1.0",
          "Bounding-Box": [],
        };
      }).filter((p): p is BackendProduct => p !== null); // Type guard to filter nulls

      // 8. Create the main "front" product
      const backendFrontProduct: BackendProduct = { // <-- Typed as BackendProduct
        product: frontProductFE.name,
        stacked: backendStackedProducts,
        Position: (stackIndex + 1).toString(), 
        "SKU-Code": frontProductFE.skuId,
        stackSize: stackArray.filter(p => p.skuId !== "sku-blank-space").length,
        Confidence: "1.0", 
        "Bounding-Box": [],
      };

      // 9. Add this converted product to its section
      newSection.products.push(backendFrontProduct);
    });

    // 10. Add the completed section to the final output
    backendOutput.Cooler["Door-1"].Sections.push(newSection);
  });

  return backendOutput;
}