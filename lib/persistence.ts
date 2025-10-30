import { Refrigerator } from './types';

const STORAGE_KEY = 'planogram-draft';
const AUTOSAVE_DELAY = 1000; // 1 second debounce

interface SavedDraft {
  refrigerator: Refrigerator;
  layoutId: string;
  timestamp: string;
}

/**
 * Save refrigerator state to localStorage with layout context
 */
export function savePlanogramDraft(refrigerator: Refrigerator, layoutId: string): void {
  try {
    const draft: SavedDraft = {
      refrigerator,
      layoutId,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch (error) {
    console.error('Failed to save planogram draft:', error);
  }
}

/**
 * Check if saved draft is different from current state for a specific layout
 */
export function isDraftDifferent(currentState: Refrigerator, layoutId: string): boolean {
  try {
    const savedDraft = loadPlanogramDraft(layoutId);
    if (!savedDraft) return false;
    
    // Deep comparison by serializing both
    return JSON.stringify(savedDraft) !== JSON.stringify(currentState);
  } catch (error) {
    console.error('Failed to compare draft:', error);
    return false;
  }
}

/**
 * Load refrigerator state from localStorage for a specific layout
 */
export function loadPlanogramDraft(layoutId?: string): Refrigerator | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    
    const draft: SavedDraft = JSON.parse(data);
    
    // If layoutId is provided, only return if it matches
    if (layoutId && draft.layoutId !== layoutId) {
      return null;
    }
    
    return draft.refrigerator;
  } catch (error) {
    console.error('Failed to load planogram draft:', error);
    return null;
  }
}

/**
 * Get the saved draft with all metadata
 */
export function getSavedDraft(): SavedDraft | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to get saved draft:', error);
    return null;
  }
}

/**
 * Get the last save timestamp
 */
export function getLastSaveTimestamp(): Date | null {
  try {
    const draft = getSavedDraft();
    if (!draft) return null;
    return new Date(draft.timestamp);
  } catch (error) {
    console.error('Failed to get last save timestamp:', error);
    return null;
  }
}

/**
 * Clear saved draft
 */
export function clearPlanogramDraft(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(`${STORAGE_KEY}-timestamp`);
  } catch (error) {
    console.error('Failed to clear planogram draft:', error);
  }
}

/**
 * Check if a draft exists for a specific layout
 */
export function hasSavedDraft(layoutId?: string): boolean {
  try {
    const draft = getSavedDraft();
    if (!draft) return false;
    
    // If layoutId provided, check if it matches
    if (layoutId) {
      return draft.layoutId === layoutId;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Debounced save function
 */
let saveTimeout: NodeJS.Timeout | null = null;

export function debouncedSavePlanogram(refrigerator: Refrigerator, layoutId: string): void {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  
  saveTimeout = setTimeout(() => {
    savePlanogramDraft(refrigerator, layoutId);
  }, AUTOSAVE_DELAY);
}
