import { Sku, Refrigerator } from './types';
// Note: We are no longer using Item directly in this file.
// We are also removing the direct export of availableSkus and initialLayout.

// --- NEW ARCHITECTURE ---
// We now define products and rows with their new properties.

const products: Omit<Sku, 'skuId'>[] = [
  {
    name: 'Pepsi Can',
    width: 60,
    height: 10,
    imageUrl: 'https://placehold.co/60x100/E6F0FF/2563EB?text=Pepsi',
    productType: 'CAN',
    constraints: { stackable: true, deletable: true },
  },
  {
    name: 'Pepsi 500ml',
    width: 70,
    height: 18,
    imageUrl: 'https://placehold.co/70x180/E6F0FF/2563EB?text=Pepsi',
    productType: 'PET_SMALL',
    constraints: { stackable: false, deletable: true },
  },
  {
    name: 'Mtn Dew 2L',
    width: 100,
    height: 28,
    imageUrl: 'https://placehold.co/100x280/D1FAE5/065F46?text=Dew',
    productType: 'PET_LARGE',
    constraints: { stackable: false, deletable: true },
  },
  {
    name: 'Tropicana Small',
    width: 65,
    height: 15,
    imageUrl: 'https://placehold.co/65x150/FEF3C7/92400E?text=Tropicana',
    productType: 'TETRA',
    constraints: { stackable: false, deletable: true },
  },
  {
    name: 'Lays Chips',
    width: 120,
    height: 10,
    imageUrl: 'https://placehold.co/120x160/FEF9C3/854D0E?text=Lays',
    productType: 'CHIPS',
    constraints: { stackable: true, deletable: true },
  },
];

// We add skuId to each product to create our final Sku list.
const availableSkus: Sku[] = products.map((p, i) => ({ ...p, skuId: `sku-${i}` }));

// Helper to find a SKU by its product type for building the initial layout
const findSku = (type: string) => availableSkus.find(s => s.productType === type);
const generateUniqueId = (skuId: string) => `${skuId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// --- INITIAL REFRIGERATOR LAYOUT (with new rules) ---
const initialLayout: Refrigerator = {
  'row-1': {
    id: 'row-1',
    capacity: 600,
    maxHeight: 30,
    allowedProductTypes: ['CAN', 'CHIPS'], // This row only allows Cans and Chips
    stacks: [
      [{ ...findSku('CAN')!, id: generateUniqueId(findSku('CAN')!.skuId) }],
      [{ ...findSku('CAN')!, id: generateUniqueId(findSku('CAN')!.skuId) }, { ...findSku('CAN')!, id: generateUniqueId(findSku('CAN')!.skuId) }],
      [{ ...findSku('CHIPS')!, id: generateUniqueId(findSku('CHIPS')!.skuId) }],
    ],
  },
  'row-2': {
    id: 'row-2',
    capacity: 600,
    maxHeight: 20,
    allowedProductTypes: ['PET_SMALL', 'TETRA'], // This row has different rules
    stacks: [
      [{ ...findSku('PET_SMALL')!, id: generateUniqueId(findSku('PET_SMALL')!.skuId) }],
      [{ ...findSku('TETRA')!, id: generateUniqueId(findSku('TETRA')!.skuId) }],
    ],
  },
  'row-3': {
    id: 'row-3',
    capacity: 600,
    maxHeight: 20,
    allowedProductTypes: 'all', // This row accepts anything
    stacks: [],
  },
  'row-4': {
    id: 'row-4',
    capacity: 600,
    maxHeight: 30,
    allowedProductTypes: ['PET_LARGE'], // This row is only for large bottles
    stacks: [
       [{ ...findSku('PET_LARGE')!, id: generateUniqueId(findSku('PET_LARGE')!.skuId) }],
    ],
  },
  'row-5': {
    id: 'row-5',
    capacity: 600,
    maxHeight: 30,
    allowedProductTypes: ['PET_LARGE'],
    stacks: [],
  },
};

// --- DATA FETCHING FUNCTIONS ---
// These functions simulate fetching data from an API.
// In a real app, this is where you'd call your data-transformer.
export const getAvailableSkus = async (): Promise<Sku[]> => {
  return Promise.resolve(availableSkus);
};

export const getInitialLayout = async (): Promise<Refrigerator> => {
  return Promise.resolve(initialLayout);
};
