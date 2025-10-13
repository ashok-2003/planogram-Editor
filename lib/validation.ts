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
  isRulesEnabled: boolean; // New: To respect the toggle
}

/**
 * NEW: Iterates through a refrigerator layout to find all items that violate shelf rules.
 * @param refrigerator The current state of the refrigerator.
 * @returns An array of item IDs that are in conflict with the rules.
 */
export function findConflicts(refrigerator: Refrigerator): string[] {
  const conflictIds: string[] = [];

  for (const rowId in refrigerator) {
    const row = refrigerator[rowId];
    for (const stack of row.stacks) {
      // 1. Check for Height Conflicts within the stack
      const stackHeight = stack.reduce((sum, item) => sum + item.height, 0);
      if (stackHeight > row.maxHeight) {
        // Mark all items in the oversized stack as conflicts
        stack.forEach(item => conflictIds.push(item.id));
      }

      // 2. Check for Placement Conflicts for each item in the stack
      for (const item of stack) {
        if (row.allowedProductTypes !== 'all' && !row.allowedProductTypes.includes(item.productType)) {
          // Mark this specific misplaced item as a conflict
          if (!conflictIds.includes(item.id)) {
            conflictIds.push(item.id);
          }
        }
      }
    }
  }
  return conflictIds;
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
  isRulesEnabled, // Now respects the toggle state
}: ValidationPayload): DragValidation {
  const validRowIds = new Set<string>();
  const validStackTargetIds = new Set<string>();

  // If rules are disabled, every possible target is valid.
  if (!isRulesEnabled) {
    for (const rowId in refrigerator) {
      validRowIds.add(rowId);
      for (const stack of refrigerator[rowId].stacks) {
        if (stack[0] && stack[0].id !== activeDragId) {
          validStackTargetIds.add(stack[0].id);
        }
      }
    }
    return { validRowIds, validStackTargetIds };
  }
  
  // --- If rules ARE enabled, run the full logic ---
  const draggedItemWidth = draggedItem.width;
  const originLocation = findStackLocation(activeDragId);

  // 1. VALIDATION FOR RE-ORDERING / MOVING
  for (const rowId in refrigerator) {
    const row = refrigerator[rowId];
    
    const isRowAllowedByPlacement = row.allowedProductTypes === 'all' || row.allowedProductTypes.includes(draggedItem.productType);
    if (!isRowAllowedByPlacement) continue;

    if (draggedEntityHeight > row.maxHeight) continue;

    const currentWidth = row.stacks.reduce((sum, stack) => sum + (stack[0]?.width || 0), 0);
    const widthWithoutActiveItem = originLocation?.rowId === rowId ? currentWidth - draggedItemWidth : currentWidth;
    if (widthWithoutActiveItem + draggedItemWidth > row.capacity) continue;
    
    validRowIds.add(rowId);
  }

  // 2. VALIDATION FOR STACKING
  if (isSingleItemStackable) {
    for (const rowId in refrigerator) {
      const row = refrigerator[rowId];

      const isRowAllowedByPlacement = row.allowedProductTypes === 'all' || row.allowedProductTypes.includes(draggedItem.productType);
      if (!isRowAllowedByPlacement) continue;

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