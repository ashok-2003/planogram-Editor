import { PlanogramEditor } from './components/planogramEditor';
import { getAvailableSkus, getInitialLayout, getAvailableLayouts } from '@/lib/planogram-data';
import { Refrigerator } from '@/lib/types';

export default async function PlanogramPage() {
  // These functions run on the server to get the initial data.
  const availableSkus = await getAvailableSkus();
  const initialLayoutData = await getInitialLayout();
  const availableLayouts = await getAvailableLayouts(); // Fetch the new layout data

  // Extract the Refrigerator from LayoutData
  // Support both new (doors array) and legacy (top-level layout) formats
  let initialLayout: Refrigerator;
  
  if (initialLayoutData.layout) {
    // Legacy format: top-level layout property
    initialLayout = initialLayoutData.layout;
  } else if (initialLayoutData.doors && initialLayoutData.doors.length > 0) {
    // New format: doors array with layout inside first door
    const firstDoor = initialLayoutData.doors[0];
    if (!firstDoor.layout) {
      throw new Error('Initial layout data is missing from first door');
    }
    initialLayout = firstDoor.layout;
  } else {
    throw new Error('Initial layout data is missing - no layout or doors found');
  }

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