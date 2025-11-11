'use client';

import { useState } from 'react';
import { PlanogramEditor } from '@/app/planogram/components/planogramEditor';
import { Spinner } from '@/app/planogram/components/Skeletons';
import { Button } from '@/components/ui/button';
import { Refrigerator, Sku, LayoutData } from '@/lib/types';
import { convertBackendToFrontend } from '@/lib/backend-to-frontend'; // 1. Import our new converter
import { availableSkus } from '@/lib/planogram-data'; // 2. Import Sku data
import { availableLayoutsData } from '@/lib/planogram-data'; // 3. Import layout data
import { toast } from 'sonner';

// Helper component for the upload form
function UploadForm({
    onSubmit,
    isLoading,
}: {
    onSubmit: (file: File) => void;
    isLoading: boolean;
}) {
    const [file, setFile] = useState<File | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (file) {
            onSubmit(file);
        } else {
            toast.error('Please select an image file first.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
                <h1 className="text-2xl font-bold text-gray-800 mb-4">
                    Generate Planogram from Image
                </h1>
                <p className="text-gray-600 mb-6 leading-relaxed">
                    Upload an image of a refrigerator, and our AI will automatically
                    generate a planogram for you.
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <input
                        type="file"
                        onChange={handleFileChange}
                        accept="image/png, image/jpeg"
                        className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100
            "
                        disabled={isLoading}
                    />
                    <Button
                        type="submit"
                        className="w-full text-lg"
                        disabled={isLoading || !file}
                    >
                        {isLoading ? (
                            <Spinner size="md" color="white" />
                        ) : (
                            'Generate Planogram'
                        )}
                    </Button>
                </form>
            </div>
        </div>
    );
}

// The main page component
export default function UploadPlanogramPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 4. This state will hold our converted data
    const [importedLayout, setImportedLayout] = useState<Refrigerator | null>(
        null
    );

    const handleUpload = async (file: File) => {
        setIsLoading(true);
        setError(null);

        try {
            // --- Step 1: Upload image to get URL ---
            // This is the first API call you described
            const formData = new FormData();
            formData.append('images', file);

            // We'll use a mock response for now, as we can't call the real API
            // const uploadResponse = await fetch("https://shelfscan-portal-backend-dev-1061052074258.us-central1.run.app/upload/bulk_images?folderName=clientUploads", {
            //   method: "POST",
            //   body: formData,
            //   // Add your headers here
            // });
            // const uploadResult = await uploadResponse.json();
            // const imageUrl = uploadResult.url; // Assuming this is the response format

            // MOCK IMAGE URL
            await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate network delay
            const imageUrl =
                'https://storage.googleapis.com/shelfex-cdn/shelfscan/dev/03/clientUploads/29_1762863693846_03_01_01_TROPADM_1762863692462_01PNG.png';
            toast.success('Image uploaded successfully!');

            // --- Step 2: Call AI Backend with image URL ---
            // This is the second API call
            // const aiResponse = await fetch("https://vbl-ai-backend-1061052074258.asia-south1.run.app/ShelfScenVBL", {
            //   method: "POST",
            //   headers: { "Content-Type": "application/json" },
            //   body: JSON.stringify({ image_url: imageUrl }),
            // });
            // const aiData = await aiResponse.json();

            // MOCK AI RESPONSE
            await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate AI processing
            const aiData = { /* ... (pasting your example AI JSON here) ... */
                "Cooler": {
                    "Door-1": {
                        "Sections": [
                            { "products": [/*...shelf 1 products...*/], "data": [], "position": 1 },
                            { "products": [/*...shelf 2 products...*/], "data": [], "position": 2 },
                            // ...etc
                        ],
                        "Door-Visible": false
                    }
                }
            }; // A mock of the AI JSON
            toast.success('AI conversion complete!');

            // --- Step 3: Convert AI data to Frontend state ---
            // 5. This is where we use our new function
            const convertedLayout = convertBackendToFrontend(
                aiData,
                availableSkus,
                availableLayoutsData
            );

            // 6. Set the state with our new layout
            setImportedLayout(convertedLayout);
            setIsLoading(false);

        } catch (err) {
            console.error(err);
            setError('Failed to generate planogram. Please try again.');
            setIsLoading(false);
            toast.error('Failed to generate planogram.');
        }
    };

    // --- Conditional Rendering ---

    if (importedLayout) {
        // 7. If layout is loaded, show the editor with the imported data
        return (
            <main className="w-full h-full">
                <div>
                    <PlanogramEditor
                        initialSkus={availableSkus}
                        initialLayout={availableLayoutsData['g-26c'].layout} // Base layout
                        initialLayouts={availableLayoutsData}
                        importedLayout={importedLayout} // 8. Pass the new layout as a prop
                    />
                </div>
            </main>
        );
    }

    // 9. Otherwise, show the upload form
    return <UploadForm onSubmit={handleUpload} isLoading={isLoading} />;
}