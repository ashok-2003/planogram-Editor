
# Planogram Editor API Specification

This document outlines the API endpoints and data structures required for the Planogram Editor application.

## Data Types

These types are based on the current `lib/types.ts` file and support both single-door and multi-door refrigerator layouts.

```typescript
/**
 * Defines the constraints for an individual item.
 */
export interface ItemConstraints {
  stackable: boolean;
  deletable: boolean;
}

/**
 * Represents a stock-keeping unit (SKU). This is a template for creating items.
 */
export interface Sku {
  skuId: string;
  name: string;
  widthMM: number;      // Width in millimeters
  heightMM: number;     // Height in millimeters
  width: number;        // Width in pixels
  height: number;       // Height in pixels
  imageUrl: string;
  productType: string;  // e.g., 'PET', 'SSS', 'TETRA', 'CAN', 'LSS', 'SMS'
  constraints: ItemConstraints;
}

/**
 * Represents a single physical item in the refrigerator.
 */
export interface Item {
  id: string;           // Unique instance ID, e.g., 'pepsi-can-12345'
  skuId: string;        // Reference to the SKU template
  name: string;
  width: number;
  height: number;
  widthMM?: number;     // Width in millimeters (for dynamic blank spaces)
  heightMM?: number;    // Height in millimeters (for dynamic blank spaces)
  imageUrl: string;
  productType: string;
  constraints: ItemConstraints;
  customWidth?: number; // Custom width for BLANK spaces (in pixels)
}

/**
 * Represents a single row (shelf) in a refrigerator door.
 */
export interface Row {
  id: string;           // e.g., 'row-1', 'row-2'
  capacity: number;     // Width capacity in pixels
  maxHeight: number;    // Maximum height in pixels
  stacks: Item[][];     // 2D array: each stack is an array of items
  allowedProductTypes: 'all' | string[]; // Product type constraints
}

/**
 * Represents a single refrigerator door with rows.
 */
export interface Refrigerator {
  [key: string]: Row;   // Keys are row IDs (e.g., 'row-1', 'row-2')
}

/**
 * Represents a single door configuration with dimensions.
 */
export interface DoorConfig {
  id: string;           // e.g., 'door-1', 'door-2'
  width: number;        // Content width in pixels
  height: number;       // Content height in pixels
  layout: Refrigerator; // Row structure for this door
}

/**
 * Represents multiple refrigerator doors (multi-door layouts).
 */
export interface MultiDoorRefrigerator {
  [doorId: string]: Refrigerator; // Keys are door IDs
}

/**
 * Represents a complete refrigerator layout (single or multi-door).
 * All layouts now use the 'doors' array structure.
 */
export interface LayoutData {
  name: string;         // Display name, e.g., "G-26c Upright Cooler"
  doorCount?: number;   // Number of doors (optional, derived from doors.length)
  doors: DoorConfig[];  // Array of door configurations
  
  // Legacy properties (deprecated, maintained for backward compatibility)
  width?: number;
  height?: number;
  layout?: Refrigerator;
}
```

---

## API Endpoints

### 1. Get All Refrigerator Layouts

-   **Endpoint:** `GET /api/layouts`
-   **Description:** Retrieves a list of all available refrigerator layouts.
-   **Response Body:**
    ```json
    {
      "layouts": [
        {
          "id": "g-26c",
          "name": "G-26c Upright Cooler"
        },
        {
          "id": "g-10f",
          "name": "g-10f upright Cooler"
        }
      ]
    }
    ```

### 2. Get a Specific Refrigerator Layout

-   **Endpoint:** `GET /api/layouts/{layoutId}`
-   **Description:** Retrieves the detailed structure of a single refrigerator layout. Supports both single-door and multi-door layouts.
-   **URL Parameters:**
    -   `layoutId` (string, required): The ID of the layout to retrieve (e.g., `g-26c`, `g-26c-double`).
-   **Response Body (Single-Door Layout):**
    ```json
    {
      "name": "G-26c Upright Cooler",
      "doorCount": 1,
      "doors": [
        {
          "id": "door-1",
          "width": 505,
          "height": 981,
          "layout": {
            "row-1": {
              "id": "row-1",
              "capacity": 505,
              "maxHeight": 245,
              "stacks": [],
              "allowedProductTypes": ["CAN", "TETRA"]
            },
            "row-2": {
              "id": "row-2",
              "capacity": 505,
              "maxHeight": 245,
              "stacks": [],
              "allowedProductTypes": ["SSS", "PET_SMALL", "CAN", "TETRA"]
            },
            "row-3": {
              "id": "row-3",
              "capacity": 505,
              "maxHeight": 245,
              "stacks": [],
              "allowedProductTypes": ["LSS"]
            },
            "row-4": {
              "id": "row-4",
              "capacity": 505,
              "maxHeight": 245,
              "stacks": [],
              "allowedProductTypes": ["SMS", "PET_LARGE"]
            }
          }
        }
      ]
    }
    ```
