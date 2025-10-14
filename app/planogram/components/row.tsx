'use client';
import { Row as RowType } from '@/lib/types';
import { StackComponent } from './stack';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'framer-motion';
import { DropIndicator, DragValidation } from './planogramEditor';
import clsx from 'clsx';

interface RowProps {
  row: RowType;
  dropIndicator: DropIndicator;
  dragValidation: DragValidation;
  conflictIds: string[];
}

export function RowComponent({ row, dropIndicator, dragValidation, conflictIds }: RowProps) {
  const { setNodeRef, isOver } = useDroppable({ id: row.id, data: { type: 'row', items: row.stacks } });
  
  const stackIds = row.stacks.map(stack => stack[0]?.id).filter(Boolean);
  const showGhost = dropIndicator?.type === 'reorder' && dropIndicator.targetRowId === row.id;

  const isDragging = !!dragValidation;
  const isValidRowTarget = isDragging && dragValidation.validRowIds.has(row.id);
  const hasValidStackTargets = isDragging && row.stacks.some(stack => dragValidation.validStackTargetIds.has(stack[0].id));
  const isDisabled = isDragging && !isValidRowTarget && !hasValidStackTargets;

  return (
    <motion.div 
      ref={setNodeRef}
      style={{ maxWidth: `${row.capacity}px`, width: '100%' }}
      className={clsx(
        "relative transition-all duration-300 ease-out w-full shadow-lg",
        "bg-gradient-to-b from-gray-300/10 via-gray-500/20 to-gray-500/20 border",
        {
          "border-gray-600": !isDragging,
          "ring-2 ring-offset-2 ring-offset-gray-900 ring-green-500": isValidRowTarget,
          "opacity-40": isDisabled,
        }
      )}
      animate={{
        scale: isValidRowTarget && isOver ? 1.01 : 1,
        boxShadow: isValidRowTarget && isOver ? "0 0 20px rgba(34, 197, 94, 0.4)" : "0 10px 15px -3px rgba(0,0,0,0.3)",
      }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <div className="absolute inset-0 opacity-[0.02] bg-[url(https://www.transparenttextures.com/patterns/subtle-carbon.png)]" />

      {isDisabled && (
        <div className="absolute inset-0 bg-red-800/40 rounded-lg flex items-center justify-center z-20">
          <div className="text-red-200 text-sm font-medium bg-red-900/80 px-3 py-1 rounded-full">
            Cannot drop here
          </div>
        </div>
      )}

      <SortableContext items={stackIds} strategy={horizontalListSortingStrategy}>
        {/* UPDATED: The minHeight is now set dynamically from the row's data for realism */}
        <div className="flex items-end gap-px h-full relative z-10" style={{ minHeight: `${row.maxHeight}px`}}>
          {row.stacks.map((stack, index) => (
            <div key={stack[0].id} className="relative">
              <AnimatePresence>
                {showGhost && dropIndicator.index === index && (
                  <motion.div
                    initial={{ scaleY: 0, opacity: 0 }}
                    animate={{ scaleY: 1, opacity: 1 }}
                    exit={{ scaleY: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="w-1 self-stretch bg-blue-400 rounded-full relative"
                  >
                    <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-blue-400 rounded-full" />
                  </motion.div>
                )}
              </AnimatePresence>
              
              <StackComponent 
                stack={stack}
                isStackHighlight={dropIndicator?.type === 'stack' && dropIndicator.targetId === stack[0].id}
                dragValidation={dragValidation}
                conflictIds={conflictIds}
                isParentRowValid={isValidRowTarget}
              />
            </div>
          ))}
          
          <AnimatePresence>
            {showGhost && dropIndicator.index === row.stacks.length && (
              <motion.div
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ scaleY: 1, opacity: 1 }}
                exit={{ scaleY: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="w-1 self-stretch bg-blue-400 rounded-full relative"
              >
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-blue-400 rounded-full" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </SortableContext>
    </motion.div>
  );
}