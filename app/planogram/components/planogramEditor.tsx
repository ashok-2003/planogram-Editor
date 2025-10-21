'use client';

import { useEffect, useState } from 'react';
import { usePlanogramStore } from '@/lib/store';
import { Sku, Refrigerator, Item, LayoutData } from '@/lib/types'; // Add LayoutData import
import { SkuPalette } from './SkuPalette';
import { RefrigeratorComponent } from './Refrigerator';
import { InfoPanel } from './InfoPanel';
import { DndContext, DragEndEvent, DragStartEvent, DragOverEvent, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { ItemComponent } from './item';
import { StatePreview } from './statePreview';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { runValidation, findConflicts } from '@/lib/validation';
import { debouncedSavePlanogram, loadPlanogramDraft, hasSavedDraft, clearPlanogramDraft, getLastSaveTimestamp, savePlanogramDraft, isDraftDifferent, getSavedDraft } from '@/lib/persistence';
import toast from 'react-hot-toast';

// --- (All sub-components like ModeToggle, RuleToggle, etc. remain the same) ---

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
      </button>      <button
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
      </div>    </div>
  );
}

// --- UI Component for Restore Draft Prompt ---
function RestorePrompt({ lastSaveTime, onRestore, onDismiss }: { lastSaveTime: Date | null; onRestore: () => void; onDismiss: () => void; }) {
  const timeAgo = lastSaveTime ? getTimeAgo(lastSaveTime) : 'recently';
  
  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-blue-500 text-white p-4 rounded-lg shadow-2xl flex items-center gap-4 z-50 max-w-md">
      <div className="flex-shrink-0">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold">Unsaved Work Found!</p>
        <p className="text-xs opacity-90">You have changes from {timeAgo}</p>
      </div>
      <div className="flex gap-2">
        <button onClick={onRestore} className="bg-white text-blue-500 px-3 py-1 rounded font-semibold text-sm hover:bg-blue-50 transition-colors">
          Restore
        </button>
        <button onClick={onDismiss} className="bg-blue-600 text-white px-3 py-1 rounded font-semibold text-sm hover:bg-blue-700 transition-colors">
          Dismiss
        </button>
      </div>
    </div>
  );
}

// --- UI Component for Save Indicator ---
function SaveIndicator({ lastSaveTime, onManualSave }: { lastSaveTime: Date | null; onManualSave: () => void }) {
  const timeAgo = lastSaveTime ? getTimeAgo(lastSaveTime) : null;
  
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <button 
        onClick={onManualSave}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
        </svg>
        Save Now
      </button>
      {timeAgo && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>Last saved: {timeAgo}</span>
        </div>
      )}
    </div>
  );
}

// Helper function to format time ago
function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

// ... (LayoutSelector remains the same)
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
        className="mt-1 block w-full pl-3 pr-10 py-2 text-black border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md shadow-sm"
      >
        {Object.keys(layouts).map(layoutId => (
          <option key={layoutId} value={layoutId}>{layouts[layoutId].name}</option>
        ))}
      </select>
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
  initialLayouts: { [key: string]: LayoutData }; // Update to use LayoutData
}