-   **Response Body (Multi-Door Layout):**
    ```json
    {
      "name": "G-26c Double Door Cooler",
      "doorCount": 2,
      "doors": [
        {
          "id": "door-1",
          "width": 705,
          "height": 981,
          "layout": {
            "row-1": {
              "id": "row-1",
              "capacity": 705,
              "maxHeight": 245,
              "stacks": [],
              "allowedProductTypes": ["CAN", "TETRA"]
            },
            "row-2": {
              "id": "row-2",
              "capacity": 705,
              "maxHeight": 245,
              "stacks": [],
              "allowedProductTypes": "all"
            },
            "row-3": {
              "id": "row-3",
              "capacity": 705,
              "maxHeight": 245,
              "stacks": [],
              "allowedProductTypes": ["LSS"]
            },
            "row-4": {
              "id": "row-4",
              "capacity": 705,
              "maxHeight": 245,
              "stacks": [],
              "allowedProductTypes": ["SMS", "PET_LARGE"]
            }
          }
        },
        {
          "id": "door-2",
          "width": 705,
          "height": 981,
          "layout": {
            "row-1": {
              "id": "row-1",
              "capacity": 705,
              "maxHeight": 245,
              "stacks": [],
              "allowedProductTypes": ["CAN", "TETRA"]
            },
            "row-2": {
              "id": "row-2",
              "capacity": 705,
              "maxHeight": 245,
              "stacks": [],
              "allowedProductTypes": "all"
            },
            "row-3": {
              "id": "row-3",
              "capacity": 705,
              "maxHeight": 245,
              "stacks": [],
              "allowedProductTypes": ["LSS"]
            },
            "row-4": {
              "id": "row-4",
              "capacity": 705,
              "maxHeight": 245,
              "stacks": [],
              "allowedProductTypes": ["SMS", "PET_LARGE"]
            }
          }
        }
      ]
    }
    ```

### 3. Get All SKUs

-   **Endpoint:** `GET /api/skus`
-   **Description:** Retrieves a list of all available SKUs (product templates).
-   **Response Body:**
    ```json
    {
      "skus": [
        {
          "skuId": "sku-coke-can",
          "name": "Coke Can",
          "widthMM": 66,
          "heightMM": 123,
          "width": 33,
          "height": 62,
          "imageUrl": "/skus/coke-can.png",
          "productType": "CAN",
          "constraints": {
            "stackable": true,
            "deletable": true
          }
        },
        {
          "skuId": "sku-pepsi-pet",
          "name": "Pepsi 1.5L PET",
          "widthMM": 100,
          "heightMM": 320,
          "width": 50,
          "height": 160,
          "imageUrl": "/skus/pepsi-pet.png",
          "productType": "PET_LARGE",
          "constraints": {
            "stackable": false,
            "deletable": true
          }
        }
      ]
    }
    ```
    **Note:** Both millimeter (`widthMM`, `heightMM`) and pixel (`width`, `height`) dimensions are provided for each SKU.

### 4. Search SKUs

-   **Endpoint:** `GET /api/skus/search`
-   **Description:** Searches for SKUs based on a query string. Searches in product name and SKU ID.
-   **Query Parameters:**
    -   `q` (string, required): The search term.
-   **Response Body:**
    ```json
    {
      "skus": [
        {
          "skuId": "sku-pepsi-can",
          "name": "Pepsi Can",
          "widthMM": 66,
          "heightMM": 123,
          "width": 33,
          "height": 62,
          "imageUrl": "/skus/pepsi-can.png",
          "productType": "CAN",
          "constraints": {
            "stackable": true,
            "deletable": true
          }
        }
      ]
    }
    ```

---

## Backend Data Structure

The editor can export planogram data to a backend format suitable for AI analysis and image generation. This format includes bounding boxes for all products.

### Backend Output Structure

