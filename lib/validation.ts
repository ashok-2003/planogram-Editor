import { Item, Refrigerator, Sku, MultiDoorRefrigerator } from './types';
import { DragValidation } from '@/app/planogram/components/planogramEditor';

// This payload contains all the necessary information to run our validation checks.
interface ValidationPayload {
  draggedItem: Item | Sku;
  draggedEntityHeight: number;
  isSingleItemStackable: boolean;
  activeDragId: string;
  refrigerators: MultiDoorRefrigerator;
  doorId: string; // Which door context to validate in
  findStackLocation: (itemId: string) => { doorId: string; rowId: string; stackIndex: number; itemIndex: number } | null;
  isRulesEnabled: boolean; // To respect the toggle for business rules only
}

/**
 * Iterates through a multi-door refrigerator layout to find all items that violate shelf rules.
 * Checks all doors and aggregates conflicts across the entire refrigerator.
 * @param refrigerators The current state of all refrigerator doors.
 * @returns An array of item IDs that are in conflict with the rules.
 */
export function findConflicts(refrigerators: MultiDoorRefrigerator): string[] {
  const conflictIds: string[] = [];

  // Iterate through all doors
  for (const doorId in refrigerators) {
    const refrigerator = refrigerators[doorId];
    
    for (const rowId in refrigerator) {
      const row = refrigerator[rowId];
      for (const stack of row.stacks) {
        const stackHeight = stack.reduce((sum, item) => sum + item.height, 0);
        if (stackHeight > row.maxHeight) {
          stack.forEach(item => conflictIds.push(item.id));
        }

        for (const item of stack) {
          // A "BLANK" item can never be in conflict with placement rules.
          if (item.productType === 'BLANK') continue;
          
          if (row.allowedProductTypes !== 'all' && !row.allowedProductTypes.includes(item.productType)) {
            if (!conflictIds.includes(item.id)) {
              conflictIds.push(item.id);
            }
          }
        }
      }
    }
  }
  
  return conflictIds;
}

/**
 * Iterates through a multi-door refrigerator layout to find all items that violate dimensional constraints.
 * This includes:
 * 1. Stack height exceeding shelf max height
 * 2. Items overflowing the shelf/refrigerator width capacity
 * Checks all doors and aggregates conflicts across the entire refrigerator.
 * @param refrigerators The current state of all refrigerator doors.
 * @returns An array of item IDs that are in conflict with dimensional rules.
 */
export function findDimensionConflicts(refrigerators: MultiDoorRefrigerator): string[] {
  const conflictIds: string[] = [];

  // Iterate through all doors
  for (const doorId in refrigerators) {
    const refrigerator = refrigerators[doorId];
    
    for (const rowId in refrigerator) {
      const row = refrigerator[rowId];
      
      // Check 1: Height violations (stack too tall)
      for (const stack of row.stacks) {
        const stackHeight = stack.reduce((sum, item) => sum + item.height, 0);
        if (stackHeight > row.maxHeight) {
          stack.forEach(item => {
            if (!conflictIds.includes(item.id)) {
              conflictIds.push(item.id);
            }
          });
        }
      }
        // Check 2: Width overflow (items exceed shelf capacity)
      const getStackWidth = (stack: Item[]) => 
        stack.length === 0 ? 0 : Math.max(...stack.map(item => item.width));
      
      const totalWidth = row.stacks.reduce((sum, stack) => sum + getStackWidth(stack), 0);
      const gapWidth = Math.max(0, row.stacks.length - 1); // 1px gap between stacks
      const totalWidthWithGaps = totalWidth + gapWidth;
      
      // If total width exceeds capacity, mark items as conflicts (rightmost items)
      if (totalWidthWithGaps > row.capacity) {
        // Calculate width from left to right to find where overflow starts
        let accumulatedWidth = 0;
        const overflowAmount = totalWidthWithGaps - row.capacity;
        
        for (let i = 0; i < row.stacks.length; i++) {
          const stackWidth = getStackWidth(row.stacks[i]);
          const nextAccumulatedWidth = accumulatedWidth + stackWidth + (i > 0 ? 1 : 0); // Add gap if not first stack
          
          // Check if adding this stack would cause us to exceed the "acceptable" width
          // The acceptable width is capacity, so anything beyond that is overflow
          const widthAfterThisStack = accumulatedWidth + stackWidth + (i > 0 ? 1 : 0);
          const widthBeforeThisStack = accumulatedWidth;
          
          // If we're in the overflow region (beyond what fits in capacity)
          if (widthAfterThisStack > row.capacity) {
            // Mark all items in this stack as conflicting
            row.stacks[i].forEach(item => {
              if (!conflictIds.includes(item.id)) {
                conflictIds.push(item.id);
              }
            });
          }
          
          accumulatedWidth = nextAccumulatedWidth;
        }
      }
    }
  }
  
  return conflictIds;
}

