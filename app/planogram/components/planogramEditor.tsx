'use client';

import { useEffect, useState } from 'react';
import { usePlanogramStore } from '@/lib/store';
import { Sku, Refrigerator, Item } from '@/lib/types';
import { SkuPalette } from './SkuPalette';
import { RefrigeratorComponent } from './Refrigerator';
import { InfoPanel } from './InfoPanel';
import { DndContext, DragEndEvent, DragStartEvent, DragOverEvent, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { ItemComponent } from './item';
import { StatePreview } from './statePreview';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { runValidation } from '@/lib/validation'; // Import the new validator

// --- UI Component for Mode Switching ---
interface ModeToggleProps {
  mode: 'reorder' | 'stack';
  setMode: (mode: 'reorder' | 'stack') => void;
}

function ModeToggle({ mode, setMode }: ModeToggleProps) {
  return (
    <div className="flex items-center gap-2 p-1 bg-gray-200 rounded-lg mb-4 max-w-xs">
      <button
        onClick={() => setMode('reorder')}
        className={clsx(
          "px-4 py-2 text-sm font-semibold rounded-md transition-colors w-full text-center",
          { 'bg-white text-blue-600 shadow': mode === 'reorder' },
          { 'text-gray-600 hover:bg-gray-300': mode !== 'reorder' }
        )}
      >
        Re-Order Mode
      </button>
      <button
        onClick={() => setMode('stack')}
        className={clsx(
          "px-4 py-2 text-sm font-semibold rounded-md transition-colors w-full text-center",
          { 'bg-white text-blue-600 shadow': mode === 'stack' },
          { 'text-gray-600 hover:bg-gray-300': mode !== 'stack' }
        )}
      >
        Stack Mode
      </button>
    </div>
  );
}

// --- UI Component for User Guidance Prompt ---
function ModePrompt({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-yellow-400 text-gray-900 p-4 rounded-lg shadow-2xl flex items-center gap-4 z-50">
      <div className="flex-shrink-0">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      </div>
      <p className="text-sm font-medium">Trying to move or add items? Switch to <strong>Re-Order Mode</strong> for that!</p>
      <button onClick={onDismiss} className="text-lg font-bold hover:text-black">&times;</button>
    </div>
  );
}


export type DropIndicator = {
  targetId: string;
  type: 'reorder' | 'stack' | 'row';
  targetRowId?: string;
  index?: number;
} | null;

export type DragValidation = {
  validRowIds: Set<string>;
  validStackTargetIds: Set<string>;
} | null;

interface PlanogramEditorProps {
  initialSkus: Sku[];
  initialLayout: Refrigerator;
}

export function PlanogramEditor({ initialSkus, initialLayout }: PlanogramEditorProps) {
  const { refrigerator, actions, findStackLocation } = usePlanogramStore();
  const [activeItem, setActiveItem] = useState<Item | Sku | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicator>(null);
  const [dragValidation, setDragValidation] = useState<DragValidation>(null);
  const [interactionMode, setInteractionMode] = useState<'reorder' | 'stack'>('reorder');
  
  const [showModePrompt, setShowModePrompt] = useState(false);
  const [invalidModeAttempts, setInvalidModeAttempts] = useState(0);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => {
    usePlanogramStore.setState({ refrigerator: initialLayout });
  }, [initialLayout]);

  function handleModeChange(newMode: 'reorder' | 'stack') {
    setInteractionMode(newMode);
    setShowModePrompt(false);
    setInvalidModeAttempts(0);
  }

  function handleDragStart(event: DragStartEvent) {
    setShowModePrompt(false);
    actions.selectItem(null);
    const { active } = event;
    const activeData = active.data.current;
    
    let draggedItem: Item | Sku | null = null;
    let draggedEntityHeight = 0;
    let isSingleItemStackable = false;

    if (activeData?.type === 'sku') {
      draggedItem = activeData.sku;
      draggedEntityHeight = draggedItem.height;
      isSingleItemStackable = draggedItem.constraints.stackable;
      setActiveItem(draggedItem);
    } else if (activeData?.type === 'stack' && activeData.items.length > 0) {
      draggedItem = activeData.items[0];
      draggedEntityHeight = activeData.items.reduce((sum: number, item: Item) => sum + item.height, 0);
      isSingleItemStackable = activeData.items.length === 1 && draggedItem.constraints.stackable;
      setActiveItem(draggedItem);
    }

    if (draggedItem) {
      // --- Refactored Validation ---
      // All complex validation logic is now in a separate, dedicated function.
      const validationResult = runValidation({
        draggedItem,
        draggedEntityHeight,
        isSingleItemStackable,
        activeDragId: active.id as string,
        refrigerator,
        findStackLocation,
      });
      setDragValidation(validationResult);
      // --------------------------
    }
  }
  
  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) { setDropIndicator(null); return; }

    const activeId = active.id as string;
    const overId = over.id as string;
    const overType = over.data.current?.type;
    const activeType = active.data.current?.type;

    if (activeType === 'sku' || interactionMode === 'reorder') {
      let overRowId: string | undefined;
      let stackIndex: number | undefined;
      
      if (overType === 'row') {
        overRowId = overId;
        stackIndex = over.data.current?.items?.length || 0;
      } else if (overType === 'stack') {
        const location = findStackLocation(overId);
        if (location) {
          overRowId = location.rowId;
          stackIndex = location.stackIndex;
        }
      }
      
      if (overRowId && stackIndex !== undefined) {
        setDropIndicator({ type: 'reorder', targetId: activeId, targetRowId: overRowId, index: stackIndex });
        return;
      }
    }

    if (interactionMode === 'stack') {
      const isStackingPossible = dragValidation?.validStackTargetIds.has(overId);
      if (isStackingPossible && overType === 'stack' && activeId !== overId) {
        setDropIndicator({ type: 'stack', targetId: overId });
        return;
      }
    }
    
    setDropIndicator(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    
    const activeType = active.data.current?.type;

    if (activeType === 'sku') {
      if (dropIndicator?.type === 'reorder' && dropIndicator.targetRowId) {
        if (dragValidation && dragValidation.validRowIds.has(dropIndicator.targetRowId)) {
          actions.addItemFromSku(active.data.current.sku, dropIndicator.targetRowId, dropIndicator.index);
          setInvalidModeAttempts(0);
        }
      }
    }
    else if (interactionMode === 'stack') {
      if (dropIndicator?.type === 'stack') {
        actions.stackItem(active.id as string, dropIndicator.targetId);
        setInvalidModeAttempts(0);
      } else if (over) {
        const newAttemptCount = invalidModeAttempts + 1;
        setInvalidModeAttempts(newAttemptCount);
        if (newAttemptCount >= 2) {
          setShowModePrompt(true);
        }
      }
    } 
    else if (interactionMode === 'reorder') {
      if (dropIndicator?.type === 'reorder' && dropIndicator.targetRowId) {
        if (dragValidation && dragValidation.validRowIds.has(dropIndicator.targetRowId)) {
          const startLocation = findStackLocation(active.id as string);
          if (!startLocation) return;
          
          if (startLocation.rowId === dropIndicator.targetRowId) {
            actions.reorderStack(startLocation.rowId, startLocation.stackIndex, dropIndicator.index);
          } else {
            actions.moveItem(active.id as string, dropIndicator.targetRowId, dropIndicator.index);
          }
          setInvalidModeAttempts(0);
        }
      }
    }

    setActiveItem(null);
    setDropIndicator(null);
    setDragValidation(null);
  }

  return (
    <>
      <ModeToggle mode={interactionMode} setMode={handleModeChange} />
      <DndContext onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd} sensors={sensors}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_350px] gap-8">
          <div className="flex flex-col md:flex-row gap-8">
            <SkuPalette skus={initialSkus} />
            <RefrigeratorComponent dragValidation={dragValidation} dropIndicator={dropIndicator} />
          </div>
          <div>
            <InfoPanel />
            <StatePreview />
          </div>
        </div>
        <DragOverlay>
          {activeItem ? (
            <motion.div
              initial={{ scale: 1.1, rotate: 2 }}
              animate={{ 
                scale: 1.05, 
                rotate: -1,
                boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)"
              }}
              transition={{ 
                duration: 0.2,
                boxShadow: { duration: 0.1 }
              }}
              className="relative"
            >
              {/* Trailing particles effect */}
              <motion.div
                className="absolute inset-0 bg-blue-400/20 rounded-lg blur-md"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.1, 0.3]
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              <ItemComponent item={activeItem as Item} />
            </motion.div>
          ) : null}
        </DragOverlay>
      </DndContext>
      <AnimatePresence>
        {showModePrompt && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <ModePrompt onDismiss={() => setShowModePrompt(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}