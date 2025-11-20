'use client';

import { useState, useRef, useEffect, DragEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Refrigerator, LayoutData, MultiDoorRefrigerator } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { usePlanogramStore } from '@/lib/store';

// Import the AI data type
import {
    convertBackendToFrontend,
    convertMultiDoorBackendToFrontend,
    isMultiDoorAIData,
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

// --- UI Components ---
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    UploadCloud,
    Sparkles,
    X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// --- Loader State Type ---
type UploadStep = 'idle' | 'uploading' | 'processing' | 'complete';

// --- NEW HELPER: Calculate total shelves for a layout ---
// This handles both single-door and multi-door layouts dynamically
const getLayoutShelfCount = (layout: LayoutData): number => {
    if (layout.doors && layout.doors.length > 0) {
        // Multi-door: sum shelves across all doors
        return layout.doors.reduce((sum, door) => {
            return sum + (door.layout ? Object.keys(door.layout).length : 0);
        }, 0);
    } else if (layout.layout) {
        // Single-door: count rows in layout
        return Object.keys(layout.layout).length;
    }
    return 0;
};

// --- REFACTORED: UploadForm Component ---

const loaderTextMap: Record<UploadStep, string> = {
    idle: '',
    uploading: 'Uploading your image...',
    processing: 'Analyzing with AI...',
    complete: 'Generating planogram...',
};

function UploadForm({
    onSubmit,
    uploadStep,
}: {
    onSubmit: (file: File) => void;
    uploadStep: UploadStep;
}) {
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isLoading = uploadStep !== 'idle';
    const currentLoaderText = loaderTextMap[uploadStep];

    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const handleFileSelect = (selectedFile: File | undefined | null) => {
        if (!selectedFile || isLoading) return;

        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }

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
        setPreviewUrl(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
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
                        <div
                            className={cn(
                                'group relative w-full h-64 rounded-lg border border-gray-200 bg-white overflow-hidden transition-all',
                                isDragging && !isLoading && 'bg-gray-50'
                            )}
                        >
                            {isLoading && (
                                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center space-y-3 bg-white/80 backdrop-blur-sm  overflow-hidden">
                                    <div className="animate-shimmer absolute top-0 left-0 h-full w-1/2 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-75"></div>
                                    <div className="relative z-10 flex flex-col items-center justify-center space-y-3">
                                        <Sparkles className="h-10 w-10 text-gray-800 animate-pulse" />
                                        <p className="font-medium text-lg text-gray-700">
                                            {currentLoaderText}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {previewUrl ? (
                                <>
                                    <img
                                        src={previewUrl}
                                        alt="Selected preview"
                                        className={cn(
                                            'w-full h-full object-contain',
                                            isLoading && 'blur-[2px] opacity-70'
                                        )}
                                    />
                                    {!isLoading && (
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="icon"
                                            className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                            onClick={removeFile}
                                            disabled={isLoading}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </>
                            ) : (
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

// --- UPDATED: Layout Picker Dialog ---
function LayoutPicker({
    layouts,
    onSelectLayout,
    onCancel,
    isNoMatch = false,
    detectedShelfCount,
    recommendedLayoutId, // <--- NEW PROP: Receives the dynamic recommendation
}: {
    layouts: Array<{ id: string; layout: LayoutData }>;
    onSelectLayout: (layout: LayoutData, layoutId: string) => void;
    onCancel: () => void;
    isNoMatch?: boolean;
    detectedShelfCount?: number;
    recommendedLayoutId?: string | null; // <--- Typed here
}) {
    return (
        <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {isNoMatch
                            ? '⚠️ No Exact Match Found'
                            : 'Multiple Layouts Found'}
                    </DialogTitle>
                    <DialogDescription>
                        {isNoMatch ? (
                            <>
                                Your image has <strong>{detectedShelfCount} shelves</strong>, but
                                we don't have an exact match.
                                <br />
                                We recommended the closest available layout below.
                            </>
                        ) : (
                            `We found ${layouts.length} layouts with the same number of shelves. Please choose the one that best matches your image.`
                        )}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-4 max-h-60 overflow-y-auto">
                    {layouts.map(({ id, layout }) => {
                        // Check if this specific item is the recommended one
                        const isRecommended = recommendedLayoutId === id;

                        return (
                            <Button
                                key={id}
                                // If this is the recommended one, highlight it (default variant), else outline
                                variant={isRecommended ? 'default' : 'outline'}
                                className={cn(
                                    "w-full justify-start h-auto",
                                    // Add a subtle ring if recommended to make it pop
                                    isRecommended && "ring-2 ring-offset-2 ring-blue-500"
                                )}
                                onClick={() => onSelectLayout(layout, id)}
                            >
                                <div className="text-left w-full">
                                    <div className="flex justify-between items-center">
                                        <p className="font-semibold">
                                            {layout.name}
                                        </p>
                                        {isRecommended && (
                                            <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                                                Recommended
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {(() => {
                                            // Use the helper for consistency
                                            const shelfCount = getLayoutShelfCount(layout);

                                            let widthInfo = 'Unknown';
                                            let doorCount = 1;

                                            if (layout.doors && layout.doors.length > 0) {
                                                doorCount = layout.doors.length;
                                                const totalWidth = layout.doors.reduce((sum, door) => {
                                                    return sum + (door.width || 0);
                                                }, 0);
                                                widthInfo = totalWidth > 0 ? `${totalWidth}px` : (layout.width ? `${layout.width}px` : 'Unknown');
                                            } else if (layout.layout) {
                                                widthInfo = layout.width ? `${layout.width}px` : 'Unknown';
                                            }

                                            const doorInfo = doorCount > 1 ? ` | ${doorCount} Doors` : '';
                                            return `${shelfCount} Shelves${doorInfo} | ${widthInfo} wide`;
                                        })()}
                                    </p>
                                </div>
                            </Button>
                        );
                    })}
                </div>
            </DialogContent>
        </Dialog>
    );
}

// --- UPDATED: Main Page Component ---
export default function UploadPlanogramPage() {
    const router = useRouter();
    const { actions } = usePlanogramStore();

    const [uploadStep, setUploadStep] = useState<UploadStep>('idle');
    const [error, setError] = useState<string | null>(null);

    // State for layout picking
    const [aiData, setAiData] = useState<AIBackendData | null>(null);
    const [matchingLayouts, setMatchingLayouts] = useState<
        Array<{ id: string; layout: LayoutData }>
    >([]);
    const [showLayoutPicker, setShowLayoutPicker] = useState(false);
    const [detectedShelfCount, setDetectedShelfCount] = useState<number>(0);
    const [isNoMatchScenario, setIsNoMatchScenario] = useState(false);

    // NEW STATE: Store the ID of the closest match
    const [recommendedLayoutId, setRecommendedLayoutId] = useState<string | null>(null);

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
            const isMultiDoorData = isMultiDoorAIData(data);
            let layoutToStore;

            if (isMultiDoorData) {
                console.log('[Upload] Multi-door AI data detected, using multi-door converter');

                if (!chosenLayout.doors || chosenLayout.doors.length === 0) {
                    throw new Error('Selected layout does not support multi-door configuration');
                }

                layoutToStore = convertMultiDoorBackendToFrontend(
                    data,
                    availableSkus,
                    chosenLayout
                );
            } else {
                console.log('[Upload] Single-door AI data detected, using single-door converter');

                layoutToStore = convertBackendToFrontend(
                    data,
                    availableSkus,
                    chosenLayout
                );
            }

            // Save to store and navigate
            actions.setPendingImport({
                layoutId: layoutId,
                layout: layoutToStore,
                layoutData: chosenLayout
            });

            setUploadStep('idle');
            toast.success("Planogram generated! Redirecting...");
            router.push('/planogram');

        } catch (err: any) {
            console.error(err);
            setError('Failed to convert AI data. ' + err.message);
            setUploadStep('idle');
            toast.error('Failed to convert AI data.', { description: err.message });
        }
    };

    const handleUpload = async (file: File) => {
        setUploadStep('uploading');
        setError(null);
        setAiData(null);
        setMatchingLayouts([]);
        setShowLayoutPicker(false);
        setRecommendedLayoutId(null); // Reset recommendation
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
            setUploadStep('processing');
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

            setUploadStep('complete');
            toast.info('AI processing complete! Matching layout...');
            console.log('--- AI Data Received ---', fetchedAiData);
            setAiData(fetchedAiData);

            // --- Step 3: Determine Shelf Count ---
            const isMultiDoorData = isMultiDoorAIData(fetchedAiData);
            let totalShelfCount = 0;

            if (isMultiDoorData) {
                const door1Count = fetchedAiData.Cooler?.['Door-1']?.Sections?.length || 0;
                const door2Count = fetchedAiData.Cooler?.['Door-2']?.Sections?.length || 0;
                totalShelfCount = door1Count + door2Count;
                console.log(`[Layout Match] Multi-door detected: Total: ${totalShelfCount}`);
            } else {
                totalShelfCount = fetchedAiData.Cooler?.['Door-1']?.Sections?.length || 0;
                console.log(`[Layout Match] Single-door detected: ${totalShelfCount} shelves`);
            }

            if (totalShelfCount === 0) {
                throw new Error('AI did not detect any shelves in the image.');
            }

            setDetectedShelfCount(totalShelfCount);

            // --- Step 4: Filter Exact Matches ---
            const matches: Array<{ id: string; layout: LayoutData }> = Object.entries(
                availableLayoutsData
            )
                .filter(([_, layout]) => {
                    // Use the new helper for consistent counting
                    return getLayoutShelfCount(layout) === totalShelfCount;
                })
                .map(([id, layout]) => ({ id, layout }));

            console.log(
                `[Layout Match] AI has ${totalShelfCount} total shelves. Found ${matches.length} exact matches.`
            );

            // --- Step 5: Handle Match Scenarios ---
            if (matches.length === 1) {
                // PERFECT MATCH: Proceed automatically
                processConversion(fetchedAiData, matches[0].layout, matches[0].id);
            }
            else if (matches.length > 0) {
                // MULTIPLE EXACT MATCHES: Let user choose
                setMatchingLayouts(matches);
                setIsNoMatchScenario(false);
                setShowLayoutPicker(true);
                setUploadStep('idle');
            }
            else {
                // NO EXACT MATCH: Find the Closest Match Algorithm
                const allLayouts = Object.entries(availableLayoutsData).map(
                    ([id, layout]) => ({ id, layout })
                );

                let closestLayoutId = null;
                let minDifference = Infinity;

                // Loop through all layouts to find the smallest difference in shelf count
                allLayouts.forEach(({ id, layout }) => {
                    const layoutShelves = getLayoutShelfCount(layout);
                    const diff = Math.abs(layoutShelves - totalShelfCount);

                    if (diff < minDifference) {
                        minDifference = diff;
                        closestLayoutId = id;
                    }
                });

                console.log(`[Layout Match] No exact match. Closest is ${closestLayoutId} with diff ${minDifference}`);

                setRecommendedLayoutId(closestLayoutId); // Save the best match ID
                setMatchingLayouts(allLayouts); // Show all options
                setIsNoMatchScenario(true); // Flag as no match
                setShowLayoutPicker(true); // Open dialog
                setUploadStep('idle');

                toast.warning(`No cooler configuration matches ${totalShelfCount} shelves.`, {
                    description: 'We have recommended the closest matching model.',
                });
            }
        } catch (err: any) {
            console.error(err);
            setError(
                err.message || 'Failed to generate planogram. Please try again.'
            );
            setUploadStep('idle');
            toast.error(err.message || 'Failed to generate planogram.');
        }
    };

    // Show layout picker dialog if needed
    if (showLayoutPicker && aiData) {
        return (
            <>
                <UploadForm onSubmit={handleUpload} uploadStep={uploadStep} />
                <LayoutPicker
                    layouts={matchingLayouts}
                    isNoMatch={isNoMatchScenario}
                    detectedShelfCount={detectedShelfCount}
                    recommendedLayoutId={recommendedLayoutId} // <-- Pass the recommended ID
                    onCancel={() => {
                        setShowLayoutPicker(false);
                        setAiData(null);
                        setMatchingLayouts([]);
                        setIsNoMatchScenario(false);
                    }}
                    onSelectLayout={(layout, layoutId) => {
                        setShowLayoutPicker(false);
                        setUploadStep('complete');
                        processConversion(aiData, layout, layoutId);
                    }}
                />
            </>
        );
    }

    // Otherwise, show the initial upload form
    return <UploadForm onSubmit={handleUpload} uploadStep={uploadStep} />;
}