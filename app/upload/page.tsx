'use client';

import { useState, useRef, useEffect, DragEvent } from 'react'; // Updated React imports
import { PlanogramEditor } from '@/app/planogram/components/planogramEditor';
// import { Spinner } from '@/app/planogram/components/Skeletons'; // No longer needed
import { Button } from '@/components/ui/button';
import { Refrigerator, Sku, LayoutData } from '@/lib/types';
// Import the AI data type
import {
    convertBackendToFrontend,
    AIBackendData,
} from '@/lib/backend-to-frontend';
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
} from '@/components/ui/dialog';

// --- NEW IMPORTS for Premium UI ---
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    // Image as ImageIcon, // Replaced with UploadCloud
    UploadCloud, // A more "SaaS" icon
    Sparkles, // A more "AI" icon
    X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// --- NEW: Loader State Type ---
type UploadStep = 'idle' | 'uploading' | 'processing' | 'complete';

// --- (Previous PremiumUploadLoader component removed, as it's now integrated) ---

// --- REFACTORED: UploadForm Component (Sophisticated Version) ---

// Helper map for loader text
const loaderTextMap: Record<UploadStep, string> = {
    idle: '',
    uploading: 'Uploading your image...',
    processing: 'Analyzing with AI...',
    complete: 'Generating planogram...',
};

