'use client';
import { Row as RowType } from '@/lib/types';
import { StackComponent } from './stack';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'framer-motion';
import { DropIndicator } from './planogramEditor';

interface RowProps {
  row: RowType;
  dropIndicator: DropIndicator;
}

export function RowComponent({ row, dropIndicator }: RowProps) {
  const { setNodeRef } = useDroppable({ id: row.id, data: { type: 'row', items: row.stacks } });
  
  const stackIds = row.stacks.map(stack => stack[0].id);

  const showGhost = dropIndicator?.type === 'reorder' && dropIndicator.targetRowId === row.id;

  return (
    <div ref={setNodeRef} className="bg-gray-700/50 p-2 rounded-lg border-2 border-gray-600 min-h-[150px]">
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
              <StackComponent key={stack[0].id} stack={stack} isStackTarget={dropIndicator?.type === 'stack' && dropIndicator.targetId === stack[0].id} />
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