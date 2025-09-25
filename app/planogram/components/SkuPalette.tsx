    // app/planogram/_components/SkuPalette.tsx
    'use client';

    import { Sku } from '@/lib/types';
    import { useDraggable } from '@dnd-kit/core';

    interface SkuPaletteProps {
      skus: Sku[];
    }

    function DraggableSku({ sku }: { sku: Sku }) {
        const { attributes, listeners, setNodeRef } = useDraggable({
            id: sku.skuId,
            data: { type: 'sku', sku },
        });

        return (
            <div ref={setNodeRef} {...listeners} {...attributes} className="p-2 border rounded-md cursor-grab active:cursor-grabbing">
                <img src={sku.imageUrl} alt={sku.name} className="h-20 object-contain mx-auto pointer-events-none" />
                <p className="text-center text-sm mt-2 font-medium text-gray-700">{sku.name}</p>
            </div>
        )
    }

    export function SkuPalette({ skus }: SkuPaletteProps) {
      return (
        <aside className="p-4 bg-white rounded-lg shadow-md w-full md:w-48 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-800 border-b pb-2">Products</h2>
          <div className="mt-4 space-y-4">
            {skus.map((sku) => (
              <DraggableSku key={sku.skuId} sku={sku} />
            ))}
          </div>
        </aside>
      );
    }