export function PlanogramEditor({ initialSkus, initialLayout, initialLayouts }: PlanogramEditorProps) {
  const { refrigerator, actions, findStackLocation } = usePlanogramStore();
  const history = usePlanogramStore((state) => state.history);
  const historyIndex = usePlanogramStore((state) => state.historyIndex);
  const [activeItem, setActiveItem] = useState<Item | Sku | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicator>(null);
  const [dragValidation, setDragValidation] = useState<DragValidation>(null);
  const [interactionMode, setInteractionMode] = useState<'reorder' | 'stack'>('reorder');
  
  const [showModePrompt, setShowModePrompt] = useState(false);
  const [invalidModeAttempts, setInvalidModeAttempts] = useState(0);
  const [isRulesEnabled, setIsRulesEnabled] = useState(true);
  const [conflictIds, setConflictIds] = useState<string[]>([]);
    const [selectedLayoutId, setSelectedLayoutId] = useState<string>('g-26c');
  const [hasMounted, setHasMounted] = useState(false);
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [initialLayoutLoaded, setInitialLayoutLoaded] = useState(false);  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  // Check for saved draft on mount (client-side only)
  useEffect(() => {
    setHasMounted(true);
  }, []);
  useEffect(() => {
    if (hasMounted && !initialLayoutLoaded) {
      // Initialize with the initial layout first
      usePlanogramStore.setState({ 
        refrigerator: initialLayout,
        history: [JSON.parse(JSON.stringify(initialLayout))],
        historyIndex: 0
      });
      setInitialLayoutLoaded(true);
      
      // Then check if there's a different saved draft for the current layout
      setTimeout(() => {
        if (hasSavedDraft(selectedLayoutId) && isDraftDifferent(initialLayout, selectedLayoutId)) {
          setShowRestorePrompt(true);
          setLastSaveTime(getLastSaveTimestamp());
        } else {
          // If no different draft, update the last save time
          setLastSaveTime(getLastSaveTimestamp());
        }
      }, 100);
    }
  }, [hasMounted, initialLayoutLoaded, initialLayout, selectedLayoutId]);
  useEffect(() => {
    // Initialize with the initial layout and set it as the first history state
    // This is now handled in the hasMounted effect above
  }, [initialLayout]);

  useEffect(() => {
    if (hasMounted && initialLayouts[selectedLayoutId]) {
      const newLayout = initialLayouts[selectedLayoutId].layout;
      // When switching layouts, reset history with the new layout as the initial state
      usePlanogramStore.setState({ 
        refrigerator: newLayout,
        history: [JSON.parse(JSON.stringify(newLayout))],
        historyIndex: 0
      });
    }
  }, [selectedLayoutId, initialLayouts, hasMounted]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) actions.undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        if (canRedo) actions.redo();
      }
      if (e.key === 'Delete' && usePlanogramStore.getState().selectedItemId) {
        e.preventDefault();
        actions.deleteSelectedItem();
      }
    };    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [canUndo, canRedo, actions]);  // Auto-save to localStorage
  useEffect(() => {
    if (hasMounted && initialLayoutLoaded && refrigerator && Object.keys(refrigerator).length > 0) {
      debouncedSavePlanogram(refrigerator, selectedLayoutId);
      // Update last save time after a short delay (accounting for debounce)
      const timer = setTimeout(() => {
        setLastSaveTime(new Date());
      }, 1100); // Slightly longer than debounce delay
      return () => clearTimeout(timer);
    }
  }, [refrigerator, hasMounted, initialLayoutLoaded, selectedLayoutId]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

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
  }  function handleRestoreDraft() {
    const savedDraft = loadPlanogramDraft(selectedLayoutId);
    console.log('🔄 Restoring draft for layout:', selectedLayoutId);
    console.log('📦 Saved draft data:', savedDraft);
    
    if (savedDraft) {
      // Deep clone to ensure we have a fresh object
      const restoredState = JSON.parse(JSON.stringify(savedDraft));
      console.log('✅ Restored state:', restoredState);
      
      // Update the store with the restored state
      usePlanogramStore.setState({ 
        refrigerator: restoredState,
        history: [JSON.parse(JSON.stringify(restoredState))],
        historyIndex: 0,
        selectedItemId: null
      });
      
      // Verify the state was updated
      const currentState = usePlanogramStore.getState().refrigerator;
      console.log('🔍 Current store state after restore:', currentState);
      
      toast.success('Draft restored successfully!');
      setShowRestorePrompt(false);
      setLastSaveTime(new Date());
    } else {
      console.log('❌ No saved draft found for layout:', selectedLayoutId);
      toast.error('Failed to restore draft - no saved data found');
    }
  }
  function handleDismissDraft() {
    clearPlanogramDraft();
    setShowRestorePrompt(false);
    toast.success('Draft dismissed');
  }
  function handleManualSave() {
    savePlanogramDraft(refrigerator, selectedLayoutId);
    setLastSaveTime(new Date());
    toast.success('Planogram saved!');
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
        isRulesEnabled,
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
    } else if (interactionMode === 'stack') {
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
    } else if (interactionMode === 'reorder') {
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
    return null;
  }
  return (
    <div className=''>
      <div className="flex justify-between items-start text-black mb-4">
        <LayoutSelector layouts={initialLayouts} selectedLayout={selectedLayoutId} onLayoutChange={handleLayoutChange} />
        <RuleToggle isEnabled={isRulesEnabled} onToggle={setIsRulesEnabled} />
      </div>
        <div className="flex justify-between items-center mb-4">
        <ModeToggle mode={interactionMode} setMode={handleModeChange} />
        
        {/* Undo/Redo Controls */}
        <div className="flex gap-2">
          <button
            onClick={actions.undo}
            disabled={!canUndo}
            className={clsx(
              "px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center gap-2",
              canUndo
                ? "bg-blue-500 text-white hover:bg-blue-600 shadow-md hover:shadow-lg"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            )}
            title="Undo (Ctrl+Z)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            Undo
          </button>
          
          <button
            onClick={actions.redo}
            disabled={!canRedo}
            className={clsx(
              "px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center gap-2",
              canRedo
                ? "bg-blue-500 text-white hover:bg-blue-600 shadow-md hover:shadow-lg"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            )}
            title="Redo (Ctrl+Y)"
          >
            Redo
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Save Indicator */}
      <div className="mb-4">
        <SaveIndicator lastSaveTime={lastSaveTime} onManualSave={handleManualSave} />
      </div>
      
      <DndContext onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd} sensors={sensors}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_350px] gap-8">
          <div className="flex flex-col md:flex-row gap-8 max-h-screen">
            <SkuPalette skus={initialSkus} />
            <RefrigeratorComponent 
              dragValidation={dragValidation} 
              dropIndicator={dropIndicator}
              conflictIds={isRulesEnabled ? conflictIds : []}
              selectedLayoutId={selectedLayoutId}
            />
          </div>
          <div>
            <InfoPanel availableSkus={initialSkus} />
          </div>
          <div className='flex justify-end items-baseline-last'>
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
        )}        {showModePrompt && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <ModePrompt onDismiss={() => setShowModePrompt(false)} />
          </motion.div>
        )}
        {showRestorePrompt && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <RestorePrompt 
              lastSaveTime={lastSaveTime}
              onRestore={handleRestoreDraft}
              onDismiss={handleDismissDraft}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}