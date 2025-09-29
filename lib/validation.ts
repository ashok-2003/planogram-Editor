import { Item, Refrigerator, Sku } from './types';
import { DragValidation } from '@/app/planogram/components/planogramEditor';

// This payload contains all the necessary information to run our validation checks.
interface ValidationPayload {
    draggedItem: Item | Sku;
    draggedEntityHeight: number;
    isSingleItemStackable: boolean;
    activeDragId: string;
    refrigerator: Refrigerator;
    findStackLocation: (itemId: string) => { rowId: string; stackIndex: number } | null;
}

/**
 * A centralized function to run all business logic checks when a drag starts.
 * It determines which rows and stacks are valid drop targets based on a set of rules.
 * @returns A DragValidation object with sets of valid row and stack IDs.
 */
export function runValidation({
    draggedItem,
    draggedEntityHeight,
    isSingleItemStackable,
    activeDragId,
    refrigerator,
    findStackLocation,
}: ValidationPayload): DragValidation {
    const validRowIds = new Set<string>();
    const validStackTargetIds = new Set<string>();

    const draggedItemWidth = draggedItem.width;
    const placementRule = draggedItem.constraints.movableRows;
    const originLocation = findStackLocation(activeDragId);

    for (const rowId in refrigerator) {
        const row = refrigerator[rowId];

        // --- Business Rules Engine ---

        // Rule 1: Placement Restriction (movableRows)
        // Checks if the item is allowed in this specific row.
        const isRowAllowedByPlacement = placementRule === 'all' || placementRule.includes(rowId);
        if (!isRowAllowedByPlacement) continue;

        // Rule 2: Height Restriction (maxHeight)
        // Checks if the entire dragged stack/item fits vertically in the row.
        if (draggedEntityHeight > row.maxHeight) continue;

        // Rule 3: Width Restriction (capacity)
        // Checks if adding the item would exceed the row's horizontal capacity.
        const currentWidth = row.stacks.reduce((sum, stack) => sum + (stack[0]?.width || 0), 0);
        const widthWithoutActiveItem = originLocation?.rowId === rowId ? currentWidth - draggedItemWidth : currentWidth;
        if (widthWithoutActiveItem + draggedItemWidth > row.capacity) continue;

        // If all rules pass for re-ordering/moving, the row is marked as valid.
        validRowIds.add(rowId);

        // Rule 4: Stacking Validation (runs only for valid rows)
        // Checks which existing stacks can accept the dragged item.
        if (isSingleItemStackable) {
            for (const stack of row.stacks) {
                if (!stack[0]) continue;
                const stackId = stack[0].id;
                if (stackId === activeDragId) continue;

                const targetStackHeight = stack.reduce((sum, item) => sum + item.height, 0);
                // Stacking only involves adding the height of the single dragged item.
                if (targetStackHeight + draggedItem.height <= row.maxHeight) {
                    validStackTargetIds.add(stackId);
                }
            }
        }
    }

    return { validRowIds, validStackTargetIds };
}