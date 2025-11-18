/**
 * A global scale factor to convert real-world millimeters into screen pixels.
 * Adjust this value to make the entire planogram larger or smaller on the screen.
 * Example: A value of 0.2 means a 1000mm wide object will be rendered as 200px wide.
 */
export const PIXELS_PER_MM = 0.4;
export const PIXEL_RATIO = 3;

/**
 * Multi-door refrigerator display configuration
 * These values control the visual layout and spacing of multi-door refrigerators
 */
export const DOOR_GAP = 0;              // Gap between doors in pixels (0 = flush, realistic)
export const HEADER_HEIGHT = 100;       // Height of top header section in pixels
export const GRILLE_HEIGHT = 90;        // Height of bottom grille section in pixels
export const FRAME_BORDER = 16;         // Border width around each door in pixels
export const DOOR_DIVIDER_WIDTH = 0;    // Optional divider between doors (0 = none)
