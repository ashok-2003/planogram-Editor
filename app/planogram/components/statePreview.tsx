'use client';
import { usePlanogramStore } from '@/lib/store';
import { useState } from 'react';
import toast from 'react-hot-toast';

export function StatePreview() {
  const refrigerator = usePlanogramStore((state) => state.refrigerator);
  const [copied, setCopied] = useState(false);

  const formattedState = JSON.stringify(refrigerator, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedState);
      setCopied(true);
      toast.success('JSON copied to clipboard!');
      
      // Reset the copied state after 2 seconds
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
          <h4 className="text-lg font-semibold">Live State Preview (JSON)</h4>
        </div>
        
        {/* Copy Button */}
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-md transition-colors shadow-sm"
          title="Copy JSON to clipboard"
        >
          {copied ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </>
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
}
