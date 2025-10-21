'use client';
import React, { useMemo } from 'react';
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
  isParentRowValid: boolean;
  conflictIds: string[]; 
}

export const StackComponent = React.memo(function StackComponent({ 
  stack, 
  isStackHighlight, 
  dragValidation, 
  isParentRowValid, 
  conflictIds 
}: StackProps) {
  const firstItem = stack[0];
  if (!firstItem) return null;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: firstItem.id,
    data: { type: 'stack', items: stack },
  });

  const style = useMemo(() => ({
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 100 : 'auto',
  }), [transform, transition, isDragging]);

  const hasConflict = useMemo(
    () => stack.some(item => conflictIds.includes(item.id)),
    [stack, conflictIds]
  );
  
  const isDraggingGlobal = !!dragValidation;
  const isValidStackTarget = useMemo(
    () => isDraggingGlobal && dragValidation?.validStackTargetIds.has(firstItem.id),
    [isDraggingGlobal, dragValidation, firstItem.id]
  );

  // A stack is visually disabled if a drag is happening AND:
  // 1. Its parent row is invalid for re-ordering, AND
  // 2. It is NOT a valid target for stacking.
  const isVisuallyDisabled = useMemo(
    () => isDraggingGlobal && !isParentRowValid && !isValidStackTarget,
    [isDraggingGlobal, isParentRowValid, isValidStackTarget]
  );

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      layout="position"
      className={clsx(
        "flex flex-col-reverse items-center relative transition-all duration-300",
        { "opacity-40": isVisuallyDisabled && !isStackHighlight }
      )}
    >
      {/* Glow effect for stacking */}
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

      {/* Conflict Indicator */}
      <AnimatePresence>
        {hasConflict && !isDragging && (
          <motion.div
            className="absolute -inset-1.5 rounded-lg ring-2 ring-red-500 ring-offset-2 ring-offset-gray-800 pointer-events-none"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          />
        )}
      </AnimatePresence>

      <div className={clsx({ 'opacity-50': hasConflict && !isDragging })}>
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
          ))}        </AnimatePresence>
      </div>
    </motion.div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for optimal performance
  // Only re-render if relevant props changed
  return prevProps.stack.length === nextProps.stack.length &&
         prevProps.stack[0]?.id === nextProps.stack[0]?.id &&
         prevProps.isStackHighlight === nextProps.isStackHighlight &&
         prevProps.isParentRowValid === nextProps.isParentRowValid &&
         prevProps.dragValidation === nextProps.dragValidation &&
         prevProps.conflictIds === nextProps.conflictIds;
});