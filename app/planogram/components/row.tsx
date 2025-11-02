'use client';
import React, { useMemo } from 'react';
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

export const RowComponent = React.memo(function RowComponent({ 
  row, 
  dropIndicator, 
  dragValidation, 
  conflictIds 
}: RowProps) {
  const { setNodeRef, isOver } = useDroppable({ 
    id: row.id, 
    data: { type: 'row', items: row.stacks } 
  });
  
  const stackIds = useMemo(
    () => row.stacks.map(stack => stack[0]?.id).filter(Boolean),
    [row.stacks]
  );
  
  const showGhost = useMemo(
    () => dropIndicator?.type === 'reorder' && dropIndicator.targetRowId === row.id,
    [dropIndicator, row.id]
  );

  const isDragging = !!dragValidation;
  const isValidRowTarget = useMemo(
    () => isDragging && dragValidation?.validRowIds.has(row.id),
    [isDragging, dragValidation, row.id]
  );
  
  const hasValidStackTargets = useMemo(
    () => isDragging && row.stacks.some(stack => dragValidation?.validStackTargetIds.has(stack[0].id)),
    [isDragging, row.stacks, dragValidation]
  );
  
  const isDisabled = useMemo(
    () => isDragging && !isValidRowTarget && !hasValidStackTargets,
    [isDragging, isValidRowTarget, hasValidStackTargets]
  );

  return (
    <motion.div 
      ref={setNodeRef}
      // NO max-width here - row takes 100% of parent's EXACT width
      className={clsx(
        "relative transition-all duration-300 ease-out w-full",
        "bg-gradient-to-b from-white/80 via-slate-50/60 to-slate-100/80",
        "border-b-[6px] border-gray-700/60", // Thicker border from 3px to 6px
        {
          "ring-2 ring-green-400 ring-inset": isValidRowTarget && isOver,
          "opacity-40": isDisabled,
        }
      )}
      style={{ 
        height: `${row.maxHeight}px`, // EXACT height from row data
      }}
      animate={{
        backgroundColor: isValidRowTarget && isOver 
          ? "rgba(34, 197, 94, 0.05)" 
          : undefined,
      }}
      transition={{ duration: 0.2 }}
    >
      {/* Shelf texture */}
      <div className="absolute inset-0 opacity-[0.03] bg-[url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLXdpZHRoPSIwLjUiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=)] pointer-events-none" />

      {/* Disabled overlay */}
      {isDisabled && (
        <div className="absolute inset-0 bg-red-500/10 backdrop-blur-[1px] flex items-center justify-center z-20">
          <div className="text-red-700 text-xs font-semibold bg-red-50 px-3 py-1.5 rounded-md shadow-sm border border-red-200">
            ⚠️ Cannot drop here
          </div>
        </div>
      )}

      <SortableContext items={stackIds} strategy={horizontalListSortingStrategy}>
        {/* Content area - items align to bottom, exact height */}
        <div 
          className="flex items-end gap-px relative z-10 h-full px-1"
        >
          {row.stacks.map((stack, index) => (
            <div key={stack[0].id} className="relative flex items-end h-full">
              {/* Drop indicator before stack */}
              <AnimatePresence>
                {showGhost && dropIndicator?.index === index && (
                  <motion.div
                    initial={{ scaleY: 0, opacity: 0 }}
                    animate={{ scaleY: 1, opacity: 1 }}
                    exit={{ scaleY: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }} // Back to original timing
                    className="w-1 h-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-full shadow-lg mx-0.5"
                  >
                    <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-500 rounded-full shadow-md" />
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
          
          {/* Drop indicator at end */}
          <AnimatePresence>
            {showGhost && dropIndicator?.index === row.stacks.length && (
              <motion.div
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ scaleY: 1, opacity: 1 }}
                exit={{ scaleY: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }} // Back to original timing
                className="w-1 h-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-full shadow-lg mx-0.5"
              >
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-500 rounded-full shadow-md" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </SortableContext>
    </motion.div>
  );
}, (prevProps, nextProps) => {
  // Optimized comparison for performance
  return prevProps.row.id === nextProps.row.id &&
         prevProps.row.stacks.length === nextProps.row.stacks.length &&
         prevProps.dropIndicator === nextProps.dropIndicator &&
         prevProps.dragValidation === nextProps.dragValidation &&
         prevProps.conflictIds === nextProps.conflictIds;
});