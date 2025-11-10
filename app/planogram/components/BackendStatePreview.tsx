'use client';
import { usePlanogramStore } from '@/lib/store';
import { useMemo, useState, memo, useEffect, useCallback, useRef } from 'react';
import { Refrigerator } from '@/lib/types';
import { convertFrontendToBackend, scaleBackendBoundingBoxes } from '@/lib/backend-transform';
import { availableLayoutsData } from '@/lib/planogram-data';
import { toast } from 'sonner';
import { PIXEL_RATIO } from '@/lib/config';

export const BackendStatePreview = memo(function BackendStatePreview() {
  // OPTIMIZATION: Only subscribe to historyIndex to detect state changes
  // This prevents re-renders during drag operations (which don't change history)
  const historyIndex = usePlanogramStore((state) => state.historyIndex);
  const [copied, setCopied] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [backendData, setBackendData] = useState<any>(null);
  const [formattedState, setFormattedState] = useState<string>('');
  const calculationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // CRITICAL FIX: Get data within useMemo to avoid re-renders during drag
  // We only recalculate when historyIndex changes (actual commits)
  const { refrigerator, currentLayoutId } = useMemo(() => {
    const state = usePlanogramStore.getState();
    return {
      refrigerator: state.refrigerator,
      currentLayoutId: state.currentLayoutId
    };
  }, [historyIndex]);

  // --- LAZY CALCULATION: Only calculate when component is visible and data changes ---
  // Uses requestIdleCallback to avoid blocking main thread
  useEffect(() => {
    // Clear any pending calculation
    if (calculationTimeoutRef.current) {
      clearTimeout(calculationTimeoutRef.current);
    }

    // Debounce calculation to avoid unnecessary work during rapid changes
    calculationTimeoutRef.current = setTimeout(() => {
      setIsCalculating(true);
      
      // Use requestIdleCallback to run during idle time (non-blocking)
      const idleCallback = window.requestIdleCallback || ((cb) => setTimeout(cb, 1));
      
      idleCallback(() => {
        try {
          // Get dimensions from current layout
          const layoutId = currentLayoutId || 'g-26c';
          const layoutData = availableLayoutsData[layoutId];
          
          // Pass refrigerator state and dimensions to converter
          const unscaledData = convertFrontendToBackend(
            refrigerator as Refrigerator,
            layoutData?.width || 0,
            layoutData?.height || 0
          );
          
          // CRITICAL: Apply the pixel ratio scaling to match BoundingBoxScale
          // This scales all bounding boxes by PIXEL_RATIO (e.g., 3x)
          const scaledData = scaleBackendBoundingBoxes(unscaledData, PIXEL_RATIO);
          
          // Format JSON in idle time
          const formatted = JSON.stringify(scaledData, null, 2);
          
          setBackendData(scaledData);
          setFormattedState(formatted);
        } catch (error) {
          console.error('Error calculating backend data:', error);
          setFormattedState('Error calculating backend data');
        } finally {
          setIsCalculating(false);
        }
      });
    }, 150); // 150ms debounce - only calculate after user stops making changes

    return () => {
      if (calculationTimeoutRef.current) {
        clearTimeout(calculationTimeoutRef.current);
      }
    };
  }, [refrigerator, currentLayoutId]);
  const handleCopy = useCallback(async () => {
    if (!formattedState || isCalculating) {
      toast.error('Please wait for calculation to complete');
      return;
    }
    
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
  }, [formattedState, isCalculating]);
  return (
    <div className="bg-gray-200/70 rounded-lg shadow-inner mt-8">
      <div className="p-3 border-b border-gray-700 flex justify-between items-center">
        <div>
          <h4 className="text-lg font-semibold">Backend Format (Transformed & Scaled)</h4>
          <p className="text-xs text-gray-500 mt-1">
            Converted with bounding boxes scaled by {PIXEL_RATIO}x for ML/CV
            {isCalculating && <span className="ml-2 text-blue-600 font-semibold">⟳ Calculating...</span>}
          </p>
        </div>
        
        <button
          onClick={handleCopy}
          disabled={isCalculating || !formattedState}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-md transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
            {formattedState || 'Waiting for data...'}
          </code>
        </pre>
      </div>
    </div>
  );
});
