'use client';
import { usePlanogramStore } from '@/lib/store';

export function StatePreview() {
  // Subscribe to the refrigerator state from the Zustand store
  const refrigerator = usePlanogramStore((state) => state.refrigerator);

  // Use a stable serialization to prevent unnecessary re-renders
  const formattedState = JSON.stringify(refrigerator, null, 2);

  return (
    <div className="bg-gray-900/70 rounded-lg shadow-inner mt-8">
      <div className="p-3 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white">Live State Preview (JSON)</h3>
        <p className="text-sm text-gray-400">This is the data to send to your backend.</p>
      </div>
      <div className="p-3">
        <pre className="text-xs text-green-300 overflow-auto h-96 bg-black/30 p-2 rounded">
          <code>
            {formattedState}
          </code>
        </pre>
      </div>
    </div>
  );
}
