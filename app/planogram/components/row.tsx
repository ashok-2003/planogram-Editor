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
}

export function RowComponent({ row, dropIndicator, dragValidation }: RowProps) {
  const { setNodeRef } = useDroppable({ id: row.id, data: { type: 'row', items: row.stacks } });
  
  const stackIds = row.stacks.map(stack => stack[0].id);
  const showGhost = dropIndicator?.type === 'reorder' && dropIndicator.targetRowId === row.id;

  const isDragging = !!dragValidation;
  const isValidRowTarget = isDragging && dragValidation.validRowIds.has(row.id);
  // A row might be invalid overall, but still contain valid stack targets.
  const hasValidStackTargets = isDragging && row.stacks.some(stack => dragValidation.validStackTargetIds.has(stack[0].id));
  const isVisuallyDisabled = isDragging && !isValidRowTarget && !hasValidStackTargets;

  return (
    <div 
      ref={setNodeRef} 
      className={clsx(
        "bg-gray-700/50 p-2 rounded-lg border-2 border-transparent min-h-[150px] transition-all duration-300",
        {
          "border-green-500 shadow-lg shadow-green-500/20": isValidRowTarget,
          "opacity-40 bg-gray-800/60": isVisuallyDisabled,
        }
      )}
    >
      <SortableContext items={stackIds} strategy={horizontalListSortingStrategy}>
        <div className="flex items-end gap-1 h-full">
          {row.stacks.map((stack, index) => (
            <>
              <AnimatePresence>
                {showGhost && dropIndicator.index === index && (
                  <motion.div
                    layout
                    initial={{ scaleY: 0, opacity: 0 }}
                    animate={{ scaleY: 1, opacity: 1 }}
                    exit={{ scaleY: 0, opacity: 0 }}
                    className="w-1 self-stretch bg-blue-500 rounded-full"
                  />
                )}
              </AnimatePresence>
              <StackComponent 
                key={stack[0].id} 
                stack={stack}
                isStackHighlight={dropIndicator?.type === 'stack' && dropIndicator.targetId === stack[0].id}
                dragValidation={dragValidation}
              />
            </>
          ))}
          <AnimatePresence>
              {showGhost && dropIndicator.index === row.stacks.length && (
                <motion.div
                  layout
                  initial={{ scaleY: 0, opacity: 0 }}
                  animate={{ scaleY: 1, opacity: 1 }}
                  exit={{ scaleY: 0, opacity: 0 }}
                  className="w-1 self-stretch bg-blue-500 rounded-full"
                />
              )}
          </AnimatePresence>
        </div>
      </SortableContext>
    </div>
  );
}