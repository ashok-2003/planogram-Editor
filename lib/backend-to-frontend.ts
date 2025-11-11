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

interface AIBackendData {
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
 * Finds the best-matching layout.
 * 1. Tries to find a layout with the exact number of rows.
 * 2. If no match, defaults to 'g-26c'.
 */
function findMatchingLayout(
    aiSections: AIBackendSection[],
    availableLayouts: { [key: string]: LayoutData }
): LayoutData {
    const shelfCount = aiSections.length;

    // 1. Try to find an exact match
    const matchingLayoutId = Object.keys(availableLayouts).find(layoutId => {
        const layout = availableLayouts[layoutId];
        const rowCount = Object.keys(layout.layout).length;
        return rowCount === shelfCount;
    });

    if (matchingLayoutId) {
        return availableLayouts[matchingLayoutId];
    }

    // 2. Default to 'g-26c'
    // We return a deep copy to avoid mutation
    return JSON.parse(JSON.stringify(availableLayouts['g-26c']));
}

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
 * @param availableLayouts The map of all available layouts (from planogram-data.ts).
 * @returns A fully formed Refrigerator object for the Zustand store.
 */
export function convertBackendToFrontend(
    aiData: AIBackendData,
    availableSkus: Sku[],
    availableLayouts: { [key: string]: LayoutData }
): Refrigerator {

    // 1. Create a SKU Map for fast lookups
    const skuMap = new Map<string, Sku>();
    for (const sku of availableSkus) {
        skuMap.set(sku.skuId, sku);
    }

    const aiSections = aiData.Cooler["Door-1"].Sections;

    // 2. Select the base refrigerator layout
    const baseLayoutData = findMatchingLayout(aiSections, availableLayouts);
    const layoutTemplate = baseLayoutData.layout;
    const layoutRowIds = Object.keys(layoutTemplate).sort();

    // 3. Create the new refrigerator state using Immer for safe mutation
    const newRefrigerator = produce(layoutTemplate, draft => {
        // Clear all existing stacks from the template
        for (const rowId of layoutRowIds) {
            draft[rowId].stacks = [];
        }

        // 4. Iterate over each AI Section (Shelf)
        // We use index to map AI Section[0] to layoutRowIds[0]
        aiSections.forEach((section, index) => {
            // Find the corresponding rowId for this section index
            const rowId = layoutRowIds[index];

            // If AI has more shelves than our default layout, ignore them
            if (!rowId) {
                console.warn(`AI sent ${aiSections.length} shelves, but layout 'g-26c' only has ${layoutRowIds.length}. Ignoring extra shelves.`);
                return;
            }

            const row = draft[rowId];

            // 5. Iterate over each "product" (which represents one stack)
            for (const aiProductStack of section.products) {

                const newStack: Item[] = [];

                // 6. Check the main (bottom) product
                const bottomSku = skuMap.get(aiProductStack["SKU-Code"]);
                if (bottomSku) {
                    newStack.push(createItemFromSku(bottomSku));
                }

                // 7. Check the stacked items
                if (aiProductStack.stacked && Array.isArray(aiProductStack.stacked)) {
                    for (const aiStackedItem of aiProductStack.stacked) {

                        const stackedSku = skuMap.get(aiStackedItem["SKU-Code"]);
                        if (stackedSku) {
                            newStack.push(createItemFromSku(stackedSku));
                        }
                    }
                }

                // 8. Add the new stack to the row *if* we found any valid items
                if (newStack.length > 0) {
                    // We must respect the frontend data structure: Item[][]
                    row.stacks.push(newStack);
                }
            }
        });
    });

    return newRefrigerator;
}