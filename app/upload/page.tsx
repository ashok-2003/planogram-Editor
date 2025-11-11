'use client';

import { useState } from 'react';
import { PlanogramEditor } from '@/app/planogram/components/planogramEditor';
import { Spinner } from '@/app/planogram/components/Skeletons';
import { Button } from '@/components/ui/button';
import { Refrigerator, Sku, LayoutData } from '@/lib/types';
// Import the AI data type
import { convertBackendToFrontend, AIBackendData } from '@/lib/backend-to-frontend';
import { availableSkus } from '@/lib/planogram-data';
import { availableLayoutsData } from '@/lib/planogram-data';
import { toast } from 'sonner';
// Import Dialog components
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

// Helper component for the upload form (No changes)
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

// --- NEW: Layout Picker Dialog ---
function LayoutPicker({
    layouts,
    onSelectLayout,
    onCancel,
}: {
    layouts: Array<{ id: string; layout: LayoutData }>;
    onSelectLayout: (layout: LayoutData, layoutId: string) => void;
    onCancel: () => void;
}) {
    return (
        <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Multiple Layouts Found</DialogTitle>
                    <DialogDescription>
                        We found {layouts.length} layouts with the same number of shelves. Please choose the one that best matches your image.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-4 max-h-60 overflow-y-auto">
                    {layouts.map(({ id, layout }) => (
                        <Button
                            key={id}
                            variant="outline"
                            className="w-full justify-start h-auto"
                            onClick={() => onSelectLayout(layout, id)}
                        >
                            <div className="text-left">
                                <p className="font-semibold">{layout.name}</p>
                                <p className="text-xs text-gray-500">
                                    {Object.keys(layout.layout).length} Shelves | {layout.width}px wide
                                </p>
                            </div>
                        </Button>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}

// The main page component
export default function UploadPlanogramPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);    const [importedLayout, setImportedLayout] = useState<Refrigerator | null>(
        null
    );    const [detectedLayoutId, setDetectedLayoutId] = useState<string | null>(null); // <-- NEW: Store the detected layout ID

    // --- NEW STATE for layout picking ---
    const [aiData, setAiData] = useState<AIBackendData | null>(null);
    const [matchingLayouts, setMatchingLayouts] = useState<Array<{ id: string; layout: LayoutData }>>([]);
    const [showLayoutPicker, setShowLayoutPicker] = useState(false);/**
     * Finishes the conversion process once a layout is chosen.
     */
    const processConversion = (data: AIBackendData, chosenLayout: LayoutData, layoutId: string) => {
        toast.info(`Building planogram with ${chosenLayout.name}...`);
        try {
            // --- Step 3: Convert AI data to Frontend state ---
            const convertedLayout = convertBackendToFrontend(
                data,
                availableSkus,
                chosenLayout // Use the chosen layout
            );

            // --- Step 4: Set the state with our new layout AND the detected layout ID ---
            setImportedLayout(convertedLayout);
            setDetectedLayoutId(layoutId); // <-- Store the layout ID
            setIsLoading(false);

        } catch (err: any) {
            console.error(err);
            setError('Failed to convert AI data. ' + err.message);
            setIsLoading(false);
            toast.error('Failed to convert AI data.', { description: err.message });
        }
    };

    // --- THIS IS THE UPDATED UPLOAD HANDLER ---
    const handleUpload = async (file: File) => {
        setIsLoading(true);
        setError(null);
        setAiData(null);
        setMatchingLayouts([]);
        setShowLayoutPicker(false);
        toast.info('Uploading image...');

        try {
            // --- Step 1: Upload image to get URL ---
            const uploadHeaders = new Headers();
            uploadHeaders.append("accept", "application/json, text/plain, */*");
            uploadHeaders.append("authorization", "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ7XCJhZG1pbklkXCI6XCI5NWM0ZDZiNjJlMmM2MzlhODg0ZmFiM2NmMGQ2ZjI4MDM1NmI5OTE1NjFjMjUwMzczMWViNzk4MDJiNmY0NTZlOjc5YWM5ZDE2ZmU0NWNkZDg3YjdhM2E3MzE1YmVhYzlmXCIsXCJpZFwiOlwiZjFjNjg2YzU1YzhmZTBjMjk0NGNiYmFkZDFjZjUzZTc6NDg5M2U4Mjk2OTNhYjZiZDIzNTM2MTVjM2ExZjFhYTJcIn0iLCJpYXQiOjE3NjAzMzczNjEsImV4cCI6MTc5MTg3MzM2MSwidHlwZSI6ImFjY2VzcyJ9.BZ-lsCcGA0y_sQhl8rW0vOGSinj2uNIFwHTk6t6s5P0");
            uploadHeaders.append("ngrok-skip-browser-warning", "skip-browser-warning");

            const formdata = new FormData();
            formdata.append("images", file, file.name);

            const uploadRequestOptions = {
                method: "POST",
                headers: uploadHeaders,
                body: formdata,
                redirect: "follow" as RequestRedirect
            };

            const uploadResponse = await fetch("https://shelfscan-portal-backend-dev-1061052074258.us-central1.run.app/upload/bulk_images?folderName=clientUploads", uploadRequestOptions);

            if (!uploadResponse.ok) {
                throw new Error(`Image upload failed: ${uploadResponse.statusText}`);
            }

            const uploadResult = await uploadResponse.json();

            if (!uploadResult.status || !uploadResult.urls || uploadResult.urls.length === 0) {
                throw new Error('Image upload succeeded but did not return a valid URL.');
            }

            const imageUrl = uploadResult.urls[0];
            toast.success('Image uploaded! Sending to AI...');

            // --- Step 2: Call AI Backend with image URL ---
            const aiHeaders = new Headers();
            aiHeaders.append("Content-Type", "application/json");

            const aiBody = JSON.stringify({
                "image_url": imageUrl
            });

            const aiRequestOptions = {
                method: "POST",
                headers: aiHeaders,
                body: aiBody,
                redirect: "follow" as RequestRedirect
            };

            const aiResponse = await fetch("https://vbl-ai-backend-1061052074258.asia-south1.run.app/ShelfScenVBL", aiRequestOptions);

            if (!aiResponse.ok) {
                throw new Error(`AI processing failed: ${aiResponse.statusText}`);
            }

            const fetchedAiData = await aiResponse.json();

            // --- ADDED CONSOLE LOG ---
            console.log("--- AI Data Received ---", fetchedAiData);
            setAiData(fetchedAiData); // Store AI data in state            // --- NEW LAYOUT MATCHING LOGIC ---
            const shelfCount = fetchedAiData.Cooler?.["Door-1"]?.Sections?.length || 0;
            if (shelfCount === 0) {
                throw new Error("AI did not detect any shelves in the image.");
            }

            // Find matching layouts WITH their IDs
            const matches: Array<{ id: string; layout: LayoutData }> = Object.entries(availableLayoutsData)
                .filter(([_, layout]) => Object.keys(layout.layout).length === shelfCount)
                .map(([id, layout]) => ({ id, layout }));

            console.log(`[Layout Match] AI has ${shelfCount} shelves. Found ${matches.length} matching layouts.`);

            if (matches.length === 0) {
                toast.error(`No layout found with ${shelfCount} shelves.`, {
                    description: "Cannot build planogram. Please check the image or available layouts."
                });
                setIsLoading(false);
                return;
            }            if (matches.length === 1) {
                // Only one match, proceed automatically
                processConversion(fetchedAiData, matches[0].layout, matches[0].id);
            } else {
                // Multiple matches, ask the user - store matches with IDs
                setMatchingLayouts(matches);
                setShowLayoutPicker(true);
                setIsLoading(false); // Stop loading while user chooses
            }

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to generate planogram. Please try again.');
            setIsLoading(false);
            toast.error(err.message || 'Failed to generate planogram.');
        }
    };

    // --- Conditional Rendering ---    // Show editor *after* layout is successfully imported
    if (importedLayout) {
        return (
            <main className="w-full h-full">
                <div>
                    <PlanogramEditor
                        initialSkus={availableSkus}
                        initialLayout={availableLayoutsData['g-26c'].layout} // Base layout (will be overridden)
                        initialLayouts={availableLayoutsData}
                        importedLayout={importedLayout} // Pass the new layout as a prop
                        importedLayoutId={detectedLayoutId} // Pass the detected layout ID
                    />
                </div>
            </main>
        );
    }

    // Show layout picker dialog if needed
    if (showLayoutPicker && aiData) {
        return (
            <>
                {/* Show upload form greyed out in background */}
                <UploadForm onSubmit={handleUpload} isLoading={true} />
                {/* Show picker on top */}                <LayoutPicker
                    layouts={matchingLayouts}
                    onCancel={() => {
                        setShowLayoutPicker(false);
                        setAiData(null);
                        setMatchingLayouts([]);
                    }}
                    onSelectLayout={(layout, layoutId) => {
                        setShowLayoutPicker(false);
                        setIsLoading(true); // Show loader again
                        processConversion(aiData, layout, layoutId);
                    }}
                />
            </>
        );
    }

    // Otherwise, show the initial upload form
    return <UploadForm onSubmit={handleUpload} isLoading={isLoading} />;
}