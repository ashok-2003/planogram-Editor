'use client';

import { useEffect, useState } from 'react';
import { usePlanogramStore } from '@/lib/store';
import { Sku, Refrigerator, Item } from '@/lib/types';
import { SkuPalette } from './SkuPalette';
import { RefrigeratorComponent } from './Refrigerator';
import { InfoPanel } from './InfoPanel';
import { DndContext, DragEndEvent, DragStartEvent, DragOverEvent, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { ItemComponent } from './item';
import { StatePreview } from './statePreview';

export type DropIndicator = {
  targetId: string;
  type: 'reorder' | 'stack' | 'row';
  targetRowId?: string;
  index?: number;
} | null;

// --- FIX START ---
// The DragValidation type now includes validStackTargetIds
export type DragValidation = {
  validRowIds: Set<string>;
  validStackTargetIds: Set<string>;
} | null;
// --- FIX END ---

interface PlanogramEditorProps {
  initialSkus: Sku[];
  initialLayout: Refrigerator;
}

export function PlanogramEditor({ initialSkus, initialLayout }: PlanogramEditorProps) {
  const { refrigerator, actions, findStackLocation } = usePlanogramStore();
  const [activeItem, setActiveItem] = useState<Item | Sku | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicator>(null);
  const [dragValidation, setDragValidation] = useState<DragValidation>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => {
    usePlanogramStore.setState({ refrigerator: initialLayout });
  }, [initialLayout]);

  function handleDragStart(event: DragStartEvent) {
    actions.selectItem(null);
    const { active } = event;
    const activeData = active.data.current;
    
    let draggedItem: Item | Sku | null = null;
    let isDraggedItemStackable = false;

    if (activeData?.type === 'sku') {
      draggedItem = activeData.sku;
      isDraggedItemStackable = draggedItem.constraints.stackable;
      setActiveItem(draggedItem);
    } else if (activeData?.type === 'stack' && activeData.items.length > 0) {
      draggedItem = activeData.items[0];
      isDraggedItemStackable = activeData.items.length === 1 && draggedItem.constraints.stackable;
      setActiveItem(draggedItem);
    }

    if (draggedItem) {
      const validRowIds = new Set<string>();
      // --- FIX START ---
      // We now calculate and store the valid stack targets here
      const validStackTargetIds = new Set<string>();
      const draggedItemWidth = draggedItem.width;
      const draggedItemHeight = draggedItem.height;
      const originLocation = activeData?.type === 'stack' ? findStackLocation(active.id as string) : null;

      for (const rowId in refrigerator) {
        const row = refrigerator[rowId];
        const currentWidth = row.stacks.reduce((sum, stack) => sum + (stack[0]?.width || 0), 0);
        
        const widthWithoutActiveItem = originLocation?.rowId === rowId ? currentWidth - draggedItemWidth : currentWidth;
        if (widthWithoutActiveItem + draggedItemWidth <= row.capacity) {
          validRowIds.add(rowId);
        }

        if (isDraggedItemStackable) {
          for (const stack of row.stacks) {
            const stackId = stack[0].id;
            if (stackId === active.id) continue;

            const stackHeight = stack.reduce((sum, item) => sum + item.height, 0);
            if (stackHeight + draggedItemHeight <= row.maxHeight) {
              validStackTargetIds.add(stackId);
            }
          }
        }
      }
      // Update the state with both sets of IDs
      setDragValidation({ validRowIds, validStackTargetIds });
      // --- FIX END ---
    }
  }
  
  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) { setDropIndicator(null); return; }

    const activeId = active.id as string;
    const overId = over.id as string;
    const activeType = active.data.current?.type;
    const overType = over.data.current?.type;
    
    const isStackingAttempt = activeType === 'stack' && overType === 'stack' && activeId !== overId;
    if (isStackingAttempt) {
      const draggedStack = active.data.current?.items;
      const isSingleItemStack = draggedStack?.length === 1 && draggedStack[0].constraints.stackable;
      if (isSingleItemStack) {
        setDropIndicator({ type: 'stack', targetId: overId });
        return;
      }
    }

    let overRowId: string | undefined;
    let stackIndex: number | undefined;
    
    if (overType === 'row') {
      overRowId = overId;
      stackIndex = over.data.current?.items?.length || 0;
    } else if (overType === 'stack') {
      const location = findStackLocation(overId);
      if (location) {
        overRowId = location.rowId;
        stackIndex = location.stackIndex;
      }
    }
    
    if (overRowId && stackIndex !== undefined) {
      setDropIndicator({ type: 'reorder', targetId: activeId, targetRowId: overRowId, index: stackIndex });
    } else {
      setDropIndicator(null);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveItem(null);
    setDropIndicator(null);
    setDragValidation(null);

    if (!over || !dropIndicator) return;
    
    if (dragValidation && dropIndicator.targetRowId && !dragValidation.validRowIds.has(dropIndicator.targetRowId)) {
        return; 
    }
    
    const activeId = active.id as string;
    const activeType = active.data.current?.type;

    if (dropIndicator.type === 'stack') {
      actions.stackItem(activeId, dropIndicator.targetId);
      return;
    }
    
    if (dropIndicator.type === 'reorder' && dropIndicator.targetRowId) {
      if (activeType === 'sku') {
        actions.addItemFromSku(active.data.current.sku, dropIndicator.targetRowId, dropIndicator.index);
      } else if (activeType === 'stack') {
        const startLocation = findStackLocation(activeId);
        if (!startLocation) return;
        
        if (startLocation.rowId === dropIndicator.targetRowId) {
          actions.reorderStack(startLocation.rowId, startLocation.stackIndex, dropIndicator.index);
        } else {
          actions.moveItem(activeId, dropIndicator.targetRowId, dropIndicator.index);
        }
      }
    }
  }

  return (
    <DndContext onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd} sensors={sensors}>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_350px] gap-8">
        <div className="flex flex-col md:flex-row gap-8">
          <SkuPalette skus={initialSkus} />
          <RefrigeratorComponent dragValidation={dragValidation} dropIndicator={dropIndicator} />
        </div>
        <div>
          <InfoPanel />
          <StatePreview />
        </div>
      </div>
      <DragOverlay>
        {activeItem ? <ItemComponent item={activeItem as Item} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
