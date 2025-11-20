import { Refrigerator, Sku, Item, LayoutData, Row, MultiDoorRefrigerator } from './types';
import { produce } from 'immer';
import { ENABLE_MULTI_DOOR_DETECTION } from './config';

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

interface AIBackendDoor {
    Sections: AIBackendSection[];
    "Door-Visible": boolean;
    data?: number[][]; // Door polygon (optional)
}

export interface AIBackendData {
    Cooler: {
        "Door-1": AIBackendDoor;
        "Door-2"?: AIBackendDoor; // Optional second door
        [key: string]: AIBackendDoor | undefined; // Support for future doors
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

/**
 * Detects if the AI backend data contains multiple doors.
 * @param aiData The raw JSON data from the AI backend.
 * @returns True if Door-2 exists and feature flag is enabled.
 */
export function isMultiDoorAIData(aiData: AIBackendData): boolean {
    if (!ENABLE_MULTI_DOOR_DETECTION) {
        return false;
    }
    
    return aiData.Cooler["Door-2"] !== undefined && 
           aiData.Cooler["Door-2"]?.Sections !== undefined &&
           aiData.Cooler["Door-2"].Sections.length > 0;
}

/**
 * Converts a single door's AI data to frontend Refrigerator format.
 * Helper function used by both single-door and multi-door converters.
 */
function convertSingleDoorData(
    aiSections: AIBackendSection[],
    layoutTemplate: Refrigerator,
    skuMap: Map<string, Sku>,
    doorName: string
): Refrigerator {
    const layoutRowIds = Object.keys(layoutTemplate).sort();

    // Create the new refrigerator state using Immer for safe mutation
    const newRefrigerator = produce(layoutTemplate, draft => {
        if (!draft) return;
        
        // Clear all existing stacks from the template
        for (const rowId of layoutRowIds) {
            if (draft[rowId]) {
                draft[rowId].stacks = [];
            }
        }

        // Iterate over each AI Section (Shelf)
        aiSections.forEach((section, index) => {
            const rowId = layoutRowIds[index];

            // Check if we have a matching row
            if (!rowId) {
                console.warn(`[Converter] ${doorName}: AI sent shelf at index ${index}, but layout only has ${layoutRowIds.length} rows. Ignoring extra shelf.`);
                return;
            }            const row = draft[rowId];
            if (!row) return;

            // Iterate over each "product" (which represents one stack)
            for (const aiProductStack of section.products) {
                const newStack: Item[] = [];

                // Check the main (bottom) product
                const bottomSkuCode = aiProductStack["SKU-Code"];
                
                // Skip empty shelves (shelfscan_0000)
                if (bottomSkuCode === "shelfscan_0000" || aiProductStack.product === "Empty") {
                    console.log(`[Converter] ${doorName}: Skipping empty space`);
                    continue;
                }
                
                const bottomSku = skuMap.get(bottomSkuCode);

                if (bottomSku) {
                    console.log(`[Converter] ${doorName}: Matched SKU: ${bottomSkuCode}`);
                    newStack.push(createItemFromSku(bottomSku));
                } else {
                    console.warn(`[Converter] ${doorName}: SKIPPED SKU (not found): ${bottomSkuCode}`);
                }

                // Check the stacked items
                if (aiProductStack.stacked && Array.isArray(aiProductStack.stacked)) {
                    for (const aiStackedItem of aiProductStack.stacked) {
                        const stackedSkuCode = aiStackedItem["SKU-Code"];
                        
                        // Skip empty stacked items
                        if (stackedSkuCode === "shelfscan_0000" || aiStackedItem.product === "Empty") {
                            continue;
                        }
                        
                        const stackedSku = skuMap.get(stackedSkuCode);

                        if (stackedSku) {
                            console.log(`[Converter] ${doorName}: Matched Stacked SKU: ${stackedSkuCode}`);
                            newStack.push(createItemFromSku(stackedSku));
                        } else {
                            console.warn(`[Converter] ${doorName}: SKIPPED Stacked SKU (not found): ${stackedSkuCode}`);
                        }
                    }
                }

                // Add the new stack to the row *if* we found any valid items
                if (newStack.length > 0) {
                    row.stacks.push(newStack);
                }
            }
        });
    });

    return newRefrigerator;
}

/**
 * Converts multi-door AI backend JSON data into the frontend's MultiDoorRefrigerator state.
 * Handles both Door-1 and Door-2 from AI backend.
 * 
 * @param aiData The raw JSON data from the AI backend (with Door-1 and Door-2).
 * @param availableSkus The list of all available SKUs.
 * @param chosenLayout The layout data with multi-door configuration.
 * @returns A fully formed MultiDoorRefrigerator object.
 */
export function convertMultiDoorBackendToFrontend(
    aiData: AIBackendData,
    availableSkus: Sku[],
    chosenLayout: LayoutData
): MultiDoorRefrigerator {
    console.log(`[Multi-Door Converter] Starting conversion using layout: ${chosenLayout.name}`);
    
    // 1. Create a SKU Map for fast lookups
    const skuMap = new Map<string, Sku>();
    for (const sku of availableSkus) {
        skuMap.set(sku.skuId, sku);
    }
    
    // 2. Get door configurations from layout
    const doorConfigs = chosenLayout.doors;
    if (!doorConfigs || doorConfigs.length === 0) {
        console.error('[Multi-Door Converter] Layout has no door configurations');
        return {};
    }
    
    const result: MultiDoorRefrigerator = {};
    
    // 3. Process each door from AI data
    const aiDoors = Object.keys(aiData.Cooler).filter(key => key.startsWith('Door-'));
    
    console.log(`[Multi-Door Converter] Found ${aiDoors.length} doors in AI data`);
    
    aiDoors.forEach((aiDoorKey, index) => {
        const aiDoor = aiData.Cooler[aiDoorKey];
        if (!aiDoor || !aiDoor.Sections || aiDoor.Sections.length === 0) {
            console.warn(`[Multi-Door Converter] ${aiDoorKey} has no sections, skipping`);
            return;
        }
        
        // Map AI door to frontend door (Door-1 -> door-1, Door-2 -> door-2)
        const frontendDoorId = aiDoorKey.toLowerCase();
        
        // Get the corresponding door config from layout
        const doorConfig = doorConfigs[index];
        if (!doorConfig || !doorConfig.layout) {
            console.error(`[Multi-Door Converter] No door config found for ${aiDoorKey} at index ${index}`);
            return;
        }
        
        console.log(`[Multi-Door Converter] Processing ${aiDoorKey} -> ${frontendDoorId} with ${aiDoor.Sections.length} shelves`);
        
        // Convert this door's data
        const doorLayout = convertSingleDoorData(
            aiDoor.Sections,
            doorConfig.layout,
            skuMap,
            aiDoorKey
        );
        
        result[frontendDoorId] = doorLayout;
    });
    
    console.log("[Multi-Door Converter] Conversion complete. Doors:", Object.keys(result));
    return result;
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
    // For legacy single-door layouts, use chosenLayout.layout
    // For new multi-door layouts, use the first door's layout
    const layoutTemplate = chosenLayout.layout || chosenLayout.doors[0]?.layout;
    
    if (!layoutTemplate) {
        console.error('[Converter] No layout template found');
        return {};
    }
    
    const layoutRowIds = Object.keys(layoutTemplate).sort();

    // 3. Create the new refrigerator state using Immer for safe mutation
    const newRefrigerator = produce(layoutTemplate, draft => {
        if (!draft) return;
        
        // Clear all existing stacks from the template
        for (const rowId of layoutRowIds) {
            if (draft[rowId]) {
                draft[rowId].stacks = [];
            }
        }

        // 4. Iterate over each AI Section (Shelf)
        aiSections.forEach((section, index) => {
            const rowId = layoutRowIds[index];

            // This should not happen if our layout matching is correct, but good to check.
            if (!rowId) {
                console.warn(`[Converter] AI sent shelf at index ${index}, but layout ${chosenLayout.name} only has ${layoutRowIds.length} rows. Ignoring extra shelf.`);
                return;
            }            const row = draft[rowId];
            if (!row) return;

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