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
        <div ref={setNodeRef} {...listeners} {...attributes} className="p-2 border rounded-md cursor-grab active:cursor-grabbing bg-white hover:bg-gray-50">
            <img src={sku.imageUrl} alt={sku.name} className="h-20 object-contain mx-auto pointer-events-none" />
            <p className="text-center text-xs mt-2 font-medium text-gray-700">{sku.name}</p>
        </div>
    )
}

export function SkuPalette({ skus }: SkuPaletteProps) {
  return (
    <aside className=" max-h-screen overflow-auto-y-auto p-4 bg-gray-100 rounded-lg shadow-md w-full md:w-56 flex-shrink-0 flex flex-col">
      <h2 className="text-lg font-bold text-gray-800 border-b pb-2">Products</h2>
      {/* This div is now scrollable */}
      <div className="mt-4 space-y-4 flex-grow overflow-y-auto pr-2">
        {skus.map((sku) => (
          <DraggableSku key={sku.skuId} sku={sku} />
        ))}
      </div>
    </aside>
  );
}