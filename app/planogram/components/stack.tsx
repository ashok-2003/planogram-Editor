// app/planogram/_components/Stack.tsx
'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Item } from '@/lib/types';
import { ItemComponent } from './item';

interface StackProps {
  id: string; 
  items: Item[];
}

export function StackComponent({ id, items }: StackProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id,
    // Add metadata to identify this as a stack
    data: {
      type: 'stack',
      items: items
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex flex-col-reverse"
    >
      {/* Ensure each item is individually draggable but shares the stack's drag handle for sorting */}
      {items.map(item => <ItemComponent key={item.id} item={item} />)}
    </div>
  );
}