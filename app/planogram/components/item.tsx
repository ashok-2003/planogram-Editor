'use client';
import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePlanogramStore } from '@/lib/store';
import { Item } from '@/lib/types';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { PIXELS_PER_MM } from '@/lib/config';

interface ItemProps {
  item: Item;
  isDragging?: boolean; // NEW: Prop to disable animations during global drag
}

export const ItemComponent = React.memo(function ItemComponent({ item, isDragging = false }: ItemProps) {
  const selectedItemId = usePlanogramStore((state) => state.selectedItemId);
  const selectItem = usePlanogramStore((state) => state.actions.selectItem);
  const actions = usePlanogramStore((state) => state.actions);
  const itemRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  
  const isSelected = useMemo(() => selectedItemId === item.id, [selectedItemId, item.id]);

  // Update menu position when selected
  useEffect(() => {
    if (isSelected && itemRef.current) {
      const rect = itemRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.top - 60, // 60px above the item
        left: rect.left + rect.width / 2, // centered horizontally
      });
    } else {
      setMenuPosition(null);
    }
  }, [isSelected]);

  const handleSelect = useCallback(() => {
    selectItem(isSelected ? null : item.id);
  }, [selectItem, isSelected, item.id]);

  const handleStack = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    actions.duplicateAndStack();
  }, [actions]);

  const handleDuplicate = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    actions.duplicateAndAddNew();
  }, [actions]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    actions.deleteSelectedItem();
  }, [actions]);  // Reduce blank space height by 2px
  const adjustedHeight = useMemo(() => {
    return item.productType === 'BLANK' ? item.height - 4 : item.height;
  }, [item.productType, item.height]);

  // PERFORMANCE: Conditionally disable animations during drag
  const shouldAnimate = !isDragging;

  return (
    <>
      {/* PERFORMANCE OPTIMIZATION: Commented out Framer Motion, replaced with plain div + CSS */}
      {/* <motion.div
        ref={itemRef}
        onClick={handleSelect}
        style={{ 
          width: `${item.width}px`, 
          height: `${adjustedHeight}px` 
        }}
        className={clsx(
          'flex items-center justify-center cursor-pointer relative',
          {
            'ring-4 ring-blue-500 rounded-md': isSelected,
            'opacity-90 hover:opacity-100': !isSelected,
          }
        )}
        whileHover={shouldAnimate ? { 
          scale: 1.05,
          rotateY: 3,
          transition: { duration: 0.2, ease: "easeOut" }
        } : undefined}
        whileTap={shouldAnimate ? { 
          scale: 0.95,
          transition: { duration: 0.1 }
        } : undefined}
        animate={shouldAnimate ? {
          scale: isSelected ? 1.02 : 1,
          boxShadow: isSelected 
            ? "0 0 10px rgba(59, 130, 246, 0.5)" 
            : "0 2px 4px rgba(0, 0, 0, 0.1)"
        } : undefined}
        transition={shouldAnimate ? { 
          scale: { duration: 0.2 },
          boxShadow: { duration: 0.3 }
        } : { duration: 0 }}
      > */}
      
      {/* ✅ OPTIMIZED: Plain div with CSS transitions only */}
      <div
        ref={itemRef}
        onClick={handleSelect}
        style={{ 
          width: `${item.width}px`, 
          height: `${adjustedHeight}px` 
        }}
        className={clsx(
          'flex items-center justify-center cursor-pointer relative transition-opacity duration-150',
          {
            'ring-4 ring-blue-500 rounded-md': isSelected,
            'opacity-90 hover:opacity-100': !isSelected,
          }
        )}
      >
        {/* PERFORMANCE: Pulse animation removed - expensive infinite animation */}
        {/* {isSelected && shouldAnimate && (
          <motion.div
            className="absolute inset-0 bg-blue-400 rounded-md"
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
        )} */}
        
        {/* PERFORMANCE: Replaced motion.img with plain img */}
        {/* <motion.img 
          src={item.imageUrl} 
          alt={item.name} 
          className="object-cover w-full h-full pointer-events-none relative z-10 rounded-md"
          onDragStart={(e) => e.preventDefault()}
          whileHover={shouldAnimate ? { 
            filter: "brightness(1.1) contrast(1.05)",
            transition: { duration: 0.2 }
          } : undefined}
        /> */}
        
        {/* ✅ OPTIMIZED: Plain img */}
        <img 
          src={item.imageUrl} 
          alt={item.name} 
          className="object-cover w-full h-full pointer-events-none relative z-10 rounded-md"
          onDragStart={(e) => e.preventDefault()}
        />
          {/* Width measurement overlay for BLANK spaces */}
        {item.productType === 'BLANK' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">
              {Math.round(item.width / PIXELS_PER_MM)}mm
            </div>
          </div>
        )}
      </div>
      {/* </motion.div> COMMENTED OUT - replaced with plain div above */}

      {/* Floating Action Menu - Portaled to document body to escape drag listeners */}
      {isSelected && menuPosition && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed z-[10000]"
          style={{
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`,
            transform: 'translateX(-50%)',
            pointerEvents: 'auto',
          }}
        >
          <div className="bg-white rounded-full shadow-2xl border-2 border-gray-200 px-3 py-2 flex items-center gap-2">
            {/* Stack Button (only if stackable) */}
            {item.constraints.stackable && (
              <button
                onClick={handleStack}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-full transition-colors text-sm shadow-md"
                title="Duplicate and Stack"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Stack
              </button>
            )}

            {/* Duplicate Button */}
            <button
              onClick={handleDuplicate}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold p-2 rounded-full transition-colors shadow-md"
              title="Duplicate"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>

            {/* Delete Button (only if deletable) */}
            {item.constraints.deletable && (
              <button
                onClick={handleDelete}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                className="flex items-center justify-center bg-red-500 hover:bg-red-600 text-white font-semibold p-2 rounded-full transition-colors shadow-md"
                title="Delete"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}, (prevProps, nextProps) => {
  return prevProps.item.id === nextProps.item.id &&
         prevProps.item.imageUrl === nextProps.item.imageUrl &&
         prevProps.item.width === nextProps.item.width &&
         prevProps.item.height === nextProps.item.height;
});