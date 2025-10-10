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
  const originLocation = findStackLocation(activeDragId);

  // --- 1. VALIDATION FOR RE-ORDERING / MOVING ---
  for (const rowId in refrigerator) {
    const row = refrigerator[rowId];
    
    // --- Business Rules Engine (Refactored) ---

    // Rule 1: Placement Restriction (Allowed Product Types)
    // CHECKS IF THE ROW ACCEPTS THE DRAGGED ITEM'S TYPE.
    const isRowAllowedByPlacement = row.allowedProductTypes === 'all' || row.allowedProductTypes.includes(draggedItem.productType);
    if (!isRowAllowedByPlacement) continue;

    // Rule 2: Height Restriction
    if (draggedEntityHeight > row.maxHeight) continue;

    // Rule 3: Width Restriction
    const currentWidth = row.stacks.reduce((sum, stack) => sum + (stack[0]?.width || 0), 0);
    const widthWithoutActiveItem = originLocation?.rowId === rowId ? currentWidth - draggedItemWidth : currentWidth;
    if (widthWithoutActiveItem + draggedItemWidth > row.capacity) continue;
    
    validRowIds.add(rowId);
  }

  // --- 2. VALIDATION FOR STACKING ---
  if (isSingleItemStackable) {
    for (const rowId in refrigerator) {
      const row = refrigerator[rowId];

      // Stacking must still respect the row's allowed product types.
      const isRowAllowedByPlacement = row.allowedProductTypes === 'all' || row.allowedProductTypes.includes(draggedItem.productType);
      if (!isRowAllowedByPlacement) continue;

      // The single dragged item itself must fit within the row's max height.
      if (draggedItem.height > row.maxHeight) continue;

      for (const stack of row.stacks) {
        if (!stack[0]) continue;
        const stackId = stack[0].id;
        if (stackId === activeDragId) continue;

        const targetStackHeight = stack.reduce((sum, item) => sum + item.height, 0);
        if (targetStackHeight + draggedItem.height <= row.maxHeight) {
          validStackTargetIds.add(stackId);
        }
      }
    }
  }

  return { validRowIds, validStackTargetIds };
}