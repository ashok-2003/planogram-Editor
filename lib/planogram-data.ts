import { Sku, Refrigerator } from './types';

// A helper function to create unique IDs for new items
const generateUniqueId = (skuId: string) => `${skuId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// --- AVAILABLE SKUS ---
export const availableSkus: Sku[] = [
  {
    skuId: 'sku-pepsi-can',
    name: 'Pepsi Can',
    productType: 'CAN',
    width: 60, height: 10,
    imageUrl: 'https://placehold.co/60x100/E6F0FF/2563EB?text=Pepsi',
    constraints: { stackable: true, deletable: true },
  },
  {
    skuId: 'sku-pepsi-bottle-500ml',
    name: 'Pepsi 500ml',
    productType: 'PET_SMALL',
    width: 70, height: 18,
    imageUrl: 'https://placehold.co/70x180/E6F0FF/2563EB?text=Pepsi',
    constraints: { stackable: false, deletable: true },
  },
  {
    skuId: 'sku-dew-2l',
    name: 'Mtn Dew 2L',
    productType: 'PET_LARGE',
    width: 100, height: 28,
    imageUrl: 'https://placehold.co/100x280/D1FAE5/065F46?text=Dew',
    constraints: { stackable: false, deletable: true },
  },
  {
    skuId: 'sku-tropicana-sm',
    name: 'Tropicana Small',
    productType: 'TETRA',
    width: 65, height: 15,
    imageUrl: 'https://placehold.co/65x150/FEF3C7/92400E?text=Tropicana',
    constraints: { stackable: false, deletable: true },
  },
  {
    skuId: 'sku-lays-chips',
    name: 'Lays Chips',
    productType: 'CHIPS',
    width: 120, height: 10,
    imageUrl: 'https://placehold.co/120x160/FEF9C3/854D0E?text=Lays',
    constraints: { stackable: true, deletable: true },
  },
];

// --- INITIAL REFRIGERATOR LAYOUT (Default) ---
export const initialLayout: Refrigerator = {
  'row-1': { id: 'row-1', capacity: 600, maxHeight: 30, allowedProductTypes: ['CAN', 'TETRA', 'CHIPS'], stacks: [[{ ...availableSkus[0], id: generateUniqueId(availableSkus[0].skuId) }]] },
  'row-2': { id: 'row-2', capacity: 600, maxHeight: 20, allowedProductTypes: ['PET_SMALL', 'CAN', 'TETRA'], stacks: [[{ ...availableSkus[1], id: generateUniqueId(availableSkus[1].skuId) }]] },
  'row-3': { id: 'row-3', capacity: 600, maxHeight: 20, allowedProductTypes: 'all', stacks: [] },
  'row-4': { id: 'row-4', capacity: 600, maxHeight: 30, allowedProductTypes: ['PET_LARGE', 'PET_SMALL'], stacks: [[{ ...availableSkus[2], id: generateUniqueId(availableSkus[2].skuId) }]] },
  'row-5': { id: 'row-5', capacity: 600, maxHeight: 30, allowedProductTypes: ['PET_LARGE'], stacks: [] },
};

// --- AVAILABLE REFRIGERATOR LAYOUTS ---
export const availableLayoutsData = {
  'default': { name: 'Default 5-Shelf Cooler', layout: initialLayout },
  'single-door': {
    name: 'Single Door Cooler (PC8L)',
    layout: {
      'row-1': { id: 'row-1', capacity: 450, maxHeight: 20, allowedProductTypes: ['CAN', 'TETRA'], stacks: [] },
      'row-2': { id: 'row-2', capacity: 450, maxHeight: 20, allowedProductTypes: ['PET_SMALL'], stacks: [] },
      'row-3': { id: 'row-3', capacity: 450, maxHeight: 30, allowedProductTypes: ['PET_LARGE'], stacks: [] },
      'row-4': { id: 'row-4', capacity: 450, maxHeight: 30, allowedProductTypes: ['all'], stacks: [] },
    }
  },
  'vending-machine': {
    name: 'Snack Vending Machine',
    layout: {
      'row-1': { id: 'row-1', capacity: 800, maxHeight: 12, allowedProductTypes: ['CHIPS'], stacks: [] },
      'row-2': { id: 'row-2', capacity: 800, maxHeight: 12, allowedProductTypes: ['CHIPS'], stacks: [] },
    }
  },
  // --- NEW "FAULTY" LAYOUT FOR TESTING ---
  'faulty-setup': {
    name: 'Conflict Test Cooler',
    layout: {
      'row-1': { 
        id: 'row-1', capacity: 500, maxHeight: 20, allowedProductTypes: ['CAN', 'TETRA'], 
        stacks: [
          // CONFLICT 1: This PET_LARGE item is not allowed in this row.
          [{...availableSkus[2], id: generateUniqueId(availableSkus[2].skuId)}],
          // This stack is fine.
          [{...availableSkus[0], id: generateUniqueId(availableSkus[0].skuId)}]
        ] 
      },
      'row-2': { 
        id: 'row-2', capacity: 500, maxHeight: 15, allowedProductTypes: 'all',
        stacks: [
          // CONFLICT 2: This stack of two cans (10+10=20) exceeds the row's maxHeight of 15.
          [
            {...availableSkus[0], id: generateUniqueId(availableSkus[0].skuId)},
            {...availableSkus[0], id: generateUniqueId(availableSkus[0].skuId)}
          ]
        ]
      },
    }
  }
};
// ------------------------------------

// --- DATA FETCHING FUNCTIONS ---
export const getAvailableSkus = async (): Promise<Sku[]> => {
  return Promise.resolve(availableSkus);
};

export const getInitialLayout = async (): Promise<Refrigerator> => {
  return Promise.resolve(initialLayout);
};

export const getAvailableLayouts = async (): Promise<{ [key: string]: { name: string; layout: Refrigerator } }> => {
  return Promise.resolve(availableLayoutsData);
};