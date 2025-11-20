/**
 * Multi-Door Refrigerator Utilities
 * 
 * Provides helper functions to work with both single-door and multi-door refrigerator layouts.
 * Maintains backward compatibility while enabling new multi-door features.
 */

import { LayoutData, Refrigerator, MultiDoorRefrigerator, DoorConfig } from './types';
import { DOOR_GAP, HEADER_HEIGHT, GRILLE_HEIGHT, FRAME_BORDER } from './config';

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
 * Calculates the total width of all doors including frames and gaps
 * Formula: sum of (door width + frame borders on both sides) + gaps between doors
 */
export function getTotalWidth(doorConfigs: DoorConfig[]): number {
  const totalDoorAndFrameWidth = doorConfigs.reduce((sum, door) => 
    sum + door.width + (FRAME_BORDER * 2), 
    0
  );
  const totalGaps = (doorConfigs.length - 1) * DOOR_GAP;
  return totalDoorAndFrameWidth + totalGaps;
}

/**
 * Calculates the total height (all doors should have the same height)
 * Height includes header, grille, content, and frame borders
 */
export function getTotalHeight(doorConfigs: DoorConfig[]): number {
  // All doors should have the same height - use the first door's height
  const contentHeight = doorConfigs[0].height;
  return contentHeight + HEADER_HEIGHT + GRILLE_HEIGHT + (FRAME_BORDER * 2);
}

/**
 * Calculates the X offset for a door's content (where products start)
 * Accounts for: frame borders around each door + gaps between doors
 * 
 * Example with DOOR_GAP = 0 (flush):
 * Door-1: FRAME_BORDER (left frame)
 * Door-2: door1Width + (FRAME_BORDER * 3) (door1 + its frames + door2's left frame)
 * 
 * Example with DOOR_GAP = 10px:
 * Door-1: FRAME_BORDER
 * Door-2: door1Width + (FRAME_BORDER * 3) + DOOR_GAP
 */
export function getDoorXOffset(doorConfigs: DoorConfig[], doorIndex: number): number {
  if (doorIndex === 0) {
    return FRAME_BORDER;
  }
  
  let offset = FRAME_BORDER; // Initial left frame
  for (let i = 0; i < doorIndex; i++) {
    offset += doorConfigs[i].width + (FRAME_BORDER * 2) + DOOR_GAP; // Add previous door + frames + gap
  }
  
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
