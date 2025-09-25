// app/planogram/_components/PlanogramEditor.tsx
'use client';

import { useEffect, useState } from 'react';
import { usePlanogramStore } from '@/lib/store';
import { Sku, Refrigerator, Item } from '@/lib/types';
import { SkuPalette } from './SkuPalette';
import { RefrigeratorComponent } from './Refrigerator';
import { InfoPanel } from './InfoPanel';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { ItemComponent } from './item';

interface PlanogramEditorProps {
  initialSkus: Sku[];
  initialLayout: Refrigerator;
}

export function PlanogramEditor({ initialSkus, initialLayout }: PlanogramEditorProps) {
  const { actions, findStackLocation } = usePlanogramStore();
  const [activeItem, setActiveItem] = useState<Item | Sku | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    usePlanogramStore.setState({ refrigerator: initialLayout });
  }, [initialLayout]);

  function handleDragStart(event: DragStartEvent) {
      const { active } = event;
      actions.selectItem(null); // Deselect any item when a drag starts
      const activeData = active.data.current;
      
      if (activeData?.type === 'sku') {
          setActiveItem(activeData.sku);
      } else if (activeData?.type === 'stack') {
          // When dragging a stack, show its first item in the overlay
          setActiveItem(activeData.items[0]);
      }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveItem(null);

    if (!over || active.id === over.id) {
        return;
    }
    
    const activeType = active.data.current?.type;
    const overType = over.data.current?.type;
    
    const activeId = active.id as string;
    const overId = over.id as string;

    // --- Scenario 1: Add a new SKU from the palette ---
    if (activeType === 'sku') {
        const overIsRow = overType === 'row';
        const overIsStack = overType === 'stack';
        let targetRowId: string | null = null;
        
        if (overIsRow) {
            targetRowId = overId;
        } else if (overIsStack) {
            const location = findStackLocation(overId);
            targetRowId = location?.rowId ?? null;
        }

        if (targetRowId) {
            actions.addItemFromSku(active.data.current.sku, targetRowId);
        }
        return;
    }

    // --- Scenario 2: Handle dragging an existing stack ---
    if (activeType === 'stack') {
        const activeLocation = findStackLocation(activeId);
        const overIsRow = overType === 'row';
        const overIsStack = overType === 'stack';

        if (!activeLocation) return;
        
        // --- Sub-case A: Reordering stacks within the same row ---
        if (overIsStack) {
            const overLocation = findStackLocation(overId);
            if (overLocation && activeLocation.rowId === overLocation.rowId) {
                if (activeLocation.stackIndex !== overLocation.stackIndex) {
                    actions.reorderStack(activeLocation.rowId, activeLocation.stackIndex, overLocation.stackIndex);
                }
                return;
            }
        }
        
        // --- Sub-case B: Moving a stack to a different row ---
        let targetRowId: string | null = null;
        let newIndex: number | undefined = undefined;

        if (overIsRow) {
            targetRowId = overId;
        } else if (overIsStack) {
            const overLocation = findStackLocation(overId);
            if (overLocation && activeLocation.rowId !== overLocation.rowId) {
                targetRowId = overLocation.rowId;
                newIndex = overLocation.stackIndex;
            }
        }
        
        if (targetRowId) {
            const itemToMove = active.data.current?.items[0] as Item;
            const canMove = itemToMove.constraints.movableRows === 'all' || itemToMove.constraints.movableRows.includes(targetRowId);

            if (canMove) {
                actions.moveItem(activeId, targetRowId, newIndex);
            } else {
                console.log(`ACTION BLOCKED: This item cannot be moved to row ${targetRowId}`);
            }
        }
    }
  }

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={closestCenter} sensors={sensors}>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_350px] gap-8">
        <div className="flex flex-col md:flex-row gap-8">
          <SkuPalette skus={initialSkus} />
          <RefrigeratorComponent />
        </div>
        <InfoPanel />
      </div>
      <DragOverlay>
        {/* For the overlay, we need to render an ItemComponent, so we cast */}
        {activeItem ? <ItemComponent item={activeItem as Item} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
