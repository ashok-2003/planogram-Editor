'use client';

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { usePlanogramStore } from '@/lib/store';
import { Sku, Refrigerator, Item, LayoutData, DoorConfig } from '@/lib/types';
import { SkuPalette } from './SkuPalette';
import { RefrigeratorComponent } from './Refrigerator';
import { MultiDoorRefrigerator } from './MultiDoorRefrigerator';
import { PropertiesPanelMemo as PropertiesPanel } from './PropertiesPanel';
import { InfoPanel } from './InfoPanel';
import { DndContext, DragEndEvent, DragStartEvent, DragOverEvent, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { ItemComponent } from './item';
import { BackendStatePreview } from './BackendStatePreview';
import { FrontendStatePreview } from './FrontendStatePreview';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { runValidation, findConflicts, findDimensionConflicts } from '@/lib/validation';
import { Spinner, PlanogramEditorSkeleton } from './Skeletons';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// --- (All sub-components like ModeToggle, RuleToggle, etc. remain the same) ---

// --- UI Component for Mode Switching ---
interface ModeToggleProps {
  mode: 'reorder' | 'stack';
  setMode: (mode: 'reorder' | 'stack') => void;
}

const ModeToggle = React.memo(({ mode, setMode }: ModeToggleProps) => {
  return (
    <div className="flex items-center gap-2 p-1 bg-gray-200 rounded-lg mb-4 min-w-xs">
      <button
        onClick={() => setMode('reorder')}
        className={clsx(
          "px-4 py-2 text-sm font-semibold rounded-md transition-colors w-full text-center",
          { 'bg-white text-blue-600 shadow': mode === 'reorder' },
          { 'text-gray-600 hover:bg-gray-300': mode !== 'reorder' }
        )}
      >
        Re-Order
      </button>
      <button
        onClick={() => setMode('stack')}
        className={clsx(
          "px-4 py-2 text-sm font-semibold rounded-md transition-colors w-full text-center",
          { 'bg-white text-blue-600 shadow': mode === 'stack' },
          { 'text-gray-600 hover:bg-gray-300': mode !== 'stack' }
        )}
      >
        Stack
      </button>
    </div>
  );
});
ModeToggle.displayName = 'ModeToggle';

// --- UI Component for User Guidance Prompt ---
const ModePrompt = React.memo(({ onDismiss }: { onDismiss: () => void }) => {
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-yellow-400 text-gray-900 p-4 rounded-lg shadow-2xl flex items-center gap-4 z-50">
      <div className="flex-shrink-0">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      </div>
      <p className="text-sm font-medium">Trying to move or add items? Switch to <strong>Re-Order Mode</strong> for that!</p>
      <button onClick={onDismiss} className="text-lg font-bold hover:text-black">&times;</button>
    </div>
  );
});
ModePrompt.displayName = 'ModePrompt';

// --- NEW: UI Component for Rule Toggle ---
const RuleToggle = React.memo(({ isEnabled, onToggle }: { isEnabled: boolean; onToggle: (enabled: boolean) => void }) => {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="rule-toggle" className="text-sm font-medium text-gray-700">
        Enforce Placement Rules
      </label>
      <button
        id="rule-toggle"
        onClick={() => onToggle(!isEnabled)}
        className={clsx(
          "inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
          isEnabled ? 'bg-blue-600' : 'bg-gray-300'
        )}
      >
        <span
          className={clsx(
            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
            isEnabled ? 'translate-x-5' : 'translate-x-0'
          )}
        />      </button>
    </div>
  );
});
RuleToggle.displayName = 'RuleToggle';

