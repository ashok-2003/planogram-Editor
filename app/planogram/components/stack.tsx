// app/planogram/_components/Stack.tsx
'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Item } from '@/lib/types';
import { ItemComponent } from './item';

interface StackProps {
  id: string; // The ID for the sortable context (e.g., the ID of the first item in the stack)
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
  } = useSortable({ id });

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
      {items.map(item => <ItemComponent key={item.id} item={item} />)}
    </div>
  );
}