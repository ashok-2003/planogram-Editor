'use client';
import { Item as ItemType } from '@/lib/types';
import { ItemComponent } from './item';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
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
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ 
        scale: 1, 
        opacity: 1,
        rotateY: isDragging ? 5 : 0,
      }}
      whileHover={{ 
        scale: 1.02,
        rotateX: -2,
        transition: { duration: 0.2 }
      }}
      whileTap={{ 
        scale: 0.98,
        rotateX: 2,
        transition: { duration: 0.1 }
      }}
      className={clsx("flex flex-col-reverse items-center relative transition-all duration-300", {
        "outline outline-4 outline-offset-2 outline-blue-500 rounded-md z-10": isStackHighlight,
        "opacity-100": isValidStackTarget,
      })}
    >
      {/* Glow effect for valid drop targets */}
      <AnimatePresence>
        {isStackHighlight && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 bg-blue-400/20 rounded-lg blur-sm -z-10"
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>

      {/* Stack items with staggered animations */}
      <AnimatePresence mode="popLayout">
        {stack.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ y: 20, opacity: 0, scale: 0.9 }}
            animate={{ 
              y: 0, 
              opacity: 1, 
              scale: 1,
              transition: { delay: index * 0.05 }
            }}
            exit={{ 
              y: -20, 
              opacity: 0, 
              scale: 0.9,
              transition: { duration: 0.2 }
            }}
            whileHover={{ z: 10 }}
          >
            <ItemComponent item={item} />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}