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

  // PERFORMANCE: Disable animations during drag
  const shouldAnimate = !isDraggingGlobal;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      layout={shouldAnimate ? "position" : false}
      className={clsx(
        "flex flex-col items-center justify-center relative transition-all duration-200",
        "rounded-lg", // Add rounded corners for border
        {
          "opacity-40": isVisuallyDisabled && !isStackHighlight,
          // Solid green border when highlighted for stacking
          "ring-4 ring-green-500 ring-offset-2 ring-offset-white bg-green-50/30": isStackHighlight,
          // Default state
          "ring-0": !isStackHighlight && !hasConflict,
        }
      )}
      animate={shouldAnimate ? {
        scale: isStackHighlight ? 1.05 : 1,
      } : undefined}
      transition={shouldAnimate ? { duration: 0.2, ease: "easeOut" } : { duration: 0 }}
    >      {/* Conflict Indicator - Red border for conflicts */}
      {/* PERFORMANCE: Disable AnimatePresence during drag */}
      {shouldAnimate ? (
        <AnimatePresence>
          {hasConflict && !isDragging && !isStackHighlight && (
            <motion.div
              className="absolute -inset-1 rounded-lg ring-4 ring-red-500 ring-offset-2 ring-offset-white pointer-events-none z-10"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            />
          )}
        </AnimatePresence>
      ) : (
        hasConflict && !isDragging && !isStackHighlight && (
          <div className="absolute -inset-1 rounded-lg ring-4 ring-red-500 ring-offset-2 ring-offset-white pointer-events-none z-10" />
        )
      )}

      {/* Stack highlight indicator - appears when can drop */}
      {/* PERFORMANCE: Disable AnimatePresence during drag */}
      {shouldAnimate ? (
        <AnimatePresence>
          {isStackHighlight && (
            <motion.div
              className="absolute -inset-2 rounded-lg bg-green-500/10 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            />
          )}
        </AnimatePresence>
      ) : (
        isStackHighlight && (
          <div className="absolute -inset-2 rounded-lg bg-green-500/10 pointer-events-none" />
        )
      )}

      <div className={clsx(
        "relative",
        { 'opacity-50': hasConflict && !isDragging }
      )}>
        {/* PERFORMANCE: Disable AnimatePresence during drag */}
        {shouldAnimate ? (
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
                <ItemComponent item={item} isDragging={isDraggingGlobal} />
              </motion.div>
            ))}
          </AnimatePresence>
        ) : (
          stack.map((item) => (
            <div key={item.id}>
              <ItemComponent item={item} isDragging={isDraggingGlobal} />
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for optimal performance
  return prevProps.stack.length === nextProps.stack.length &&
         prevProps.stack[0]?.id === nextProps.stack[0]?.id &&
         prevProps.isStackHighlight === nextProps.isStackHighlight &&
         prevProps.isParentRowValid === nextProps.isParentRowValid &&
         prevProps.dragValidation === nextProps.dragValidation &&
         prevProps.conflictIds === nextProps.conflictIds;
});