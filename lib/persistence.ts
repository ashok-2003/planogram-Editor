import { Refrigerator } from './types';

const STORAGE_KEY = 'planogram-draft';
const AUTOSAVE_DELAY = 1000; // 1 second debounce

/**
 * Save refrigerator state to localStorage
 */
export function savePlanogramDraft(refrigerator: Refrigerator): void {
  try {
    const data = JSON.stringify(refrigerator);
    localStorage.setItem(STORAGE_KEY, data);
    localStorage.setItem(`${STORAGE_KEY}-timestamp`, new Date().toISOString());
  } catch (error) {
    console.error('Failed to save planogram draft:', error);
  }
}

/**
 * Load refrigerator state from localStorage
 */
export function loadPlanogramDraft(): Refrigerator | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load planogram draft:', error);
    return null;
  }
}

/**
 * Get the last save timestamp
 */
export function getLastSaveTimestamp(): Date | null {
  try {
    const timestamp = localStorage.getItem(`${STORAGE_KEY}-timestamp`);
    if (!timestamp) return null;
    return new Date(timestamp);
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
 * Check if a draft exists
 */
export function hasSavedDraft(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch (error) {
    return false;
  }
}

/**
 * Debounced save function
 */
let saveTimeout: NodeJS.Timeout | null = null;

export function debouncedSavePlanogram(refrigerator: Refrigerator): void {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  
  saveTimeout = setTimeout(() => {
    savePlanogramDraft(refrigerator);
  }, AUTOSAVE_DELAY);
}
