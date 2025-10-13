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
        "p-2 rounded-lg relative transition-all duration-300 ease-out",
        {
          "bg-gray-700/50 border-2 border-transparent": !isDragging,
          "bg-gray-700/50 border-2 border-green-500/30": isValidRowTarget && !isOver,
          "bg-green-900/20 border-2 border-green-400 shadow-lg shadow-green-400/10": isValidRowTarget && isOver,
          "bg-gray-800/60 border-2 border-gray-600/30": isDisabled,
        }
      )}
      animate={{
        scale: isValidRowTarget && isOver ? 1.01 : 1,
      }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      whileHover={{
        scale: !isDragging ? 1.005 : undefined,
        transition: { duration: 0.2 }
      }}
    >
      <div className="absolute inset-0 opacity-10">
        <div 
          className="w-full h-full"
          style={{ 
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}
        />
      </div>

      {isDisabled && (
        <div className="absolute inset-0 bg-red-400/40 rounded-lg flex items-center justify-center">
          <div className="text-red-500 text-sm font-medium bg-gray-800/80 px-3 py-1 rounded-full z-10">
            Cannot drop here
          </div>
        </div>
      )}

      <SortableContext items={stackIds} strategy={horizontalListSortingStrategy}>
        {/* UPDATED: 'gap-px' for tighter spacing and dynamic min-height for realism */}
        <div className="flex gap-0 items-end h-full relative z-10" style={{ minHeight: `${row.maxHeight * 5}px`}}>
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