// --- NEW: UI Component for Bounding Box Debug Toggle ---
const BoundingBoxToggle = React.memo(({ isEnabled, onToggle }: { isEnabled: boolean; onToggle: (enabled: boolean) => void }) => {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="bbox-toggle" className="text-sm font-medium text-gray-700 flex items-center gap-1">
        <span>Bounding Box</span>
        {/* <span className="text-xs text-gray-500">(Debug)</span> */}
      </label>
      <button
        id="bbox-toggle"
        onClick={() => onToggle(!isEnabled)}
        className={clsx(
          "inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2",
          isEnabled ? 'bg-green-600' : 'bg-gray-300'
        )}
      >
        <span
          className={clsx(
            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
            isEnabled ? 'translate-x-5' : 'translate-x-0'
          )}
        />      </button>
    </div>
  );
});
BoundingBoxToggle.displayName = 'BoundingBoxToggle';

// --- NEW: UI Component for Dimension Validation Toggle ---
const DimensionValidationToggle = React.memo(({ isEnabled, onToggle }: { isEnabled: boolean; onToggle: (enabled: boolean) => void }) => {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="dimension-toggle" className="text-sm font-medium text-gray-700">
        Dimension Validation
      </label>
      <button
        id="dimension-toggle"
        onClick={() => onToggle(!isEnabled)}
        className={clsx(
          "inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-300 focus:ring-offset-2",
          isEnabled ? 'bg-purple-500' : 'bg-gray-300'
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
});
DimensionValidationToggle.displayName = 'DimensionValidationToggle';

// --- NEW: UI Component for Conflict Resolution ---
const ConflictPanel = React.memo(({ conflictCount, onRemove, onDisableRules }: { conflictCount: number; onRemove: () => void; onDisableRules: () => void; }) => {
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
        </button>      </div>
    </div>
  );
});
ConflictPanel.displayName = 'ConflictPanel';

// --- NEW: UI Component for Dimension Conflict Resolution ---
const DimensionConflictPanel = React.memo(({ conflictCount, onRemove, onDisable }: { conflictCount: number; onRemove: () => void; onDisable: () => void; }) => {
  return (
    <div className="fixed bottom-24 right-5 bg-purple-50 border border-purple-200 text-black px-4 py-3 rounded-sm shadow-lg z-50 max-w-sm">
      <strong className="font-bold">Dimension Conflict Detected!</strong>
      <p className="block sm:inline">{conflictCount} item(s) violate dimensional constraints (height/width overflow).</p>
      <div className="mt-3 flex gap-3">
        <button onClick={onRemove} className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-1 px-3 rounded text-sm">
          Remove Conflicts
        </button>
        <button onClick={onDisable} className="bg-transparent hover:bg-purple-200 text-purple-700 font-semibold py-1 px-3 border border-purple-500 hover:border-transparent rounded text-sm">
          Disable Validation
        </button>
      </div>
    </div>
  );
});
DimensionConflictPanel.displayName = 'DimensionConflictPanel';

// Helper function to format time ago (moved before components that use it)
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

// --- UI Component for Restore Draft Prompt ---
const RestorePrompt = React.memo(({ lastSaveTime, onRestore, onDismiss }: { lastSaveTime: Date | null; onRestore: () => void; onDismiss: () => void; }) => {
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
        </button>      </div>
    </div>
  );
});
RestorePrompt.displayName = 'RestorePrompt';

