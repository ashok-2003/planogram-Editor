// Imports from your example
import { Sku, Refrigerator, LayoutData } from './types'; // Add LayoutData import
import { demoSkus } from './demo-sku';
import { PIXELS_PER_MM } from './config';

// A helper function to create unique IDs for new items
const generateUniqueId = (skuId: string) => `${skuId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const availableSkus : Sku[]= demoSkus;

// --- DIMENSIONALLY-ACCURATE REFRIGERATOR LAYOUTS ---
// This data is generated from your JSON
export const availableLayoutsData: { [key: string]: LayoutData } = { 
  'g-9': { 
    name: 'G-9',
    width: Math.round(412 * PIXELS_PER_MM),
    height: Math.round(1174 * PIXELS_PER_MM),
    layout: {
      'row-1': { id: 'row-1', capacity: Math.round(412 * PIXELS_PER_MM), maxHeight: Math.round(294 * PIXELS_PER_MM), allowedProductTypes: ['CAN', 'BOTTLE'], stacks: [] },
      'row-2': { id: 'row-2', capacity: Math.round(412 * PIXELS_PER_MM), maxHeight: Math.round(294 * PIXELS_PER_MM), allowedProductTypes: ['CAN', 'BOTTLE'], stacks: [] },
      'row-3': { id: 'row-3', capacity: Math.round(412 * PIXELS_PER_MM), maxHeight: Math.round(294 * PIXELS_PER_MM), allowedProductTypes: ['CAN', 'BOTTLE'], stacks: [] },
      'row-4': { id: 'row-4', capacity: Math.round(412 * PIXELS_PER_MM), maxHeight: Math.round(294 * PIXELS_PER_MM), allowedProductTypes: ['CAN', 'BOTTLE'], stacks: [] }
    }
  },
  'g-7f': { 
    name: 'G-7f',
    width: Math.round(450 * PIXELS_PER_MM),
    height: Math.round(777 * PIXELS_PER_MM),
    layout: {
      'row-1': { id: 'row-1', capacity: Math.round(450 * PIXELS_PER_MM), maxHeight: Math.round(259 * PIXELS_PER_MM), allowedProductTypes: ['CAN', 'BOTTLE'], stacks: [] },
      'row-2': { id: 'row-2', capacity: Math.round(450 * PIXELS_PER_MM), maxHeight: Math.round(259 * PIXELS_PER_MM), allowedProductTypes: ['CAN', 'BOTTLE'], stacks: [] },
      'row-3': { id: 'row-3', capacity: Math.round(450 * PIXELS_PER_MM), maxHeight: Math.round(259 * PIXELS_PER_MM), allowedProductTypes: ['CAN', 'BOTTLE'], stacks: [] }
    }
  },
  // 'g-49c': { 
  //   name: 'G-49c',
  //   width: Math.round(1263 * PIXELS_PER_MM),
  //   height: Math.round(1539 * PIXELS_PER_MM),
  //   layout: {
  //     'row-1': { id: 'row-1', capacity: Math.round(1263 * PIXELS_PER_MM), maxHeight: Math.round(308 * PIXELS_PER_MM), allowedProductTypes: ['CAN', 'BOTTLE'], stacks: [] },
  //     'row-2': { id: 'row-2', capacity: Math.round(1263 * PIXELS_PER_MM), maxHeight: Math.round(308 * PIXELS_PER_MM), allowedProductTypes: ['CAN', 'BOTTLE'], stacks: [] },
  //     'row-3': { id: 'row-3', capacity: Math.round(1263 * PIXELS_PER_MM), maxHeight: Math.round(308 * PIXELS_PER_MM), allowedProductTypes: ['CAN', 'BOTTLE'], stacks: [] },
  //     'row-4': { id: 'row-4', capacity: Math.round(1263 * PIXELS_PER_MM), maxHeight: Math.round(308 * PIXELS_PER_MM), allowedProductTypes: ['CAN', 'BOTTLE'], stacks: [] },
  //     'row-5': { id: 'row-5', capacity: Math.round(1263 * PIXELS_PER_MM), maxHeight: Math.round(308 * PIXELS_PER_MM), allowedProductTypes: ['CAN', 'BOTTLE'], stacks: [] }
  //   }
  // },
  'g-26c': { 
    name: 'G-26c',
    width: Math.round(673 * PIXELS_PER_MM),
    height: Math.round(1308 * PIXELS_PER_MM),
    layout: {
      'row-1': { id: 'row-1', capacity: Math.round(673 * PIXELS_PER_MM), maxHeight: Math.round(262 * PIXELS_PER_MM), allowedProductTypes: ['CAN', 'BOTTLE'], stacks: [] },
      'row-2': { id: 'row-2', capacity: Math.round(673 * PIXELS_PER_MM), maxHeight: Math.round(262 * PIXELS_PER_MM), allowedProductTypes: ['CAN', 'BOTTLE'], stacks: [] },
      'row-3': { id: 'row-3', capacity: Math.round(673 * PIXELS_PER_MM), maxHeight: Math.round(262 * PIXELS_PER_MM), allowedProductTypes: ['CAN', 'BOTTLE'], stacks: [] },
      'row-4': { id: 'row-4', capacity: Math.round(673 * PIXELS_PER_MM), maxHeight: Math.round(262 * PIXELS_PER_MM), allowedProductTypes: ['CAN', 'BOTTLE'], stacks: [] },
      'row-5': { id: 'row-5', capacity: Math.round(673 * PIXELS_PER_MM), maxHeight: Math.round(262 * PIXELS_PER_MM), allowedProductTypes: ['CAN', 'BOTTLE'], stacks: [] }
    }
  },
  'g-10f': { 
    name: 'G-10f',
    width: Math.round(542 * PIXELS_PER_MM),
    height: Math.round(1041 * PIXELS_PER_MM),
    layout: {
      'row-1': { id: 'row-1', capacity: Math.round(542 * PIXELS_PER_MM), maxHeight: Math.round(260 * PIXELS_PER_MM), allowedProductTypes: ['CAN', 'BOTTLE'], stacks: [] },
      'row-2': { id: 'row-2', capacity: Math.round(542 * PIXELS_PER_MM), maxHeight: Math.round(260 * PIXELS_PER_MM), allowedProductTypes: ['CAN', 'BOTTLE'], stacks: [] },
      'row-3': { id: 'row-3', capacity: Math.round(542 * PIXELS_PER_MM), maxHeight: Math.round(260 * PIXELS_PER_MM), allowedProductTypes: ['CAN', 'BOTTLE'], stacks: [] },
      'row-4': { id: 'row-4', capacity: Math.round(542 * PIXELS_PER_MM), maxHeight: Math.round(260 * PIXELS_PER_MM), allowedProductTypes: ['CAN', 'BOTTLE'], stacks: [] }
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