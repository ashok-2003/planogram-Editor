// app/planogram/_components/Item.tsx
'use client';
import { usePlanogramStore } from '@/lib/store';
import { Item } from '@/lib/types';
import clsx from 'clsx';
import { motion } from 'framer-motion';

interface ItemProps {
  item: Item;
}

export function ItemComponent({ item }: ItemProps) {
  const selectedItemId = usePlanogramStore((state) => state.selectedItemId);
  const selectItem = usePlanogramStore((state) => state.actions.selectItem);
  
  const isSelected = selectedItemId === item.id;

  const handleSelect = () => {
    selectItem(isSelected ? null : item.id);
  };

  return (
    <motion.div
      onClick={handleSelect}
      style={{ width: `${item.width}px`, height: `${item.height * 5}px` }}
      className={clsx(
        'flex items-center justify-center cursor-pointer relative',
        {
          'ring-4 ring-blue-500 ring-offset-2 ring-offset-gray-800 rounded-md': isSelected,
          'opacity-75 hover:opacity-100': !isSelected,
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
          className="absolute inset-0 bg-blue-400/20 rounded-md"
          animate={{
            opacity: [0.2, 0.4, 0.2],
            scale: [1, 1.02, 1]
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
        className="object-contain w-full h-full pointer-events-none relative z-10"
        onDragStart={(e) => e.preventDefault()}
        whileHover={{ 
          filter: "brightness(1.1) contrast(1.05)",
          transition: { duration: 0.2 }
        }}
      />
    </motion.div>
  );
}