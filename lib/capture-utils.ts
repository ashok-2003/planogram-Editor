// Utility functions for capturing refrigerator screenshots
import * as htmlToImage from 'html-to-image';
import { PIXEL_RATIO } from './config';
import { toast } from 'sonner';

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
    }    toast.loading('Capturing image...', { id: 'capture-toast' });

    // Wait a brief moment for any animations to settle and images to load
    await new Promise(resolve => setTimeout(resolve, 500));
    const rect = element.getBoundingClientRect();
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);    console.log('📸 Capture dimensions:', { 
      width, 
      height, 
      offsetWidth: element.offsetWidth,
      offsetHeight: element.offsetHeight
    });

    const blob = await htmlToImage.toBlob(element, {
      cacheBust: true,
      pixelRatio: PIXEL_RATIO, // 3x quality for crisp image
      backgroundColor: '#f3f4f6',
      width,  
      height,
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
    
    toast.success(`Image captured! (${width}×${height}px with PixelRatio ${PIXEL_RATIO})`, { id: 'capture-toast' });
  } catch (error) {
    console.error('Error capturing image:', error);
    toast.error('Failed to capture image. Please try again.', { id: 'capture-toast' });
  }
}

/**
 * Copy element as image to clipboard
 * @param elementId - The ID of the element to capture
 */

// clipboard feature is not required

// export async function copyElementToClipboard(elementId: string): Promise<void> {
//   try {
//     const element = document.getElementById(elementId);
    
//     if (!element) {
//       toast.error('Could not find refrigerator element to capture');
//       return;
//     }

//     // Check if clipboard API is supported
//     if (!navigator.clipboard || !navigator.clipboard.write) {
//       toast.error('Clipboard not supported in this browser');
//       return;
//     }    toast.loading('Copying to clipboard...', { id: 'copy-toast' });

//     // Wait a brief moment for any animations to settle and images to load
//     await new Promise(resolve => setTimeout(resolve, 500));

//     // Get actual element dimensions INCLUDING padding/border
//     // getBoundingClientRect includes padding, border, and content
//     const rect = element.getBoundingClientRect();
//     const width = Math.round(rect.width);
//     const height = Math.round(rect.height);    console.log('📋 Clipboard dimensions:', { 
//       width, 
//       height, 
//       offsetWidth: element.offsetWidth,
//       offsetHeight: element.offsetHeight
//     });

//     // Capture the element as a blob with HIGH QUALITY
//     // pixelRatio: 2 or 3 = Higher quality but maintains display dimensions
//     const blob = await htmlToImage.toBlob(element, {
//       cacheBust: true,
//       pixelRatio: 3, // 3x quality for crisp image
//       backgroundColor: '#f3f4f6',
//       width,  // Display dimensions (not affected by pixelRatio)
//       height, // Display dimensions (not affected by pixelRatio)
//     });

//     if (!blob) {
//       toast.error('Failed to create image', { id: 'copy-toast' });
//       return;
//     }

//     try {
//       // Write to clipboard
//       await navigator.clipboard.write([
//         new ClipboardItem({
//           'image/png': blob
//         })
//       ]);
      
//       toast.success(`Copied to clipboard! (${width}×${height}px)`, { id: 'copy-toast' });
//     } catch (clipboardError) {
//       console.error('Clipboard write error:', clipboardError);
//       toast.error('Failed to copy to clipboard', { id: 'copy-toast' });
//     }
//   } catch (error) {
//     console.error('Error copying to clipboard:', error);
//     toast.error('Failed to copy image. Please try again.', { id: 'copy-toast' });
//   }
// }
