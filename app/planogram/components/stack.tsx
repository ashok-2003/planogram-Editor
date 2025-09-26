'use client';
import { Item as ItemType } from '@/lib/types';
import { ItemComponent } from './item';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { DragValidation } from './planogramEditor';

interface StackProps {
  stack: ItemType[];
  isStackHighlight: boolean;
  dragValidation: DragValidation;
}

export function StackComponent({ stack, isStackHighlight, dragValidation }: StackProps) {
  const firstItem = stack[0];
  if (!firstItem) return null;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: firstItem.id,
    data: { type: 'stack', items: stack },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 100 : 'auto',
  };

  const isValidStackTarget = dragValidation?.validStackTargetIds.has(firstItem.id);

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      layout="position"
      className={clsx("flex flex-col-reverse items-center relative transition-all duration-200", {
        "outline outline-4 outline-offset-2 outline-blue-500 rounded-md z-10": isStackHighlight,
        "opacity-100": isValidStackTarget, // Ensure it's visible even if row is greyed out
      })}
    >
      {stack.map((item) => (
        <ItemComponent key={item.id} item={item} />
      ))}
    </motion.div>
  );
}