import { Refrigerator, Sku, Item, LayoutData, Row } from './types';
import { produce } from 'immer';

// --- Define AI Data Structure ---
// These types match the AI's JSON response

interface AIBackendProduct {
    product: string;
    "SKU-Code": string;
    Confidence: string;
    "Bounding-Box": number[][];
    Position: string;
    stacked: AIBackendProduct[] | null; // Can be null or array
    stackSize: number;
}

interface AIBackendSection {
    products: AIBackendProduct[];
    data: number[][];
    position: number;
}

export interface AIBackendData {
    Cooler: {
        "Door-1": {
            Sections: AIBackendSection[];
            "Door-Visible": boolean;
        };
    };
    dimensions?: { // Dimensions may or may not exist
        width: number;
        height: number;
        BoundingBoxScale: number;
    };
}

// --- Helper Functions ---

/**
 * Generates a unique ID for a new frontend item.
 */
const generateUniqueId = (skuId: string): string => {
    return `${skuId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Creates a new frontend Item from a Sku.
 */
function createItemFromSku(sku: Sku): Item {
    return {
        ...sku,
        id: generateUniqueId(sku.skuId),
        // We can add any other required transformations here
    };
}


// --- Main Conversion Function ---

/**
 * Converts the AI backend JSON data into the frontend's Refrigerator state.
 *
 * @param aiData The raw JSON data from the AI backend.
 * @param availableSkus The list of all available SKUs (from demo-sku.ts).
 * @param chosenLayout The specific layout (e.g., 'g-7f') chosen by the user or matched automatically.
 * @returns A fully formed Refrigerator object for the Zustand store.
 */
export function convertBackendToFrontend(
    aiData: AIBackendData,
    availableSkus: Sku[],
    chosenLayout: LayoutData
): Refrigerator {

    console.log(`[Converter] Starting conversion using layout: ${chosenLayout.name}`);

    // 1. Create a SKU Map for fast lookups
    const skuMap = new Map<string, Sku>();
    for (const sku of availableSkus) {
        skuMap.set(sku.skuId, sku);
    }

    const aiSections = aiData.Cooler["Door-1"].Sections;

    // 2. Use the CHOSEN layout template
    const layoutTemplate = chosenLayout.layout;
    const layoutRowIds = Object.keys(layoutTemplate).sort();

    // 3. Create the new refrigerator state using Immer for safe mutation
    const newRefrigerator = produce(layoutTemplate, draft => {
        // Clear all existing stacks from the template
        for (const rowId of layoutRowIds) {
            draft[rowId].stacks = [];
        }

        // 4. Iterate over each AI Section (Shelf)
        aiSections.forEach((section, index) => {
            const rowId = layoutRowIds[index];

            // This should not happen if our layout matching is correct, but good to check.
            if (!rowId) {
                console.warn(`[Converter] AI sent shelf at index ${index}, but layout ${chosenLayout.name} only has ${layoutRowIds.length} rows. Ignoring extra shelf.`);
                return;
            }

            const row = draft[rowId];

            // 5. Iterate over each "product" (which represents one stack)
            for (const aiProductStack of section.products) {

                const newStack: Item[] = [];

                // 6. Check the main (bottom) product
                const bottomSkuCode = aiProductStack["SKU-Code"];
                const bottomSku = skuMap.get(bottomSkuCode);

                if (bottomSku) {
                    console.log(`[Converter] Matched SKU: ${bottomSkuCode}`);
                    newStack.push(createItemFromSku(bottomSku));
                } else {
                    console.warn(`[Converter] SKIPPED SKU (not found): ${bottomSkuCode}`);
                }

                // 7. Check the stacked items
                if (aiProductStack.stacked && Array.isArray(aiProductStack.stacked)) {
                    for (const aiStackedItem of aiProductStack.stacked) {
                        const stackedSkuCode = aiStackedItem["SKU-Code"];
                        const stackedSku = skuMap.get(stackedSkuCode);

                        if (stackedSku) {
                            console.log(`[Converter] Matched Stacked SKU: ${stackedSkuCode}`);
                            newStack.push(createItemFromSku(stackedSku));
                        } else {
                            console.warn(`[Converter] SKIPPED Stacked SKU (not found): ${stackedSkuCode}`);
                        }
                    }
                }

                // 8. Add the new stack to the row *if* we found any valid items
                if (newStack.length > 0) {
                    row.stacks.push(newStack);
                }
            }
        });
    });

    console.log("[Converter] Conversion complete. Final state:", newRefrigerator);
    return newRefrigerator;
}