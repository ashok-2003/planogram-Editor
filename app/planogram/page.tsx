import { PlanogramEditor } from './components/planogramEditor';
import { getAvailableSkus, getInitialLayout, getAvailableLayouts } from '@/lib/planogram-data';

export default async function PlanogramPage() {
  // These functions run on the server to get the initial data.
  const availableSkus = await getAvailableSkus();
  const initialLayout = await getInitialLayout();
  const availableLayouts = await getAvailableLayouts(); // Fetch the new layout data

  return (
    <main className="w-full h-full">
        <div>
        <PlanogramEditor
          initialSkus={availableSkus}
          initialLayout={initialLayout}
          initialLayouts={availableLayouts} // Pass the new data as a prop
        />
      </div>
    </main>
  );
}