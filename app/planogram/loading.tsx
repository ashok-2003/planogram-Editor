import { PlanogramEditorSkeleton } from './components/Skeletons';

export default function Loading() {
  return (
    <main className="bg-gray-100 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-screen-2xl mx-auto">
        {/* Header Skeleton */}
        <header className="mb-6">
          <div className="h-8 w-48 bg-gray-300 rounded mb-2 animate-pulse" />
          <div className="h-4 w-96 bg-gray-200 rounded animate-pulse" />
        </header>
        
        {/* Main Content Skeleton */}
        <PlanogramEditorSkeleton />
      </div>
    </main>
  );
}
