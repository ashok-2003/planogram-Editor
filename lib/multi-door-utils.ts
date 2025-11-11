/**
 * Multi-Door Refrigerator Utilities
 * 
 * Provides helper functions to work with both single-door and multi-door refrigerator layouts.
 * Maintains backward compatibility while enabling new multi-door features.
 */

import { LayoutData, Refrigerator, MultiDoorRefrigerator, DoorConfig } from './types';

/**
 * Checks if a layout is multi-door
 */
export function isMultiDoorLayout(layout: LayoutData): boolean {
  return !!layout.doorCount && !!layout.doors && layout.doorCount > 1;
}

/**
 * Converts a LayoutData to a normalized multi-door structure.
 * Single-door layouts are converted to a multi-door structure with one door.
 * 
 * @param layout - The layout data (single or multi-door)
 * @returns MultiDoorRefrigerator structure with door IDs as keys
 */
export function normalizeToMultiDoor(layout: LayoutData): {
  refrigerators: MultiDoorRefrigerator;
  doorConfigs: DoorConfig[];
} {
  if (isMultiDoorLayout(layout)) {
    // Multi-door layout - convert to refrigerators object
    const refrigerators: MultiDoorRefrigerator = {};
    layout.doors!.forEach(door => {
      refrigerators[door.id] = door.layout;
    });
    
    return {
      refrigerators,
      doorConfigs: layout.doors!
    };
  } else {
    // Single-door layout - wrap in multi-door structure
    const doorConfig: DoorConfig = {
      id: 'door-1',
      width: layout.width!,
      height: layout.height!,
      layout: layout.layout!
    };
    
    return {
      refrigerators: {
        'door-1': layout.layout!
      },
      doorConfigs: [doorConfig]
    };
  }
}

/**
 * Gets all door configurations from a layout
 */
export function getDoorConfigs(layout: LayoutData): DoorConfig[] {
  if (isMultiDoorLayout(layout)) {
    return layout.doors!;
  } else {
    return [{
      id: 'door-1',
      width: layout.width!,
      height: layout.height!,
      layout: layout.layout!
    }];
  }
}

/**
 * Calculates the total width of all doors including frames
 * Frame borders: 16px on each side of a door, so 32px per door + 16px on each end
 * Total = door widths + (doorCount + 1) * 16px
 */
export function getTotalWidth(doorConfigs: DoorConfig[]): number {
  const FRAME_BORDER = 16;
  const doorWidths = doorConfigs.reduce((sum, door) => sum + door.width, 0);
  const frameWidth = (doorConfigs.length + 1) * FRAME_BORDER;
  return doorWidths + frameWidth;
}

/**
 * Calculates the total height (all doors should have the same height)
 * Height includes header (80px), grille (70px), and frame borders (16px on each end)
 */
export function getTotalHeight(doorConfigs: DoorConfig[]): number {
  const FRAME_BORDER = 16;
  const HEADER_HEIGHT = 80;
  const GRILLE_HEIGHT = 70;
  
  // All doors should have the same height - use the first door's height
  const contentHeight = doorConfigs[0].height;
  return contentHeight + HEADER_HEIGHT + GRILLE_HEIGHT + (FRAME_BORDER * 2);
}

/**
 * Calculates the X offset for a door's content (where products start)
 * Door-1: 16px (frame border)
 * Door-2: door1Width + 48px (door1 + 3 frame borders)
 * Door-3: door1Width + door2Width + 80px, etc.
 */
export function getDoorXOffset(doorConfigs: DoorConfig[], doorIndex: number): number {
  const FRAME_BORDER = 16;
  
  if (doorIndex === 0) {
    return FRAME_BORDER;
  }
  
  let offset = FRAME_BORDER; // Initial left frame
  for (let i = 0; i < doorIndex; i++) {
    offset += doorConfigs[i].width + (FRAME_BORDER * 2); // Add door width + its left and right frames
  }
  offset += FRAME_BORDER; // Add the current door's left frame
  
  return offset;
}

/**
 * Gets the door configuration for a specific door ID
 */
export function getDoorConfig(doorConfigs: DoorConfig[], doorId: string): DoorConfig | undefined {
  return doorConfigs.find(config => config.id === doorId);
}

/**
 * Gets the door index from a door ID
 */
export function getDoorIndex(doorConfigs: DoorConfig[], doorId: string): number {
  return doorConfigs.findIndex(config => config.id === doorId);
}
