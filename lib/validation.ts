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
  isRulesEnabled: boolean; // To respect the toggle for business rules only
}

/**
 * Iterates through a refrigerator layout to find all items that violate shelf rules.
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
  isRulesEnabled,
}: ValidationPayload): DragValidation {
  const validRowIds = new Set<string>();
  const validStackTargetIds = new Set<string>();

  const draggedItemWidth = draggedItem.width;
  const originLocation = findStackLocation(activeDragId);

  // --- 1. VALIDATION FOR RE-ORDERING / MOVING ---
  for (const rowId in refrigerator) {
    const row = refrigerator[rowId];
    
    // --- Business Rules Engine (UPDATED) ---

    // Rule 1: Placement Restriction (Business Rule)
    // This is now the ONLY rule affected by the toggle.
    if (isRulesEnabled) {
      const isRowAllowedByPlacement = row.allowedProductTypes === 'all' || row.allowedProductTypes.includes(draggedItem.productType);
      if (!isRowAllowedByPlacement) continue;
    }

    // Rule 2: Height Restriction (Physical Rule - ALWAYS ON)
    if (draggedEntityHeight > row.maxHeight) continue;

    // Rule 3: Width Restriction (Physical Rule - ALWAYS ON)
    const currentWidth = row.stacks.reduce((sum, stack) => sum + (stack[0]?.width || 0), 0);
    const widthWithoutActiveItem = originLocation?.rowId === rowId ? currentWidth - draggedItemWidth : currentWidth;
    if (widthWithoutActiveItem + draggedItemWidth > row.capacity) continue;
    
    // If all necessary physical (and optionally business) rules pass, the row is valid.
    validRowIds.add(rowId);
  }

  // --- 2. VALIDATION FOR STACKING ---
  if (isSingleItemStackable) {
    for (const rowId in refrigerator) {
      const row = refrigerator[rowId];

      // Rule 1: Placement Restriction (Business Rule)
      if (isRulesEnabled) {
        const isRowAllowedByPlacement = row.allowedProductTypes === 'all' || row.allowedProductTypes.includes(draggedItem.productType);
        if (!isRowAllowedByPlacement) continue;
      }

      // Rule 2: Height Restriction (Physical Rule - ALWAYS ON)
      if (draggedItem.height > row.maxHeight) continue;

      for (const stack of row.stacks) {
        if (!stack[0]) continue;
        const stackId = stack[0].id;
        if (stackId === activeDragId) continue;

        const targetStackHeight = stack.reduce((sum, item) => sum + item.height, 0);
        // Stacking height check is a physical rule and is ALWAYS ON.
        if (targetStackHeight + draggedItem.height <= row.maxHeight) {
          validStackTargetIds.add(stackId);
        }
      }
    }
  }

  return { validRowIds, validStackTargetIds };
}