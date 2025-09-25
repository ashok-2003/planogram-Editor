// lib/types.ts

/**
 * Defines the constraints for an individual item.
 * These are the business rules for each product.
 */
export interface ItemConstraints {
  stackable: boolean;
  movableRows: 'all' | string[]; // Can be moved to any row or only specific row IDs
  deletable: boolean;
}

/**
 * Represents a single physical item in the refrigerator.
 * Each item has a unique instance ID.
 */
export interface Item {
  id: string; // Unique instance ID, e.g., 'pepsi-can-12345'
  skuId: string; // SKU ID from backend, e.g., 'sku-pepsi-can'
  name: string;
  width: number; // in abstract units, e.g., pixels
  height: number; // in abstract units
  imageUrl: string;
  constraints: ItemConstraints;
}

/**
 * Represents a single row (shelf) in the refrigerator.
 * A row contains stacks of items.
 */
export interface Row {
  id: string; // e.g., 'row-1'
  capacity: number; // Max total width of all stacks in this row
  maxHeight: number; // Max height of any single stack in this row
  stacks: Item[][]; // An array of stacks, where each stack is an array of Items
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
    width: number;
    height: number;
    imageUrl: string;
    constraints: ItemConstraints;
}