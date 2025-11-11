import { Sku, Refrigerator, LayoutData } from './types'; // Add LayoutData import
import { demoSkus } from './demo-sku';
import { PIXELS_PER_MM } from './config';

// A helper function to create unique IDs for new items
const generateUniqueId = (skuId: string) => `${skuId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const availableSkus : Sku[]= demoSkus;

// --- DIMENSIONALLY-ACCURATE REFRIGERATOR LAYOUTS ---
export const availableLayoutsData: { [key: string]: LayoutData } = { // Explicitly type it
  'g-26c': { 
    name: 'G-26c Upright Cooler',
    width: Math.round(673 * PIXELS_PER_MM),
    height: Math.round((1308) * PIXELS_PER_MM),
    layout: {
      'row-1': { id: 'row-1', capacity: Math.round(673 * PIXELS_PER_MM), maxHeight: Math.round(327 * PIXELS_PER_MM), allowedProductTypes: ['CAN', 'TETRA'], stacks: [] },
      'row-2': { id: 'row-2', capacity: Math.round(673 * PIXELS_PER_MM), maxHeight: Math.round(327 * PIXELS_PER_MM), allowedProductTypes: ['SSS', 'PET_SMALL', 'CAN', 'TETRA'], stacks: [] },
      'row-3': { id: 'row-3', capacity: Math.round(673 * PIXELS_PER_MM), maxHeight: Math.round(327 * PIXELS_PER_MM), allowedProductTypes: ['LSS'], stacks: [] },
      'row-4': { id: 'row-4', capacity: Math.round(673 * PIXELS_PER_MM), maxHeight: Math.round(327 * PIXELS_PER_MM), allowedProductTypes: ['SMS', 'PET_LARGE'], stacks: [] },
    }
  },
  'g-10f': { 
    name: 'g-10f upright Cooler',
    width: Math.round(542 * PIXELS_PER_MM),
    height: Math.round((1041+20) * PIXELS_PER_MM),
    layout: {
      'row-1': { id: 'row-1', capacity: Math.round(542 * PIXELS_PER_MM), maxHeight: Math.round(347 * PIXELS_PER_MM), allowedProductTypes: ['CAN', 'TETRA'], stacks: [] },
      'row-2': { id: 'row-2', capacity: Math.round(542 * PIXELS_PER_MM), maxHeight: Math.round(347 * PIXELS_PER_MM), allowedProductTypes: ['PET_SMALL', 'RGB'], stacks: [] },
      'row-3': { id: 'row-3', capacity: Math.round(542 * PIXELS_PER_MM), maxHeight: Math.round(347 * PIXELS_PER_MM), allowedProductTypes: ['PET_LARGE'], stacks: [] },
    }
  },
  'g-26c-double': {
    name: 'G-26c Double Door Cooler',
    doorCount: 2,
    doors: [
      {
        id: 'door-1',
        width: Math.round(673 * PIXELS_PER_MM),
        height: Math.round(1308 * PIXELS_PER_MM),
        layout: {
          'row-1': { id: 'row-1', capacity: Math.round(673 * PIXELS_PER_MM), maxHeight: Math.round(327 * PIXELS_PER_MM), allowedProductTypes: ['CAN', 'TETRA'], stacks: [] },
          'row-2': { id: 'row-2', capacity: Math.round(673 * PIXELS_PER_MM), maxHeight: Math.round(327 * PIXELS_PER_MM), allowedProductTypes: ['SSS', 'PET_SMALL', 'CAN', 'TETRA'], stacks: [] },
          'row-3': { id: 'row-3', capacity: Math.round(673 * PIXELS_PER_MM), maxHeight: Math.round(327 * PIXELS_PER_MM), allowedProductTypes: ['LSS'], stacks: [] },
          'row-4': { id: 'row-4', capacity: Math.round(673 * PIXELS_PER_MM), maxHeight: Math.round(327 * PIXELS_PER_MM), allowedProductTypes: ['SMS', 'PET_LARGE'], stacks: [] },
        }
      },
      {
        id: 'door-2',
        width: Math.round(673 * PIXELS_PER_MM),
        height: Math.round(1308 * PIXELS_PER_MM),
        layout: {
          'row-1': { id: 'row-1', capacity: Math.round(673 * PIXELS_PER_MM), maxHeight: Math.round(327 * PIXELS_PER_MM), allowedProductTypes: ['CAN', 'TETRA'], stacks: [] },
          'row-2': { id: 'row-2', capacity: Math.round(673 * PIXELS_PER_MM), maxHeight: Math.round(327 * PIXELS_PER_MM), allowedProductTypes: ['SSS', 'PET_SMALL', 'CAN', 'TETRA'], stacks: [] },
          'row-3': { id: 'row-3', capacity: Math.round(673 * PIXELS_PER_MM), maxHeight: Math.round(327 * PIXELS_PER_MM), allowedProductTypes: ['LSS'], stacks: [] },
          'row-4': { id: 'row-4', capacity: Math.round(673 * PIXELS_PER_MM), maxHeight: Math.round(327 * PIXELS_PER_MM), allowedProductTypes: ['SMS', 'PET_LARGE'], stacks: [] },
        }
      }
    ]
  },
};

export const initialLayout: Refrigerator = availableLayoutsData['g-26c'].layout || {};

// --- DATA FETCHING FUNCTIONS ---
export const getAvailableSkus = async (): Promise<Sku[]> => {
  return Promise.resolve(availableSkus);
};

export const getInitialLayout = async (): Promise<Refrigerator> => {
  return Promise.resolve(initialLayout);
};

// We rename the exported data to avoid conflicts
export const layouts = availableLayoutsData;
export const getAvailableLayouts = async (): Promise<{ [key: string]: LayoutData }> => { // Update return type
  return Promise.resolve(layouts);
};