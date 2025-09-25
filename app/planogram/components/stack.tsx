'use client';
import { Item } from '@/lib/types';
import { ItemComponent } from './item';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';

interface StackProps {
  stack: Item[];
  isStackTarget: boolean;
}

export function StackComponent({ stack, isStackTarget }: StackProps) {
  const firstItem = stack[0];
  if (!firstItem) return null;

  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: firstItem.id,
    data: {
      type: 'stack',
      items: stack,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={clsx(
        'relative flex flex-col-reverse items-center transition-all duration-200',
        { 'ring-4 ring-offset-2 ring-offset-gray-800 ring-green-500 rounded-lg p-1': isStackTarget }
      )}
    >
      {stack.map((item) => (
        <ItemComponent key={item.id} item={item} />
      ))}
    </div>
  );
}