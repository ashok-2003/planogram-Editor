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
import { runValidation, findConflicts } from '@/lib/validation'; // Import the new conflict finder

// --- UI Component for Layout Switching ---
interface LayoutSelectorProps {
  layouts: { [key: string]: { name: string; layout: Refrigerator } };
  selectedLayout: string;
  onLayoutChange: (layoutId: string) => void;
}

function LayoutSelector({ layouts, selectedLayout, onLayoutChange }: LayoutSelectorProps) {
  return (
    <div className="mb-6 max-w-sm">
      <label htmlFor="layout-select" className="block text-sm font-medium text-gray-700 mb-1">
        Refrigerator Model
      </label>
      <select
        id="layout-select"
        value={selectedLayout}
        onChange={(e) => onLayoutChange(e.target.value)}
        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md shadow-sm"
      >
        {Object.keys(layouts).map(layoutId => (
          <option key={layoutId} value={layoutId}>{layouts[layoutId].name}</option>
        ))}
      </select>
    </div>
  );
}


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

// --- NEW: UI Component for Rule Toggle ---
function RuleToggle({ isEnabled, onToggle }: { isEnabled: boolean; onToggle: (enabled: boolean) => void }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <label htmlFor="rule-toggle" className="text-sm font-medium text-gray-700">
        Enforce Placement Rules
      </label>
      <button
        id="rule-toggle"
        onClick={() => onToggle(!isEnabled)}
        className={clsx(
          "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
          isEnabled ? 'bg-blue-600' : 'bg-gray-200'
        )}
      >
        <span
          className={clsx(
            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
            isEnabled ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </button>
    </div>
  );
}

// --- NEW: UI Component for Conflict Resolution ---
function ConflictPanel({ conflictCount, onRemove, onDisableRules }: { conflictCount: number; onRemove: () => void; onDisableRules: () => void; }) {
  return (
    <div className="fixed bottom-5 right-5 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg z-50 max-w-sm">
      <strong className="font-bold">Rule Conflict Detected!</strong>
      <p className="block sm:inline">{conflictCount} item(s) violate the current placement rules.</p>
      <div className="mt-3 flex gap-3">
        <button onClick={onRemove} className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-sm">
          Remove Conflicts
        </button>
        <button onClick={onDisableRules} className="bg-transparent hover:bg-red-200 text-red-700 font-semibold py-1 px-3 border border-red-500 hover:border-transparent rounded text-sm">
          Disable Rules
        </button>
      </div>
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
  initialLayouts: { [key: string]: { name: string; layout: Refrigerator } };
}

export function PlanogramEditor({ initialSkus, initialLayout, initialLayouts }: PlanogramEditorProps) {
  const { refrigerator, actions, findStackLocation } = usePlanogramStore();
  const [activeItem, setActiveItem] = useState<Item | Sku | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicator>(null);
  const [dragValidation, setDragValidation] = useState<DragValidation>(null);
  const [interactionMode, setInteractionMode] = useState<'reorder' | 'stack'>('reorder');
  
  const [showModePrompt, setShowModePrompt] = useState(false);
  const [invalidModeAttempts, setInvalidModeAttempts] = useState(0);

  // --- NEW STATE FOR RULE MANAGEMENT ---
  const [isRulesEnabled, setIsRulesEnabled] = useState(true);
  const [conflictIds, setConflictIds] = useState<string[]>([]);
  // ------------------------------------

  const [selectedLayoutId, setSelectedLayoutId] = useState<string>('default');
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // This effect runs whenever the refrigerator layout changes.
  // It checks for conflicts and updates the state.
  useEffect(() => {
    if (refrigerator && Object.keys(refrigerator).length > 0) {
      const conflicts = findConflicts(refrigerator);
      setConflictIds(conflicts);
    }
  }, [refrigerator]);

  function handleLayoutChange(layoutId: string) {
    setSelectedLayoutId(layoutId);
    const newLayout = initialLayouts[layoutId]?.layout;
    if (newLayout) {
      actions.selectItem(null);
      usePlanogramStore.setState({ refrigerator: newLayout });
    }
  }

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
      if (draggedItem) {
        draggedEntityHeight = draggedItem.height;
        isSingleItemStackable = draggedItem.constraints.stackable;
        setActiveItem(draggedItem);
      }
    } else if (activeData?.type === 'stack' && activeData.items.length > 0) {
      draggedItem = activeData.items[0];
      if (draggedItem) {
        draggedEntityHeight = activeData.items.reduce((sum: number, item: Item) => sum + item.height, 0);
        isSingleItemStackable = activeData.items.length === 1 && draggedItem.constraints.stackable;
        setActiveItem(draggedItem);
      }
    }

    if (draggedItem) {
      const validationResult = runValidation({
        draggedItem,
        draggedEntityHeight,
        isSingleItemStackable,
        activeDragId: active.id as string,
        refrigerator,
        findStackLocation,
        isRulesEnabled, // Pass the toggle state to the validator
      });
      setDragValidation(validationResult);
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
        if (dropIndicator?.type === 'reorder' && dropIndicator.targetRowId && active.data.current) {
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
                if (!startLocation || dropIndicator.index === undefined) return;
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
  
  if (!hasMounted) {
    return null; // or a loading skeleton
  }

  return (
    <>
      <div className="flex justify-between items-start">
        <LayoutSelector layouts={initialLayouts} selectedLayout={selectedLayoutId} onLayoutChange={handleLayoutChange} />
        <RuleToggle isEnabled={isRulesEnabled} onToggle={setIsRulesEnabled} />
      </div>
      <ModeToggle mode={interactionMode} setMode={handleModeChange} />
      <DndContext onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd} sensors={sensors}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_350px] gap-8">
          <div className="flex flex-col md:flex-row gap-8">
            <SkuPalette skus={initialSkus} />
            <RefrigeratorComponent 
              dragValidation={dragValidation} 
              dropIndicator={dropIndicator} 
            />
          </div>
          <div>
            <InfoPanel availableSkus={initialSkus} />
            <StatePreview />
          </div>
        </div>
        <DragOverlay>
          {activeItem ? <ItemComponent item={activeItem as Item} /> : null}
        </DragOverlay>
      </DndContext>
      <AnimatePresence>
        {isRulesEnabled && conflictIds.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
            <ConflictPanel 
              conflictCount={conflictIds.length}
              onRemove={() => actions.removeItemsById(conflictIds)}
              onDisableRules={() => setIsRulesEnabled(false)}
            />
          </motion.div>
        )}
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