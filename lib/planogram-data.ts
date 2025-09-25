// lib/planogram-data.ts

import { Sku, Refrigerator, Item } from './types';

// A helper function to create unique IDs for new items
const generateUniqueId = (skuId: string) => `${skuId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// --- AVAILABLE SKUS ---
// This list populates the sidebar. It's the "palette" of items you can add.
export const availableSkus: Sku[] = [
  {
    skuId: 'sku-pepsi-can',
    name: 'Pepsi Can',
    width: 60,
    height: 10,
    imageUrl: 'https://placehold.co/60x100/E6F0FF/2563EB?text=Pepsi',
    constraints: { stackable: true, deletable: true, movableRows: 'all' },
  },
  {
    skuId: 'sku-pepsi-bottle-500ml',
    name: 'Pepsi 500ml',
    width: 70,
    height: 18,
    imageUrl: 'https://placehold.co/70x180/E6F0FF/2563EB?text=Pepsi',
    constraints: { stackable: false, deletable: true, movableRows: ['row-2', 'row-3', 'row-4', 'row-5'] },
  },
  {
    skuId: 'sku-dew-2l',
    name: 'Mtn Dew 2L',
    width: 100,
    height: 28,
    imageUrl: 'https://placehold.co/100x280/D1FAE5/065F46?text=Dew',
    constraints: { stackable: false, deletable: true, movableRows: ['row-4', 'row-5'] },
  },
    {
    skuId: 'sku-tropicana-sm',
    name: 'Tropicana Small',
    width: 65,
    height: 15,
    imageUrl: 'https://placehold.co/65x150/FEF3C7/92400E?text=Tropicana',
    constraints: { stackable: false, deletable: true, movableRows: 'all' },
  },
  {
    skuId: 'sku-lays-chips',
    name: 'Lays Chips',
    width: 120,
    height: 16,
    imageUrl: 'https://placehold.co/120x160/FEF9C3/854D0E?text=Lays',
    constraints: { stackable: true, deletable: true, movableRows: ['row-1', 'row-2', 'row-3'] },
  },
];

// --- INITIAL REFRIGERATOR LAYOUT ---
// This is the default state of the planogram when the page loads.
export const initialLayout: Refrigerator = {
  'row-1': {
    id: 'row-1',
    capacity: 600,
    maxHeight: 30,
    stacks: [
      [{ ...availableSkus[0], id: generateUniqueId(availableSkus[0].skuId) }],
      [{ ...availableSkus[0], id: generateUniqueId(availableSkus[0].skuId) }, { ...availableSkus[0], id: generateUniqueId(availableSkus[0].skuId) }],
      [{ ...availableSkus[4], id: generateUniqueId(availableSkus[4].skuId) }],
    ],
  },
  'row-2': {
    id: 'row-2',
    capacity: 600,
    maxHeight: 20,
    stacks: [
      [{ ...availableSkus[1], id: generateUniqueId(availableSkus[1].skuId) }],
      [{ ...availableSkus[1], id: generateUniqueId(availableSkus[1].skuId) }],
      [{ ...availableSkus[3], id: generateUniqueId(availableSkus[3].skuId) }],
      [{ ...availableSkus[3], id: generateUniqueId(availableSkus[3].skuId) }],
    ],
  },
  'row-3': {
    id: 'row-3',
    capacity: 600,
    maxHeight: 20,
    stacks: [],
  },
  'row-4': {
    id: 'row-4',
    capacity: 600,
    maxHeight: 30,
    stacks: [
        [{ ...availableSkus[2], id: generateUniqueId(availableSkus[2].skuId) }],
        [{ ...availableSkus[2], id: generateUniqueId(availableSkus[2].skuId) }],
    ],
  },
  'row-5': {
    id: 'row-5',
    capacity: 600,
    maxHeight: 30,
    stacks: [],
  },
};

// --- DATA FETCHING FUNCTIONS ---
// These functions simulate fetching data from an API.
export const getAvailableSkus = async (): Promise<Sku[]> => {
  // In a real app, you'd fetch this from your backend.
  return Promise.resolve(availableSkus);
};

export const getInitialLayout = async (): Promise<Refrigerator> => {
  // In a real app, you'd fetch this from your backend.
  return Promise.resolve(initialLayout);
};