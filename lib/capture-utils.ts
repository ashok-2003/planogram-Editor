// Utility functions for capturing refrigerator screenshots
import * as htmlToImage from 'html-to-image';
import toast from 'react-hot-toast';

/**
 * Capture a DOM element as an image and download it
 * @param elementId - The ID of the element to capture
 * @param filename - The name of the downloaded file (without extension)
 */
export async function captureElementAsImage(
  elementId: string,
  filename: string = 'refrigerator-planogram'
): Promise<void> {
  try {
    const element = document.getElementById(elementId);
    
    if (!element) {
      toast.error('Could not find refrigerator element to capture');
      return;
    }

    toast.loading('Capturing image...', { id: 'capture-toast' });

    // Wait a brief moment for any animations to settle and images to load
    await new Promise(resolve => setTimeout(resolve, 100));

    // Capture the element as a blob with high quality
    const blob = await htmlToImage.toBlob(element, {
      cacheBust: true,
      pixelRatio: 3, // High quality for retina displays
      backgroundColor: '#f3f4f6', // Light gray background
    });

    if (!blob) {
      toast.error('Failed to create image', { id: 'capture-toast' });
      return;
    }

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    link.download = `${filename}-${timestamp}.png`;
    link.href = url;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Cleanup
    URL.revokeObjectURL(url);
    
    toast.success('Image captured successfully!', { id: 'capture-toast' });
  } catch (error) {
    console.error('Error capturing image:', error);
    toast.error('Failed to capture image. Please try again.', { id: 'capture-toast' });
  }
}

/**
 * Copy element as image to clipboard
 * @param elementId - The ID of the element to capture
 */
export async function copyElementToClipboard(elementId: string): Promise<void> {
  try {
    const element = document.getElementById(elementId);
    
    if (!element) {
      toast.error('Could not find refrigerator element to capture');
      return;
    }

    // Check if clipboard API is supported
    if (!navigator.clipboard || !navigator.clipboard.write) {
      toast.error('Clipboard not supported in this browser');
      return;
    }

    toast.loading('Copying to clipboard...', { id: 'copy-toast' });

    // Wait a brief moment for any animations to settle and images to load
    await new Promise(resolve => setTimeout(resolve, 100));

    // Capture the element as a blob
    const blob = await htmlToImage.toBlob(element, {
      cacheBust: true,
      pixelRatio: 3,
      backgroundColor: '#f3f4f6',
    });

    if (!blob) {
      toast.error('Failed to create image', { id: 'copy-toast' });
      return;
    }

    try {
      // Write to clipboard
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob
        })
      ]);
      
      toast.success('Copied to clipboard!', { id: 'copy-toast' });
    } catch (clipboardError) {
      console.error('Clipboard write error:', clipboardError);
      toast.error('Failed to copy to clipboard', { id: 'copy-toast' });
    }
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    toast.error('Failed to copy image. Please try again.', { id: 'copy-toast' });
  }
}
