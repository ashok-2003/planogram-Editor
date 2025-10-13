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
    width: Math.round(700 * PIXELS_PER_MM),
    height: Math.round(2200 * PIXELS_PER_MM),
    layout: {
      'row-1': { id: 'row-1', capacity: Math.round(673 * PIXELS_PER_MM), maxHeight: Math.round(200 * PIXELS_PER_MM), allowedProductTypes: ['CAN', 'TETRA'], stacks: [] },
      'row-2': { id: 'row-2', capacity: Math.round(673 * PIXELS_PER_MM), maxHeight: Math.round(250 * PIXELS_PER_MM), allowedProductTypes: ['SSS', 'PET_SMALL'], stacks: [] },
      'row-3': { id: 'row-3', capacity: Math.round(673 * PIXELS_PER_MM), maxHeight: Math.round(250 * PIXELS_PER_MM), allowedProductTypes: ['LSS'], stacks: [] },
      'row-4': { id: 'row-4', capacity: Math.round(673 * PIXELS_PER_MM), maxHeight: Math.round(300 * PIXELS_PER_MM), allowedProductTypes: ['SMS', 'PET_LARGE'], stacks: [] },
      'row-5': { id: 'row-5', capacity: Math.round(673 * PIXELS_PER_MM), maxHeight: Math.round(350 * PIXELS_PER_MM), allowedProductTypes: ['LMS', 'PET_LARGE'], stacks: [] },
    }
  },
  'g-49c': { 
    name: 'G-49c Double Door Cooler',
    width: Math.round(1300 * PIXELS_PER_MM),
    height: Math.round(2600 * PIXELS_PER_MM),
    layout: {
      'row-1': { id: 'row-1', capacity: Math.round(1263 * PIXELS_PER_MM), maxHeight: Math.round(300 * PIXELS_PER_MM), allowedProductTypes: ['CAN', 'TETRA'], stacks: [] },
      'row-2': { id: 'row-2', capacity: Math.round(1263 * PIXELS_PER_MM), maxHeight: Math.round(340 * PIXELS_PER_MM), allowedProductTypes: ['PET_SMALL', 'RGB'], stacks: [] },
      'row-3': { id: 'row-3', capacity: Math.round(1263 * PIXELS_PER_MM), maxHeight: Math.round(340 * PIXELS_PER_MM), allowedProductTypes: ['PET_LARGE'], stacks: [] },
      'row-4': { id: 'row-4', capacity: Math.round(1263 * PIXELS_PER_MM), maxHeight: Math.round(450 * PIXELS_PER_MM), allowedProductTypes: 'all', stacks: [] }, // This is fine as 'all' is allowed
      'row-5': { id: 'row-5', capacity: Math.round(1263 * PIXELS_PER_MM), maxHeight: Math.round(500 * PIXELS_PER_MM), allowedProductTypes: 'all', stacks: [] },
    }
  },
};

export const initialLayout: Refrigerator = availableLayoutsData['g-26c'].layout;

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