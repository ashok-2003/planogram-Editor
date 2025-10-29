'use client';
import React from 'react';

interface HorizontalRulerProps {
  widthMM: number;
  widthPx: number;
}

interface VerticalRulerProps {
  heightMM: number;
  heightPx: number;
}

interface ShelfHeightIndicatorProps {
  heightMM: number;
  rowId: string;
}

/**
 * Simple horizontal measurement label at the top
 */
export function HorizontalRuler({ widthMM, widthPx }: HorizontalRulerProps) {
  return (
    <div className="relative w-full h-8 bg-gray-100 border-b-2 border-gray-300 flex items-center justify-center">
      <div className="bg-blue-600 text-white px-4 py-1 rounded-md text-sm font-bold shadow-sm">
        Width: {widthMM}mm
      </div>
    </div>
  );
}

/**
 * Simple vertical measurement label on the left side
 */
export function VerticalRuler({ heightMM, heightPx }: VerticalRulerProps) {
  return (
    <div className="relative h-full w-20 bg-gray-100 border-r-2 border-gray-300 flex items-center justify-center">
      <div 
        className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm font-bold shadow-sm whitespace-nowrap transform -rotate-90"
        style={{ transformOrigin: 'center' }}
      >
        Height: {heightMM}mm
      </div>
    </div>
  );
}

/**
 * Simple shelf height label shown on the right side of each row
 */
export function ShelfHeightIndicator({ heightMM, rowId }: ShelfHeightIndicatorProps) {
  return (
    <div className="absolute right-2 top-2 bg-amber-500 text-white px-3 py-1 rounded-md text-sm font-bold shadow-md border-2 border-white z-20">
      {heightMM}mm
    </div>
  );
}

/**
 * Comprehensive measurement overlay for the entire refrigerator
 */
interface MeasurementOverlayProps {
  widthMM: number;
  widthPx: number;
  heightMM: number;
  heightPx: number;
  rows: Array<{ id: string; heightMM: number }>;
}

export function MeasurementOverlay({ widthMM, widthPx, heightMM, heightPx, rows }: MeasurementOverlayProps) {
  return (
    <div className="relative">
      {/* Top horizontal ruler */}
      <HorizontalRuler widthMM={widthMM} widthPx={widthPx} />
      
      <div className="flex">
        {/* Left vertical ruler */}
        <VerticalRuler heightMM={heightMM} heightPx={heightPx} />
        
        {/* Main content area with shelf indicators */}
        <div className="relative flex-1">
          {/* Content goes here (passed as children in parent component) */}
        </div>
      </div>
    </div>
  );
}