// --- UI Component for Save Indicator ---
const SaveIndicator = React.memo(({ lastSaveTime, onManualSave, isSaving }: { lastSaveTime: Date | null; onManualSave: () => void; isSaving: boolean }) => {
  const timeAgo = lastSaveTime ? getTimeAgo(lastSaveTime) : null;

  return (
    <div className="flex items-center">
      <button
        onClick={onManualSave}
        disabled={isSaving}
        className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm ${isSaving ? 'opacity-75 cursor-not-allowed' : ''
          }`}
      >
        {isSaving ? (
          <>
            <Spinner size="sm" color="white" />
            <span>Saving...</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            Save
          </>
        )}
      </button>
      {/* {timeAgo && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>Last saved: {timeAgo}</span>
        </div>      )} */}
    </div>
  );
});
SaveIndicator.displayName = 'SaveIndicator';

// ... (LayoutSelector remains the same)
interface LayoutSelectorProps {
  layouts: { [key: string]: LayoutData };
  selectedLayout: string;
  onLayoutChange: (layoutId: string) => void;
}

const LayoutSelector = React.memo(({ layouts, selectedLayout, onLayoutChange }: LayoutSelectorProps) => {
  return (
    <div className="mb-6 max-w-sm">
      <label htmlFor="layout-select" className="block text-xs font-medium text-gray-700 mb-1">
        Refrigerator Model
      </label>
      <select
        id="layout-select"
        value={selectedLayout}
        onChange={(e) => onLayoutChange(e.target.value)}
        className="mt-1 block  pl-3 pr-10 py-2 border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm shadow-sm"
      >
        {Object.keys(layouts).map(layoutId => (
          <option key={layoutId} value={layoutId}>{layouts[layoutId].name}</option>
        ))}      </select>
    </div>
  );
});
LayoutSelector.displayName = 'LayoutSelector';

// --- Discard Confirmation Dialog ---
const DiscardConfirmDialog = React.memo(({
  open,
  onOpenChange,
  onConfirm
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className=" font-bold flex items-center gap-2 text-red-500">
            Are you sure?
          </DialogTitle>
          <DialogDescription className="pt-2">
            This action <strong>cannot be undone</strong>. You will lose all your changes and the planogram will be reset to empty.
          </DialogDescription>
        </DialogHeader>        <DialogFooter className="gap-2">
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            variant="destructive"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            ok
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
DiscardConfirmDialog.displayName = 'DiscardConfirmDialog';

export type DropIndicator = {
  targetId: string;
  type: 'reorder' | 'stack' | 'row';
  targetRowId?: string;
  targetDoorId?: string;
  index?: number;
} | null;

export type DragValidation = {
  validRowIds: Set<string>;
  validStackTargetIds: Set<string>;
} | null;

interface PlanogramEditorProps {
  initialSkus: Sku[];
  initialLayout: Refrigerator;
  initialLayouts: { [key: string]: LayoutData };
  importedLayout?: Refrigerator | null;
  importedLayoutId?: string | null; // <-- NEW: The layout ID that was detected
}

export function PlanogramEditor({
  initialSkus,
  initialLayout,
  initialLayouts,
  importedLayout = null,
  importedLayoutId = null // <-- NEW: Accept the detected layout ID
}: PlanogramEditorProps) {  const { refrigerator, actions, findStackLocation } = usePlanogramStore();
  const refrigerators = usePlanogramStore((state) => state.refrigerators);
  const isMultiDoor = usePlanogramStore((state) => state.isMultiDoor);
  const history = usePlanogramStore((state) => state.history);
  const historyIndex = usePlanogramStore((state) => state.historyIndex);

  const hasPendingDraft = usePlanogramStore((state) => state.hasPendingDraft);
  const syncStatus = usePlanogramStore((state) => state.syncStatus);
  const lastSynced = usePlanogramStore((state) => state.lastSynced);

  const [activeItem, setActiveItem] = useState<Item | Sku | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicator>(null);
  const [dragValidation, setDragValidation] = useState<DragValidation>(null);
  const [interactionMode, setInteractionMode] = useState<'reorder' | 'stack'>('reorder');

  const [showModePrompt, setShowModePrompt] = useState(false); const [invalidModeAttempts, setInvalidModeAttempts] = useState(0);
  const [isRulesEnabled, setIsRulesEnabled] = useState(false);
  const [conflictIds, setConflictIds] = useState<string[]>([]);
  const [isDimensionValidationEnabled, setIsDimensionValidationEnabled] = useState(false);
  const [dimensionConflictIds, setDimensionConflictIds] = useState<string[]>([]);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(false);
  // <-- FIXED: Use the imported layout ID if available, otherwise default to 'g-26c'
  const [selectedLayoutId, setSelectedLayoutId] = useState<string>(importedLayoutId || 'g-26c');
  const [isLoading, setIsLoading] = useState(true);
  const [isCaptureLoading, setIsCaptureLoading] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  // NEW: Single initialization useEffect (Phase 9)
  useEffect(() => {
    // 3. THIS IS THE MODIFIED LOGIC - Now passing layoutData for multi-door support
    if (importedLayout) {
      // If an imported layout is provided, use it to initialize (force = true to bypass draft)
      // Pass the layoutData so store knows if it's multi-door
      const layoutData = initialLayouts[selectedLayoutId];
      actions.initializeLayout(selectedLayoutId, importedLayout, true, layoutData);
      toast.success('Successfully imported planogram from image!');
    } else {
      // Otherwise, use the default initialization (which checks localStorage)
      // Pass the layoutData so store knows if it's multi-door
      const layoutData = initialLayouts[selectedLayoutId];
      actions.initializeLayout(selectedLayoutId, initialLayout, false, layoutData);
    }
    // END OF MODIFICATION

    // Simulate minimum loading time for smooth UX
    const loadingTimer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(loadingTimer);
  }, []); // This still only runs once on mount

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
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [canUndo, canRedo, actions]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    })
  );  // Memoize expensive conflict detection computation
  useEffect(() => {
    if (isRulesEnabled) {
      if (refrigerators && Object.keys(refrigerators).length > 0) {
        // Check all doors for conflicts
        const conflicts = findConflicts(refrigerators);
        setConflictIds(conflicts);
      }
    } else {
      setConflictIds([]);
    }
  }, [refrigerators, isRulesEnabled]);

  // Dimension validation conflict detection
  useEffect(() => {
    if (refrigerators && Object.keys(refrigerators).length > 0 && isDimensionValidationEnabled) {
      // Check all doors for dimension conflicts
      const dimensionConflicts = findDimensionConflicts(refrigerators);
      setDimensionConflictIds(dimensionConflicts);
    } else if (!isDimensionValidationEnabled) {
      setDimensionConflictIds([]);
    }
  }, [refrigerators, isDimensionValidationEnabled]);

  // NEW: Update handler to use store action (Phase 10)
  const handleLayoutChange = useCallback((layoutId: string) => {
    setSelectedLayoutId(layoutId);
    const layoutData = initialLayouts[layoutId];
    const newLayout = layoutData?.layout || layoutData?.doors?.[0]?.layout;
    if (newLayout) {
      actions.switchLayout(layoutId, newLayout, layoutData);
    }
  }, [initialLayouts, actions]); const handleModeChange = useCallback((newMode: 'reorder' | 'stack') => {
    setInteractionMode(newMode);
    setShowModePrompt(false);
    setInvalidModeAttempts(0);
  }, []);

  // Handler for discard confirmation
  const handleDiscardConfirm = useCallback(() => {
    actions.clearDraft();
    toast.success('All changes discarded');
  }, [actions]);

  // PERFORMANCE CONFIG: Throttle drag events for better batching
  // 16ms = 60fps (responsive but expensive)
  // 32ms = 30fps (good balance)
  // 50ms = 20fps (smoother batching, less computation)
  const DRAG_THROTTLE_MS = 16; // Reduced from 60fps to 30fps for better performance

  const handleDragStart = useCallback((event: DragStartEvent) => {
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
        isSingleItemStackable = activeData.items.length === 1 && draggedItem.constraints.stackable;        setActiveItem(draggedItem);
      }
    }
    
    if (draggedItem) {
      // In multi-door setup, validate ALL doors and merge results
      // In single-door setup, validate only that door
      if (isMultiDoor) {
        // Multi-door: Run validation for each door and merge results
        const allDoorIds = Object.keys(refrigerators);
        const mergedValidRowIds = new Set<string>();
        const mergedValidStackTargetIds = new Set<string>();
        
        allDoorIds.forEach(doorId => {
          const doorValidation = runValidation({
            draggedItem,
            draggedEntityHeight,
            isSingleItemStackable,
            activeDragId: active.id as string,
            refrigerators,
            doorId,
            findStackLocation,
            isRulesEnabled,
          });
          
          // Merge results from this door
          if (doorValidation) {
            doorValidation.validRowIds.forEach(id => mergedValidRowIds.add(id));
            doorValidation.validStackTargetIds.forEach(id => mergedValidStackTargetIds.add(id));
          }
        });
        
        const validationResult = {
          validRowIds: mergedValidRowIds,
          validStackTargetIds: mergedValidStackTargetIds
        };
        
        setDragValidation(validationResult);
        
      } else {
        // Single-door: Validate only the single door
        const doorId = Object.keys(refrigerators)[0] || 'door-1';
        const validationResult = runValidation({
          draggedItem,
          draggedEntityHeight,
          isSingleItemStackable,
          activeDragId: active.id as string,
          refrigerators,
          doorId,
          findStackLocation,
          isRulesEnabled,
        });
        
        setDragValidation(validationResult);
      }
    }
  }, [actions, refrigerator, refrigerators, isMultiDoor, findStackLocation, isRulesEnabled]);
  // OPTIMIZATION: Store previous drop indicator to prevent unnecessary updates
  const prevDropIndicatorRef = useRef<DropIndicator>(null);
  const dragOverThrottleRef = useRef<number>(0);

  // Helper to compare drop indicators for equality
  const areDropIndicatorsEqual = (a: DropIndicator, b: DropIndicator): boolean => {
    if (a === b) return true;
    if (!a || !b) return false;
    return (
      a.type === b.type &&
      a.targetId === b.targetId &&
      a.targetRowId === b.targetRowId &&
      a.targetDoorId === b.targetDoorId &&
      a.index === b.index
    );
  };

  const handleDragOver = useCallback((event: DragOverEvent) => {
    // Throttle dragOver based on DRAG_THROTTLE_MS config
    const now = Date.now();
    if (now - dragOverThrottleRef.current < DRAG_THROTTLE_MS) {
      return;
    }
    dragOverThrottleRef.current = now;

    const { active, over } = event;

    // Calculate new drop indicator
    let newDropIndicator: DropIndicator = null;

    if (over) {
      const activeId = active.id as string;
      const overId = over.id as string;
      const overType = over.data.current?.type;
      const activeType = active.data.current?.type;      if (activeType === 'sku' || interactionMode === 'reorder') {
        let overRowId: string | undefined;
        let overDoorId: string | undefined;
        let stackIndex: number | undefined;        if (overType === 'row') {
          // Extract doorId and rowId from composite ID (e.g., "door-1:row-1")
          overDoorId = over.data.current?.doorId;
          overRowId = over.data.current?.rowId || overId;
          stackIndex = over.data.current?.items?.length || 0;
        } else if (overType === 'stack') {
          const location = findStackLocation(overId);
          if (location) {
            overDoorId = location.doorId;
            overRowId = location.rowId;
            stackIndex = location.stackIndex;
          }
        }

        if (overRowId && stackIndex !== undefined) {
          newDropIndicator = { type: 'reorder', targetId: activeId, targetRowId: overRowId, targetDoorId: overDoorId, index: stackIndex };
        }
      } else if (interactionMode === 'stack') {
        const isStackingPossible = dragValidation?.validStackTargetIds.has(overId);
        if (isStackingPossible && overType === 'stack' && activeId !== overId) {
          newDropIndicator = { type: 'stack', targetId: overId };
        }
      }
    }

    // CRITICAL OPTIMIZATION: Only update state if drop indicator actually changed
    if (!areDropIndicatorsEqual(newDropIndicator, prevDropIndicatorRef.current)) {
      prevDropIndicatorRef.current = newDropIndicator;

      // Batch non-urgent UI updates with startTransition
      React.startTransition(() => {
        setDropIndicator(newDropIndicator);
      });
    }
  }, [interactionMode, findStackLocation, dragValidation]);
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    const activeType = active.data.current?.type;    if (activeType === 'sku') {
      if (dropIndicator?.type === 'reorder' && dropIndicator.targetRowId && active.data.current) {
        // Build door-qualified row ID to match validation format
        const qualifiedRowId = dropIndicator.targetDoorId 
          ? `${dropIndicator.targetDoorId}:${dropIndicator.targetRowId}`
          : dropIndicator.targetRowId;
        
        if (dragValidation && dragValidation.validRowIds.has(qualifiedRowId)) {
          actions.addItemFromSku(active.data.current.sku, dropIndicator.targetRowId, dropIndicator.index, dropIndicator.targetDoorId);
          setInvalidModeAttempts(0);
        }
      }
    }else if (interactionMode === 'stack') {
      if (dropIndicator?.type === 'stack') {
        actions.stackItem(active.id as string, dropIndicator.targetId);
        setInvalidModeAttempts(0);
      } else if (over) {
        const newAttemptCount = invalidModeAttempts + 1;
        setInvalidModeAttempts(newAttemptCount);
        if (newAttemptCount >= 2) {
          setShowModePrompt(true);
        }
      }    } else if (interactionMode === 'reorder') {
      if (dropIndicator?.type === 'reorder' && dropIndicator.targetRowId) {
        // Build door-qualified row ID to match validation format
        const qualifiedRowId = dropIndicator.targetDoorId 
          ? `${dropIndicator.targetDoorId}:${dropIndicator.targetRowId}`
          : dropIndicator.targetRowId;
        
        if (dragValidation && dragValidation.validRowIds.has(qualifiedRowId)) {
          const startLocation = findStackLocation(active.id as string);
          if (!startLocation || dropIndicator.index === undefined) return;
          
          // Check if moving within same door and same row
          const isSameDoor = !dropIndicator.targetDoorId || !startLocation.doorId || startLocation.doorId === dropIndicator.targetDoorId;
          const isSameRow = startLocation.rowId === dropIndicator.targetRowId;
          
          if (isSameDoor && isSameRow) {
            actions.reorderStack(startLocation.rowId, startLocation.stackIndex, dropIndicator.index, startLocation.doorId);
          } else {
            actions.moveItem(active.id as string, dropIndicator.targetRowId, dropIndicator.index, dropIndicator.targetDoorId);
          }
          setInvalidModeAttempts(0);
        }
      }
    }
    setActiveItem(null);
    setDropIndicator(null);
    setDragValidation(null);
  }, [interactionMode, dropIndicator, dragValidation, invalidModeAttempts, actions, findStackLocation]);

  // Show skeleton loader while loading
  if (isLoading) {
    return <PlanogramEditorSkeleton />;
  }

  return (
    <div className='w-full h-full'>
      <div className='w-full flex-col'>
        <div className='h-24 w-full flex flex-row justify-between items-center px-6 border border-b mb-6'>
          <div className='flex flex-row justify-center items-center gap-2'>

            <Link href='/'>
              <img className='w-12 h-12' src='./logo/shelfMuse.svg'></img>
            </Link>

            <div className='flex flex-col'>
              <p className='text-2xl font-extrabold text-orange-500'>
                Shelf Muse
              </p>
              <p className='text-xs font-light'>
                Drag, Drop, and organize product in the refrigerator and shelves.
              </p>
            </div>
          </div>
          <div className="flex gap-4 h-14 items-center">
            {/* Rule Toggle - FIXED   Hidden for now  */}
            <RuleToggle
              isEnabled={isRulesEnabled}
              onToggle={setIsRulesEnabled}
            />

            {/* Dimension Validation Toggle */}

            <DimensionValidationToggle
              isEnabled={isDimensionValidationEnabled}
              onToggle={setIsDimensionValidationEnabled}
            />

            {/* Bounding Box Debug Toggle */}
            <BoundingBoxToggle
              isEnabled={showBoundingBoxes}
              onToggle={setShowBoundingBoxes}
            />

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
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
              </svg>
            </button>            <button
              onClick={() => setShowDiscardDialog(true)}
              className="px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center gap-2 bg-red-500 text-white hover:bg-red-600 shadow-md hover:shadow-lg"
              title="Clear All Items"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Discard
            </button>            <button
              onClick={async () => {
                setIsCaptureLoading(true);
                try {
                  const { captureRefrigeratorLayout } = await import('@/lib/capture-utils');
                  await captureRefrigeratorLayout('planogram');
                } catch (error) {
                  console.error('Capture failed:', error);
                  toast.error('Failed to capture image');
                } finally {
                  setIsCaptureLoading(false);
                }
              }}
              disabled={isCaptureLoading}
              className={clsx(
                "px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg",
                isCaptureLoading
                  ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                  : "bg-gray-700 text-white hover:bg-gray-800"
              )}
              title={isCaptureLoading ? "Capturing..." : "Download Refrigerator Screenshot"}
            >
              {isCaptureLoading ? (
                <>
                  {/* Spinner */}
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Capturing...</span>
                </>
              ) : (
                <>
                  {/* Camera Icon */}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Capture</span>
                </>
              )}
            </button>

            {/* <div>
              <SaveIndicator lastSaveTime={lastSynced} onManualSave={actions.manualSync} isSaving={syncStatus === 'syncing'} />
            </div> */}
          </div>
        </div>
      </div>

      <DndContext onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd} sensors={sensors}>
        <div className='min-h-screen w-full grid grid-cols-12 gap-4 px-6'>
          {/* Left Column (3/12): SKU Palette */}
          <div className='col-span-3 max-h-screen overflow-y-auto'>
            <SkuPalette skus={initialSkus} />
          </div>

          {/* Middle Column (6/12): Refrigerator */}
          <div className='col-span-6 h-full'>
            <div className='w-full flex flex-row justify-between items-center'>
              <LayoutSelector layouts={initialLayouts} selectedLayout={selectedLayoutId} onLayoutChange={handleLayoutChange} />
              <ModeToggle mode={interactionMode} setMode={handleModeChange} />
            </div>            <div className='justify-center items-center flex border bg-gray-200 rounded-sm pt-2'>
              <MultiDoorRefrigerator
                dragValidation={dragValidation}
                dropIndicator={dropIndicator}
                conflictIds={[
                  ...(isRulesEnabled ? conflictIds : []),
                  ...(isDimensionValidationEnabled ? dimensionConflictIds : [])
                ]}
                selectedLayoutId={selectedLayoutId}
                showBoundingBoxes={showBoundingBoxes}
              />
            </div>
          </div>

          {/* Right Column (3/12): Properties Panel */}
          <div className='col-span-3 max-h-screen overflow-y-auto'>
            <div className='bg-white rounded-lg shadow-md border border-gray-200  overflow-hidden'>
              <PropertiesPanel
                availableSkus={initialSkus}
                isRulesEnabled={isRulesEnabled}
              />            </div>
            <div>
              {/* Backend State Preview - Transformed with Bounding Boxes */}
              <BackendStatePreview />

              {/* Frontend State Preview - Raw Store Data */}
              <FrontendStatePreview />
            </div>
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeItem ? <ItemComponent item={activeItem as Item} /> : null}
        </DragOverlay>
      </DndContext>      {/* Modals and Prompts */}
      <AnimatePresence>
        {isRulesEnabled && conflictIds.length > 0 && (
          <motion.div
            key="conflict-panel"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <ConflictPanel
              conflictCount={conflictIds.length}
              onRemove={() => actions.removeItemsById(conflictIds)}
              onDisableRules={() => setIsRulesEnabled(false)}
            />
          </motion.div>
        )}
        {isDimensionValidationEnabled && dimensionConflictIds.length > 0 && (
          <motion.div
            key="dimension-conflict-panel"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <DimensionConflictPanel
              conflictCount={dimensionConflictIds.length}
              onRemove={() => actions.removeItemsById(dimensionConflictIds)}
              onDisable={() => setIsDimensionValidationEnabled(false)}
            />
          </motion.div>
        )}
        {showModePrompt && (
          <motion.div
            key="mode-prompt"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <ModePrompt onDismiss={() => setShowModePrompt(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Discard Confirmation Dialog */}
      <DiscardConfirmDialog
        open={showDiscardDialog}
        onOpenChange={setShowDiscardDialog}
        onConfirm={handleDiscardConfirm}
      />
    </div>
  );
}