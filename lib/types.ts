/**
 * Defines the constraints for an individual item.
 * These are the business rules inherent to the product itself.
 * Note: 'movableRows' has been removed from here.
 */
export interface ItemConstraints {
  stackable: boolean;
  deletable: boolean;
}

/**
 * Represents a single physical item in the refrigerator.
 * Each item has a unique instance ID and a 'productType'.
 */
export interface Item {
  id: string; // Unique instance ID, e.g., 'pepsi-can-12345'
  skuId: string; // SKU ID from backend, e.g., 'sku-pepsi-can'
  name: string;
  width: number;
  height: number;
  imageUrl: string;
  productType: string; // NEW: e.g., 'PET', 'SSS', 'TETRA'
  constraints: ItemConstraints;
}

/**
 * Represents a single row (shelf) in the refrigerator.
 * A row now defines which product types it can accept.
 */
export interface Row {
  id: string; // e.g., 'row-1'
  capacity: number;
  maxHeight: number;
  stacks: Item[][];
  allowedProductTypes: 'all' | string[]; // NEW: The core of our new rule system
}

/**
 * Represents the entire refrigerator state.
 * It's an object where keys are row IDs.
 */
export interface Refrigerator {
  [key: string]: Row;
}

/**
 * Represents a product available in the SKU palette.
 * This is the template used to create new Item instances.
 */
export interface Sku {
  skuId: string;
  name: string;
  widthMM:number;
  heightMM:number;
  width: number;
  height: number;
  imageUrl: string;
  productType: string; // NEW: e.g., 'PET', 'SSS', 'TETRA'
  constraints: ItemConstraints;
}