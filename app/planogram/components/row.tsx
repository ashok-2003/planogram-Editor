    // app/planogram/_components/Row.tsx
    'use client';
    import { Row } from '@/lib/types';
    import { useDroppable } from '@dnd-kit/core';
    import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
    import { StackComponent } from './stack';
    import clsx from 'clsx';
    import { useMemo } from 'react';

    interface RowProps {
      row: Row;
    }

    export function RowComponent({ row }: RowProps) {
      const { setNodeRef, isOver } = useDroppable({
        id: row.id,
        data: { type: 'row' },
      });

      const currentWidth = row.stacks.reduce((acc, stack) => acc + (stack[0]?.width || 0), 0);
      const widthPercentage = (currentWidth / row.capacity) * 100;

      // useMemo ensures this array is stable unless the stacks change.
      const stackIds = useMemo(() => row.stacks.map(stack => stack[0]?.id).filter(Boolean), [row.stacks]);

      return (
        <div
          ref={setNodeRef}
          className={clsx(
            "bg-black/20 p-2 rounded-md border-2 border-gray-600 min-h-[120px] transition-colors",
            { 'bg-green-900/50 border-green-500': isOver }
          )}
        >
          <SortableContext items={stackIds} strategy={horizontalListSortingStrategy}>
            <div className="flex items-end h-full space-x-1">
              {row.stacks.map((stack, stackIndex) => {
                  if (stack.length === 0 || !stack[0]) return null;
                  return <StackComponent key={stack[0].id} id={stack[0].id} items={stack} />;
              })}
            </div>
          </SortableContext>
          <div className="w-full bg-gray-600 rounded-full h-1.5 mt-2">
            <div
              className="bg-green-500 h-1.5 rounded-full"
              style={{ width: `${widthPercentage}%` }}
            ></div>
          </div>
        </div>
      );
    }