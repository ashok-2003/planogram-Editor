    // app/planogram/_components/PlanogramEditor.tsx
    'use client';

    import { useEffect, useState } from 'react';
    import { usePlanogramStore } from '@/lib/store';
    import { Sku, Refrigerator, Item } from '@/lib/types';
    import { SkuPalette } from './SkuPalette';
    import { RefrigeratorComponent } from './Refrigerator';
    import { InfoPanel } from './InfoPanel';
    import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, closestCenter } from '@dnd-kit/core';
    import { ItemComponent } from './item';

    interface PlanogramEditorProps {
      initialSkus: Sku[];
      initialLayout: Refrigerator;
    }

    export function PlanogramEditor({ initialSkus, initialLayout }: PlanogramEditorProps) {
      const { actions } = usePlanogramStore();
      const [activeItem, setActiveItem] = useState<Item | Sku | null>(null);

      useEffect(() => {
        usePlanogramStore.setState({ refrigerator: initialLayout });
      }, [initialLayout]);

      function handleDragStart(event: DragStartEvent) {
          const { active } = event;
          if (active.data.current?.type === 'sku') {
              setActiveItem(active.data.current.sku);
          } else if (active.data.current?.type === 'item') {
              setActiveItem(active.data.current.item);
          }
      }

      function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        setActiveItem(null);

        if (!over) return;

        const activeType = active.data.current?.type;
        const overType = over.data.current?.type;
        
        // Case 1: Reordering a stack within a row
        if (activeType === 'item' && overType === 'item' && active.id !== over.id) {
            const refrigerator = usePlanogramStore.getState().refrigerator;
            const activeRow = Object.values(refrigerator).find(r => r.stacks.flat().some(i => i.id === active.id));
            const overRow = Object.values(refrigerator).find(r => r.stacks.flat().some(i => i.id === over.id));
            
            if (activeRow && overRow && activeRow.id === overRow.id) {
                const oldIndex = activeRow.stacks.findIndex(s => s[0].id === active.id);
                const newIndex = overRow.stacks.findIndex(s => s[0].id === over.id);
                actions.reorderStack(activeRow.id, oldIndex, newIndex);
                return;
            }
        }
        
        // Case 2: Dropping an SKU or an Item onto a row
        if (overType === 'row') {
            if (activeType === 'sku') {
                actions.addItemFromSku(active.data.current?.sku, over.id as string);
            } else if (activeType === 'item') {
                actions.moveItem(active.id as string, over.id as string);
            }
        }
      }

      return (
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_350px] gap-8">
            <div className="flex flex-col md:flex-row gap-8">
              <SkuPalette skus={initialSkus} />
              <RefrigeratorComponent />
            </div>
            <InfoPanel />
          </div>
          <DragOverlay>
            {activeItem ? <ItemComponent item={activeItem as Item} /> : null}
          </DragOverlay>
        </DndContext>
      );
    }