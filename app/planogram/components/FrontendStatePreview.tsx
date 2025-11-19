'use client';
import { usePlanogramStore } from '@/lib/store';
import { useMemo, useState, memo, useEffect, useRef } from 'react';
import { toast } from 'sonner';

export const FrontendStatePreview = memo(function FrontendStatePreview() {
  // Subscribe to both historyIndex AND currentLayoutId to detect state changes
  const historyIndex = usePlanogramStore((state) => state.historyIndex);
  const currentLayoutId = usePlanogramStore((state) => state.currentLayoutId);
  const isMultiDoor = usePlanogramStore((state) => state.isMultiDoor);
  const [copied, setCopied] = useState(false);
  const [formattedState, setFormattedState] = useState<string>('');
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Get the refrigerators (multi-door) data - recalculates when state changes
  const refrigerators = useMemo(() => {
    return usePlanogramStore.getState().refrigerators;
  }, [historyIndex, currentLayoutId]);

  // --- DEBOUNCED UPDATE: Format state after changes settle ---
  useEffect(() => {
    // Clear any pending update
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    // Debounce formatting to avoid unnecessary work during rapid changes
    updateTimeoutRef.current = setTimeout(() => {
      const state = usePlanogramStore.getState();
      
      // Build clean frontend state object - only show relevant data
      const frontendState = {
        // Always show refrigerators (the current multi-door structure)
        refrigerators: state.refrigerators,
        
        // Metadata
        isMultiDoor: state.isMultiDoor,
        currentLayoutId: state.currentLayoutId,
        
        // History info
        historyIndex: state.historyIndex,
        historyLength: state.history.length,
      };
      
      // Format JSON
      const formatted = JSON.stringify(frontendState, null, 2);
      setFormattedState(formatted);
    }, 100); // 100ms debounce

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [historyIndex, currentLayoutId, refrigerators]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedState);
      setCopied(true);
      toast.success('Frontend state copied to clipboard!');
      
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
          <h4 className="text-lg font-semibold">Frontend State (Store Data)</h4>
          <p className="text-xs text-gray-500 mt-1">
            Raw data from Zustand store
          </p>
        </div>
        
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-md transition-colors shadow-sm"
          title="Copy Frontend State to clipboard"
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
        <pre className="text-xs text-blue-300 overflow-auto h-96 bg-black/80 p-2 rounded">
          <code>
            {formattedState}
          </code>
        </pre>
      </div>
    </div>
  );
});