/**
 * A centralized function to run all business logic checks when a drag starts.
 * It determines which rows and stacks are valid drop targets based on a set of rules.
 * Validates within the context of a specific door.
 * @returns A DragValidation object with sets of valid row and stack IDs.
 */
export function runValidation({
  draggedItem,
  draggedEntityHeight,
  isSingleItemStackable,
  activeDragId,
  refrigerators,
  doorId,
  findStackLocation,
  isRulesEnabled,
}: ValidationPayload): DragValidation {
  const validRowIds = new Set<string>();
  const validStackTargetIds = new Set<string>();

  const draggedItemWidth = draggedItem.width;
  const originLocation = findStackLocation(activeDragId);
  
  // Get the refrigerator for the specified door
  const refrigerator = refrigerators[doorId];
  if (!refrigerator) {
    return { validRowIds, validStackTargetIds };
  }

  // --- 1. VALIDATION FOR RE-ORDERING / MOVING ---
  for (const rowId in refrigerator) {
    const row = refrigerator[rowId];
    
    if (isRulesEnabled) {
      // UPDATED RULE: A 'BLANK' product type is always allowed.
      const isRowAllowedByPlacement = row.allowedProductTypes === 'all' 
        || draggedItem.productType === 'BLANK' 
        || row.allowedProductTypes.includes(draggedItem.productType);
        
      if (!isRowAllowedByPlacement) continue;
    }    if (draggedEntityHeight > row.maxHeight) continue;

    // Calculate current width usage (use widest item in each stack)
    const getStackWidth = (stack: Item[]) => stack.length === 0 ? 0 : Math.max(...stack.map(item => item.width));
    const currentWidth = row.stacks.reduce((sum, stack) => sum + getStackWidth(stack), 0);
    
    // Account for gaps between stacks (gap-px = 1px per gap)
    const currentGapWidth = Math.max(0, row.stacks.length - 1);
    
    // If moving from same row, don't count the dragged item and adjust gap count
    const widthWithoutActiveItem = originLocation?.rowId === rowId 
      ? currentWidth - draggedItemWidth 
      : currentWidth;
    
    const gapWidthAfterMove = originLocation?.rowId === rowId 
      ? currentGapWidth // Same number of stacks (moving within row)
      : currentGapWidth + 1; // One more stack (moving from different row)
    
    // Check if there's enough capacity
    const totalWidthNeeded = widthWithoutActiveItem + draggedItemWidth + gapWidthAfterMove;
    if (totalWidthNeeded > row.capacity) continue;
    
    validRowIds.add(rowId);
  }

  // --- 2. VALIDATION FOR STACKING ---
  if (isSingleItemStackable) {
    for (const rowId in refrigerator) {
      const row = refrigerator[rowId];

      if (isRulesEnabled) {
        // UPDATED RULE: A 'BLANK' product type is always allowed.
        const isRowAllowedByPlacement = row.allowedProductTypes === 'all' 
          || draggedItem.productType === 'BLANK'
          || row.allowedProductTypes.includes(draggedItem.productType);

        if (!isRowAllowedByPlacement) continue;
      }

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