```typescript
export interface BackendProduct {
  product: string;              // Product name
  stacked: BackendProduct[] | null; // Stacked products (deprecated, now in separate products)
  Position: string;             // Position identifier
  "SKU-Code": string;          // SKU identifier
  stackSize: number;           // Number of items in stack
  Confidence: string;          // Confidence score (for AI detection)
  "Bounding-Box": number[][]; // [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
  width: number;              // Width in pixels
  height: number;             // Height in pixels
}

export interface BackendSection {
  data: number[][];           // Section polygon coordinates
  position: number;           // Section number
  products: BackendProduct[]; // Products in this section
}

export interface BackendDoor {
  data: number[][];                 // Door polygon coordinates
  Sections: BackendSection[];       // Array of sections (rows)
  "Door-Visible": boolean;         // Whether door is visible
}

export interface BackendOutput {
  Cooler: {
    [doorKey: string]: BackendDoor; // Door-1, Door-2, etc.
  };
  dimensions: {
    width: number;          // Single door content width
    height: number;         // Single door content height
    totalWidth?: number;    // Total width (multi-door)
    totalHeight?: number;   // Total height including header/grille/frame
    headerHeight?: number;  // Header height
    grilleHeight?: number;  // Grille height
    frameBorder?: number;   // Frame border width
    BoundingBoxScale?: number; // Scale factor for bounding boxes
  };
}
```

### Example Backend Output (Multi-Door)

```json
{
  "Cooler": {
    "Door-1": {
      "data": [[16, 106], [721, 106], [721, 1087], [16, 1087]],
      "Sections": [
        {
          "data": [[16, 106], [721, 106], [721, 351], [16, 351]],
          "position": 1,
          "products": [
            {
              "product": "Coke Can",
              "stacked": null,
              "Position": "door-1-row-1-0",
              "SKU-Code": "sku-coke-can",
              "stackSize": 1,
              "Confidence": "100%",
              "Bounding-Box": [[16, 116], [16, 178], [49, 178], [49, 116]],
              "width": 33,
              "height": 62
            }
          ]
        }
      ],
      "Door-Visible": true
    },
    "Door-2": {
      "data": [[753, 106], [1458, 106], [1458, 1087], [753, 1087]],
      "Sections": [
        {
          "data": [[753, 106], [1458, 106], [1458, 351], [753, 351]],
          "position": 1,
          "products": [
            {
              "product": "Pepsi Can",
              "stacked": null,
              "Position": "door-2-row-1-0",
              "SKU-Code": "sku-pepsi-can",
              "stackSize": 1,
              "Confidence": "100%",
              "Bounding-Box": [[753, 116], [753, 178], [786, 178], [786, 116]],
              "width": 33,
              "height": 62
            }
          ]
        }
      ],
      "Door-Visible": true
    }
  },
  "dimensions": {
    "width": 705,
    "height": 981,
    "totalWidth": 1474,
    "totalHeight": 1103,
    "headerHeight": 90,
    "grilleHeight": 16,
    "frameBorder": 16,
    "BoundingBoxScale": 1
  }
}
```

---

## Product Types

The following product types are supported and can be used for row constraints:

- `CAN` - Standard cans
- `TETRA` - Tetra packs
- `SSS` - Small single-serve bottles
- `PET_SMALL` - Small PET bottles
- `LSS` - Large single-serve bottles
- `SMS` - Medium single-serve bottles
- `PET_LARGE` - Large PET bottles
- `BLANK` - Blank space filler

### Row Constraints

Rows can specify which product types they accept:
- `"all"` - Accepts any product type
- `["CAN", "TETRA"]` - Accepts only cans and tetra packs
- `["LSS"]` - Accepts only large single-serve bottles

---

## Multi-Door Layout Specifications

### Constants

```typescript
DOOR_GAP = 16;           // Gap between doors (pixels)
HEADER_HEIGHT = 90;      // Header height (pixels)
GRILLE_HEIGHT = 16;      // Grille height (pixels)
FRAME_BORDER = 16;       // Frame border width (pixels)
```

### Door Offset Calculation

For multi-door layouts, each door's X-offset is calculated as:

```typescript
// Door-1: FRAME_BORDER
// Door-2: FRAME_BORDER + door1Width + (FRAME_BORDER * 2) + DOOR_GAP
// Door-3: FRAME_BORDER + door1Width + door2Width + (FRAME_BORDER * 4) + (DOOR_GAP * 2)
```

### Total Dimensions

- **Total Width:** `sum of (doorWidth + FRAME_BORDER * 2) + (doorCount - 1) * DOOR_GAP`
- **Total Height:** `contentHeight + HEADER_HEIGHT + GRILLE_HEIGHT + (FRAME_BORDER * 2)`
