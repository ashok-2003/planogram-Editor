'use client';
import { usePlanogramStore } from '@/lib/store';
import { useMemo, useState, memo } from 'react';
import { Refrigerator } from '@/lib/types';
import { convertFrontendToBackend } from '@/lib/backend-transform';
import { availableLayoutsData } from '@/lib/planogram-data';
import { toast } from 'sonner';

export const BackendStatePreview = memo(function BackendStatePreview() {
  // OPTIMIZATION: Only subscribe to historyIndex to detect state changes
  // This prevents re-renders during drag operations (which don't change history)
  const historyIndex = usePlanogramStore((state) => state.historyIndex);
  const [copied, setCopied] = useState(false);
  
  // CRITICAL FIX: Get data within useMemo to avoid re-renders during drag
  // We only recalculate when historyIndex changes (actual commits)
  const { refrigerator, currentLayoutId } = useMemo(() => {
    const state = usePlanogramStore.getState();
    return {
      refrigerator: state.refrigerator,
      currentLayoutId: state.currentLayoutId
    };
  }, [historyIndex]);

  // --- CONVERT THE DATA WITH BOUNDING BOXES ---
  const backendData = useMemo(() => {
    // Get dimensions from current layout
    const layoutId = currentLayoutId || 'g-26c'; // Default to g-26c
    const layoutData = availableLayoutsData[layoutId];
    
    // Pass refrigerator state and dimensions to converter
    return convertFrontendToBackend(
      refrigerator as Refrigerator,
      layoutData?.width || 0,
      layoutData?.height || 0
    ); 
  }, [refrigerator, currentLayoutId]);

  // 'formattedState' is now the JSON of the *converted* backend data
  const formattedState = JSON.stringify(backendData, null, 2);

  const handleCopy = async () => {
    try {
      // This will now copy the converted JSON
      await navigator.clipboard.writeText(formattedState);
      setCopied(true);
      toast.success('Backend JSON copied to clipboard!');
      
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      toast.error('Failed to copy JSON');
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="bg-gray-200/70 rounded-lg shadow-inner mt-8">
      <div className="p-3 border-b border-gray-700 flex justify-between items-center">
        <div>
          <h4 className="text-lg font-semibold">Backend Format (Transformed)</h4>
          <p className="text-xs text-gray-500 mt-1">
            Converted with bounding boxes for ML/CV
          </p>
        </div>
        
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-md transition-colors shadow-sm"
          title="Copy Backend JSON to clipboard"
        >
          {copied ? (
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
             </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>
      </div>
        <div className="p-3">
        <pre className="text-xs text-green-300 overflow-auto h-96 bg-black/80 p-2 rounded">
          <code>
            {formattedState}
          </code>
        </pre>
      </div>
    </div>
  );
});
