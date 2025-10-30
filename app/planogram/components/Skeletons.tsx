'use client';

import { motion } from 'framer-motion';

// Base shimmer effect for all skeletons
const shimmer = `relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent`;

// SKU Card Skeleton
export function SkuCardSkeleton() {
  return (
    <div className={`p-2 border rounded-md bg-gray-200 ${shimmer}`}>
      <div className="h-20 bg-gray-300 rounded mb-2" />
      <div className="h-3 bg-gray-300 rounded mb-1" />
      <div className="h-2 bg-gray-300 rounded w-2/3 mx-auto" />
    </div>
  );
}

// SKU Palette Skeleton
export function SkuPaletteSkeleton() {
  return (
    <aside className="max-h-screen overflow-hidden p-4 bg-gray-100 rounded-lg shadow-md w-full md:w-64 flex-shrink-0 flex flex-col">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between border-b pb-2 mb-3">
        <div className={`h-6 w-24 bg-gray-300 rounded ${shimmer}`} />
        <div className={`h-5 w-8 bg-gray-300 rounded-full ${shimmer}`} />
      </div>

      {/* Search Input Skeleton */}
      <div className={`mb-3 h-10 bg-gray-200 rounded-lg ${shimmer}`} />

      {/* Category Filter Skeleton */}
      <div className="mb-3">
        <div className={`h-3 w-16 bg-gray-300 rounded mb-1 ${shimmer}`} />
        <div className={`h-10 bg-gray-200 rounded-lg ${shimmer}`} />
      </div>

      {/* SKU Cards Skeleton */}
      <div className="flex-grow space-y-3 overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <SkuCardSkeleton key={i} />
        ))}
      </div>
    </aside>
  );
}

// Refrigerator Row Skeleton
function RefrigeratorRowSkeleton() {
  return (
    <div className={`border-2 border-gray-300 rounded-lg p-4 bg-gray-50 ${shimmer}`}>
      <div className="flex gap-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="w-16 h-24 bg-gray-300 rounded" />
        ))}
      </div>
    </div>
  );
}

// Refrigerator Skeleton
export function RefrigeratorSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className={`h-6 w-32 bg-gray-300 rounded mb-4 ${shimmer}`} />
      
      {/* Rows */}
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <RefrigeratorRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

// Info Panel Skeleton
export function InfoPanelSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Title */}
      <div className={`h-6 w-40 bg-gray-300 rounded mb-4 ${shimmer}`} />
      
      {/* Stats */}
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex justify-between">
            <div className={`h-4 w-24 bg-gray-300 rounded ${shimmer}`} />
            <div className={`h-4 w-12 bg-gray-300 rounded ${shimmer}`} />
          </div>
        ))}
      </div>

      {/* Preview Button */}
      <div className={`h-10 w-full bg-gray-300 rounded mt-6 ${shimmer}`} />
    </div>
  );
}

// Full Page Loading Skeleton
export function PlanogramEditorSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid grid-cols-1 lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_350px] gap-8"
    >
      {/* Left side: SKU Palette + Refrigerator */}
      <div className="flex flex-col md:flex-row gap-8 max-h-screen">
        <SkuPaletteSkeleton />
        <RefrigeratorSkeleton />
      </div>

      {/* Right side: Info Panel */}
      <div>
        <InfoPanelSkeleton />
      </div>
    </motion.div>
  );
}

// Inline Loading Spinner (for buttons, etc.)
export function Spinner({ size = 'md', color = 'blue' }: { size?: 'sm' | 'md' | 'lg'; color?: 'blue' | 'white' | 'gray' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const colorClasses = {
    blue: 'border-blue-600 border-t-transparent',
    white: 'border-white border-t-transparent',
    gray: 'border-gray-600 border-t-transparent',
  };

  return (
    <div
      className={`${sizeClasses[size]} border-2 ${colorClasses[color]} rounded-full animate-spin`}
      role="status"
      aria-label="Loading"
    />
  );
}

// Loading Overlay (for full-screen loading)
export function LoadingOverlay({ message = 'Loading...' }: { message?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    >
      <div className="bg-white rounded-lg p-8 flex flex-col items-center gap-4 shadow-2xl">
        <Spinner size="lg" color="blue" />
        <p className="text-gray-700 font-medium">{message}</p>
      </div>
    </motion.div>
  );
}

// Progressive Loading Wrapper
export function ProgressiveLoader({
  isLoading,
  children,
  skeleton,
  delay = 0,
}: {
  isLoading: boolean;
  children: React.ReactNode;
  skeleton: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
    >
      {isLoading ? skeleton : children}
    </motion.div>
  );
}
