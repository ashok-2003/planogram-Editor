'use client';
import React, { useCallback, useMemo } from 'react';
import { usePlanogramStore } from '@/lib/store';
import { Item } from '@/lib/types';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { PIXELS_PER_MM } from '@/lib/config';

interface ItemProps {
  item: Item;
}

export const ItemComponent = React.memo(function ItemComponent({ item }: ItemProps) {
  const selectedItemId = usePlanogramStore((state) => state.selectedItemId);
  const selectItem = usePlanogramStore((state) => state.actions.selectItem);
  
  const isSelected = useMemo(() => selectedItemId === item.id, [selectedItemId, item.id]);

  const handleSelect = useCallback(() => {
    selectItem(isSelected ? null : item.id);
  }, [selectItem, isSelected, item.id]);

  return (
    <motion.div
      onClick={handleSelect}
      style={{ width: `${item.width}px`, height: `${item.height}px` }}
      className={clsx(
        'flex items-center justify-center cursor-pointer relative',
        {
          'ring-4 ring-blue-500 ring-offset-2 ring-offset-gray-800 rounded-md': isSelected,
          'opacity-90 hover:opacity-100': !isSelected,
        }
      )}
      whileHover={{ 
        scale: 1.05,
        rotateY: 3,
        transition: { duration: 0.2, ease: "easeOut" }
      }}
      whileTap={{ 
        scale: 0.95,
        transition: { duration: 0.1 }
      }}
      animate={{
        scale: isSelected ? 1.02 : 1,
        boxShadow: isSelected 
          ? "0 0 20px rgba(59, 130, 246, 0.5)" 
          : "0 2px 4px rgba(0, 0, 0, 0.1)"
      }}
      transition={{ 
        scale: { duration: 0.2 },
        boxShadow: { duration: 0.3 }
      }}
    >
      {/* Selection pulse effect */}
      {isSelected && (
        <motion.div
          className="absolute inset-0 bg-blue-400"
          animate={{
            opacity: [0.6, 0.8, 0.6],
            scale: [1, 1, 1]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}
        <motion.img 
        src={item.imageUrl} 
        alt={item.name} 
        className="object-cover w-full h-full pointer-events-none relative z-10"
        onDragStart={(e) => e.preventDefault()}
        whileHover={{ 
          filter: "brightness(1.1) contrast(1.05)",
          transition: { duration: 0.2 }
        }}      />
      
      {/* NEW: Width measurement overlay for BLANK spaces */}
      {item.productType === 'BLANK' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="bg-blue-600 text-white px-2 py-1 rounded-md shadow-lg text-xs font-bold border-2 border-white">
            {Math.round(item.width / PIXELS_PER_MM)}mm
          </div>
        </div>
      )}
    </motion.div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for optimal performance
  // Only re-render if item properties actually changed
  return prevProps.item.id === nextProps.item.id &&
         prevProps.item.imageUrl === nextProps.item.imageUrl &&
         prevProps.item.width === nextProps.item.width &&
         prevProps.item.height === nextProps.item.height;
});