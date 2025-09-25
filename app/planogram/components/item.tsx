// app/planogram/_components/Item.tsx
'use client';
import { usePlanogramStore } from '@/lib/store';
import { Item } from '@/lib/types';
import clsx from 'clsx';

// NOTE: This component is no longer draggable on its own.
// The parent StackComponent handles dragging.

interface ItemProps {
  item: Item;
}

export function ItemComponent({ item }: ItemProps) {
  const selectedItemId = usePlanogramStore((state) => state.selectedItemId);
  const selectItem = usePlanogramStore((state) => state.actions.selectItem);
  
  const isSelected = selectedItemId === item.id;

  const handleSelect = () => {
    // If the item is already selected, pass null to deselect. Otherwise, select it.
    selectItem(isSelected ? null : item.id);
  };

  return (
    // The div is now just a visual container with a click handler
    <div
      onClick={handleSelect}
      style={{ width: `${item.width}px`, height: `${item.height * 5}px` }}
      className={clsx(
        'flex items-center justify-center cursor-pointer transition-all duration-150', // The cursor is now 'pointer'
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