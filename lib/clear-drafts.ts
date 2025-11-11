/**
 * Utility to clear all planogram drafts from localStorage
 * Run this in browser console: window.clearAllDrafts()
 */

export function clearAllPlanogramDrafts() {
  const keys = Object.keys(localStorage);
  const draftKeys = keys.filter(key => key.startsWith('planogram-draft-'));
  
  console.log(`Found ${draftKeys.length} draft(s) to clear:`, draftKeys);
  
  draftKeys.forEach(key => {
    localStorage.removeItem(key);
    console.log(`✓ Cleared: ${key}`);
  });
  
  console.log('✅ All drafts cleared!');
  return draftKeys.length;
}

// Make it available globally in browser console
if (typeof window !== 'undefined') {
  (window as any).clearAllDrafts = clearAllPlanogramDrafts;
}