function UploadForm({
    onSubmit,
    uploadStep, // Changed from isLoading
}: {
    onSubmit: (file: File) => void;
    uploadStep: UploadStep; // Use the new type
}) {
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isLoading = uploadStep !== 'idle';
    const currentLoaderText = loaderTextMap[uploadStep];

    // Clean up object URL to prevent memory leaks
    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const handleFileSelect = (selectedFile: File | undefined | null) => {
        if (!selectedFile || isLoading) return;

        // Revoke old URL if one exists
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }

        // Check if it's an image
        if (!selectedFile.type.startsWith('image/')) {
            toast.error('Invalid file type. Please upload an image.');
            setFile(null);
            setPreviewUrl(null);
            return;
        }

        setFile(selectedFile);
        setPreviewUrl(URL.createObjectURL(selectedFile));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleFileSelect(e.target.files?.[0]);
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (isLoading) return;
        handleFileSelect(e.dataTransfer.files?.[0]);
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (isLoading) return;
        setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const removeFile = () => {
        if (isLoading) return;
        setFile(null);
        setPreviewUrl(null); // This will trigger the useEffect cleanup
        if (fileInputRef.current) {
            fileInputRef.current.value = ''; // Reset the input field
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
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <Card
                className={cn(
                    'max-w-md w-full rounded-2xl shadow-2xl transition-all',
                    // More pronounced "A-tier" drag-over effect
                    isDragging &&
                    !isLoading &&
                    'ring-2 ring-blue-500 ring-offset-2 shadow-blue-500/20'
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold text-gray-800">
                        Generate Planogram from Image
                    </CardTitle>
                    <CardDescription className="text-gray-600 leading-relaxed pt-2">
                        Upload an image, and our AI will generate a planogram for you.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* This is the main container that switches states */}
                        <div
                            className={cn(
                                // --- THIS IS THE FIX ---
                                'group relative w-full h-64 rounded-lg border border-gray-200 bg-white overflow-hidden transition-all', // <-- Added 'group'
                                isDragging && !isLoading && 'bg-gray-50'
                            )}
                        >
                            {/* State 1: Loading (Overlay on top of preview) */}
                            {isLoading && (
                                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center space-y-3 bg-white/80 backdrop-blur-sm  overflow-hidden">
                                    {/* --- Shimmer Element --- */}
                                    <div className="animate-shimmer absolute top-0 left-0 h-full w-1/2 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-75"></div>

                                    {/* Content (needs to be above the shimmer) */}
                                    <div className="relative z-10 flex flex-col items-center justify-center space-y-3">
                                        <Sparkles className="h-10 w-10 text-gray-800 animate-pulse" />
                                        <p className="font-medium text-lg text-gray-700">
                                            {currentLoaderText}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* State 2: Image Preview */}
                            {previewUrl ? (
                                <>
                                    <img
                                        src={previewUrl}
                                        alt="Selected preview"
                                        className={cn(
                                            'w-full h-full object-contain',
                                            isLoading && 'blur-[2px] opacity-70' // Subtly blur image behind loader
                                        )}
                                    />
                                    {!isLoading && (
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="icon"
                                            className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity z-10" // Added z-10
                                            onClick={removeFile}
                                            disabled={isLoading}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </>
                            ) : (
                                /* State 3: Empty Dropzone */
                                <div
                                    className="flex flex-col items-center justify-center h-full text-center cursor-pointer p-8"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <UploadCloud className="h-12 w-12 text-gray-400 mb-4" />
                                    <p className="font-semibold text-gray-700">
                                        Click to upload or drag and drop
                                    </p>
                                    <p className="text-sm text-gray-500">PNG, JPG, or JPEG</p>
                                </div>
                            )}
                        </div>

                        <Input
                            ref={fileInputRef}
                            type="file"
                            onChange={handleFileChange}
                            accept="image/png, image/jpeg"
                            className="hidden"
                            disabled={isLoading}
                        />

                        <Button
                            type="submit"
                            className="w-full text-lg"
                            disabled={isLoading || !file}
                        >
                            {isLoading ? 'Processing...' : 'Generate Planogram'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

// --- NEW: Layout Picker Dialog (Unchanged) ---
function LayoutPicker({
    layouts,
    onSelectLayout,
    onCancel,
    isNoMatch = false,
    detectedShelfCount,
}: {
    layouts: Array<{ id: string; layout: LayoutData }>;
    onSelectLayout: (layout: LayoutData, layoutId: string) => void;
    onCancel: () => void;
    isNoMatch?: boolean;
    detectedShelfCount?: number;
}) {
    return (
        <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {isNoMatch
                            ? '⚠️ No Matching Cooler Configuration'
                            : 'Multiple Layouts Found'}
                    </DialogTitle>
                    <DialogDescription>
                        {isNoMatch ? (
                            <>
                                Your image has <strong>{detectedShelfCount} shelves</strong>, but
                                we don't have a cooler configuration that matches. Please choose
                                a cooler model to continue. The AI-detected products will be
                                placed accordingly.
                            </>
                        ) : (
                            `We found ${layouts.length} layouts with the same number of shelves. Please choose the one that best matches your image.`
                        )}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-4 max-h-60 overflow-y-auto">
                    {layouts.map(({ id, layout }) => (                        <Button
                            key={id}
                            variant={isNoMatch && id === 'g-26c' ? 'default' : 'outline'}
                            className="w-full justify-start h-auto"
                            onClick={() => onSelectLayout(layout, id)}
                        >
                            <div className="text-left">
                                <p className="font-semibold">
                                    {layout.name}
                                    {isNoMatch && id === 'g-26c' && ' (Recommended)'}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {layout.layout ? Object.keys(layout.layout).length : 0} Shelves | {layout.width}px
                                    wide
                                </p>
                            </div>
                        </Button>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}

// --- UPDATED: Main Page Component ---
export default function UploadPlanogramPage() {
    // const [isLoading, setIsLoading] = useState(false); // <-- REPLACED
    const [uploadStep, setUploadStep] = useState<UploadStep>('idle'); // <-- NEW STATE
    const [error, setError] = useState<string | null>(null);
    const [importedLayout, setImportedLayout] = useState<Refrigerator | null>(
        null
    );
    const [detectedLayoutId, setDetectedLayoutId] = useState<string | null>(null); // <-- NEW: Store the detected layout ID

    // --- NEW STATE for layout picking ---
    const [aiData, setAiData] = useState<AIBackendData | null>(null);
    const [matchingLayouts, setMatchingLayouts] = useState<
        Array<{ id: string; layout: LayoutData }>
    >([]);
    const [showLayoutPicker, setShowLayoutPicker] = useState(false);
    const [detectedShelfCount, setDetectedShelfCount] = useState<number>(0);
    const [isNoMatchScenario, setIsNoMatchScenario] = useState(false);
    /**
     * Finishes the conversion process once a layout is chosen.
     */
    const processConversion = (
        data: AIBackendData,
        chosenLayout: LayoutData,
        layoutId: string
    ) => {
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
            // setIsLoading(false); // <-- REPLACED
            setUploadStep('idle'); // <-- NEW
        } catch (err: any) {
            console.error(err);
            setError('Failed to convert AI data. ' + err.message);
            // setIsLoading(false); // <-- REPLACED
            setUploadStep('idle'); // <-- NEW
            toast.error('Failed to convert AI data.', { description: err.message });
        }
    };

    // --- THIS IS THE UPDATED UPLOAD HANDLER ---
    const handleUpload = async (file: File) => {
        // setIsLoading(true); // <-- REPLACED
        setUploadStep('uploading'); // <-- NEW
        setError(null);
        setAiData(null);
        setMatchingLayouts([]);
        setShowLayoutPicker(false);
        toast.info('Uploading image...');

        try {
            // --- Step 1: Upload image to get URL ---
            const uploadHeaders = new Headers();
            uploadHeaders.append('accept', 'application/json, text/plain, */*');
            uploadHeaders.append(
                'authorization',
                'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ7XCJhZG1pbklkXCI6XCI5NWM0ZDZiNjJlMmM2MzlhODg0ZmFiM2NmMGQ2ZjI4MDM1NmI5OTE1NjFjMjUwMzczMWViNzk4MDJiNmY0NTZlOjc5YWM5ZDE2ZmU0NWNkZDg3YjdhM2E3MzE1YmVhYzlmXCIsXCJpZFwiOlwiZjFjNjg2YzU1YzhmZTBjMjk0NGNiYmFkZDFjZjUzZTc6NDg5M2U4Mjk2OTNhYjZiZDIzNTM2MTVjM2ExZjFhYTJcIn0iLCJpYXQiOjE3NjAzMzczNjEsImV4cCI6MTc5MTg3MzM2MSwidHlwZSI6ImFjY2VzcyJ9.BZ-lsCcGA0y_sQhl8rW0vOGSinj2uNIFwHTk6t6s5P0'
            );
            uploadHeaders.append(
                'ngrok-skip-browser-warning',
                'skip-browser-warning'
            );

            const formdata = new FormData();
            formdata.append('images', file, file.name);

            const uploadRequestOptions = {
                method: 'POST',
                headers: uploadHeaders,
                body: formdata,
                redirect: 'follow' as RequestRedirect,
            };

            const uploadResponse = await fetch(
                'https://shelfscan-portal-backend-dev-1061052074258.us-central1.run.app/upload/bulk_images?folderName=clientUploads',
                uploadRequestOptions
            );

            if (!uploadResponse.ok) {
                throw new Error(`Image upload failed: ${uploadResponse.statusText}`);
            }

            const uploadResult = await uploadResponse.json();

            if (
                !uploadResult.status ||
                !uploadResult.urls ||
                uploadResult.urls.length === 0
            ) {
                throw new Error(
                    'Image upload succeeded but did not return a valid URL.'
                );
            }

            const imageUrl = uploadResult.urls[0];
            setUploadStep('processing'); // <-- NEW: Move to next step
            toast.success('Image uploaded! Sending to AI...');

            // --- Step 2: Call AI Backend with image URL ---
            const aiHeaders = new Headers();
            aiHeaders.append('Content-Type', 'application/json');

            const aiBody = JSON.stringify({
                image_url: imageUrl,
            });

            const aiRequestOptions = {
                method: 'POST',
                headers: aiHeaders,
                body: aiBody,
                redirect: 'follow' as RequestRedirect,
            };

            const aiResponse = await fetch(
                'https://vbl-ai-backend-1061052074258.asia-south1.run.app/ShelfScenVBL',
                aiRequestOptions
            );

            if (!aiResponse.ok) {
                throw new Error(`AI processing failed: ${aiResponse.statusText}`);
            }

            const fetchedAiData = await aiResponse.json();

            setUploadStep('complete'); // <-- NEW: Move to final step
            toast.info('AI processing complete! Matching layout...');

            // --- ADDED CONSOLE LOG ---
            console.log('--- AI Data Received ---', fetchedAiData);
            setAiData(fetchedAiData); // Store AI data in state
            // --- NEW LAYOUT MATCHING LOGIC ---
            const shelfCount =
                fetchedAiData.Cooler?.['Door-1']?.Sections?.length || 0;
            if (shelfCount === 0) {
                throw new Error('AI did not detect any shelves in the image.');
            }

            setDetectedShelfCount(shelfCount);            // Find matching layouts WITH their IDs
            const matches: Array<{ id: string; layout: LayoutData }> = Object.entries(
                availableLayoutsData
            )
                .filter(([_, layout]) => layout.layout && Object.keys(layout.layout).length === shelfCount)
                .map(([id, layout]) => ({ id, layout }));

            console.log(
                `[Layout Match] AI has ${shelfCount} shelves. Found ${matches.length} matching layouts.`
            );

            if (matches.length === 0) {
                // NO MATCH: Show all layouts and let user choose
                const allLayouts = Object.entries(availableLayoutsData).map(
                    ([id, layout]) => ({ id, layout })
                );

                toast.warning(`No cooler configuration matches ${shelfCount} shelves.`, {
                    description: 'Please choose a cooler model to continue.',
                });

                setMatchingLayouts(allLayouts);
                setIsNoMatchScenario(true);
                setShowLayoutPicker(true);
                // setIsLoading(false); // <-- REPLACED
                setUploadStep('idle'); // <-- NEW
                return;
            }

            if (matches.length === 1) {
                // Only one match, proceed automatically
                processConversion(fetchedAiData, matches[0].layout, matches[0].id);
            } else {
                // Multiple matches, ask the user - store matches with IDs
                setMatchingLayouts(matches);
                setIsNoMatchScenario(false);
                setShowLayoutPicker(true);
                // setIsLoading(false); // <-- REPLACED
                setUploadStep('idle'); // <-- NEW: Stop loading while user chooses
            }
        } catch (err: any) {
            console.error(err);
            setError(
                err.message || 'Failed to generate planogram. Please try again.'
            );
            // setIsLoading(false); // <-- REPLACED
            setUploadStep('idle'); // <-- NEW
            toast.error(err.message || 'Failed to generate planogram.');
        }
    };    // --- Conditional Rendering ---
    // Show editor *after* layout is successfully imported
    if (importedLayout) {
        const defaultLayout = availableLayoutsData['g-26c'].layout;
        if (!defaultLayout) {
            toast.error('Default layout not found');
            return null;
        }
        
        return (
            <main className="w-full h-full">
                <div>
                    <PlanogramEditor
                        initialSkus={availableSkus}
                        initialLayout={defaultLayout} // Base layout (will be overridden)
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
                <UploadForm onSubmit={handleUpload} uploadStep={uploadStep} />
                {/* Show picker on top */}
                <LayoutPicker
                    layouts={matchingLayouts}
                    isNoMatch={isNoMatchScenario}
                    detectedShelfCount={detectedShelfCount}
                    onCancel={() => {
                        setShowLayoutPicker(false);
                        setAiData(null);
                        setMatchingLayouts([]);
                        setIsNoMatchScenario(false);
                    }}
                    onSelectLayout={(layout, layoutId) => {
                        setShowLayoutPicker(false);
                        // setIsLoading(true); // <-- REPLACED
                        setUploadStep('complete'); // <-- NEW: Show final loading step
                        processConversion(aiData, layout, layoutId);
                    }}
                />
            </>
        );
    }

    // Otherwise, show the initial upload form
    return <UploadForm onSubmit={handleUpload} uploadStep={uploadStep} />;
}