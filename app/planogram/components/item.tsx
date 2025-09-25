    // app/planogram/_components/Item.tsx
    'use client';
    import { usePlanogramStore } from '@/lib/store';
    import { Item } from '@/lib/types';
    import clsx from 'clsx';
    import { useDraggable } from '@dnd-kit/core';

    interface ItemProps {
      item: Item;
    }

    export function ItemComponent({ item }: ItemProps) {
      const { attributes, listeners, setNodeRef } = useDraggable({
        id: item.id,
        data: { type: 'item', item },
      });

      const selectedItemId = usePlanogramStore((state) => state.selectedItemId);
      const selectItem = usePlanogramStore((state) => state.actions.selectItem);
      
      const isSelected = selectedItemId === item.id;

      return (
        <div
          ref={setNodeRef}
          {...listeners}
          {...attributes}
          onClick={() => selectItem(item.id)}
          style={{ width: `${item.width}px`, height: `${item.height * 5}px` }}
          className={clsx(
            'flex items-center justify-center cursor-grab active:cursor-grabbing transition-all duration-150',
            {
              'ring-4 ring-blue-500 ring-offset-2 ring-offset-gray-800 rounded-md': isSelected,
              'opacity-75 hover:opacity-100': !isSelected,
            }
          )}
        >
          <img 
            src={item.imageUrl} 
            alt={item.name} 
            className="object-contain w-full h-full pointer-events-none"
            onDragStart={(e) => e.preventDefault()}
          />
        </div>
      );
    }