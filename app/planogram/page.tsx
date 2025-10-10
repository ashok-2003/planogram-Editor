import { PlanogramEditor } from './components/planogramEditor';
import { getAvailableSkus, getInitialLayout, getAvailableLayouts } from '@/lib/planogram-data';

export default async function PlanogramPage() {
  // These functions run on the server to get the initial data.
  const availableSkus = await getAvailableSkus();
  const initialLayout = await getInitialLayout();
  const availableLayouts = await getAvailableLayouts(); // Fetch the new layout data

  return (
    <main className="bg-gray-100 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-screen-2xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Planogram Editor</h1>
          <p className="text-gray-600 mt-1">Drag, drop, and organize products in the refrigerator.</p>
        </header>
        
        <PlanogramEditor
          initialSkus={availableSkus}
          initialLayout={initialLayout}
          initialLayouts={availableLayouts} // Pass the new data as a prop
        />
      </div>
    </main>
  );
}