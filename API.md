
# Planogram Editor API Specification

This document outlines the API endpoints and data structures required for the Planogram Editor application.

## Data Types

These types are based on the existing `lib/types.ts` file.

```typescript
/**
 * Represents a stock-keeping unit (SKU). This is a template for an item.
 */
export interface Sku {
  skuId: string;
  name: string;
  widthMM: number;
  heightMM: number;
  imageUrl: string;
  productType: string; // e.g., 'PET', 'SSS', 'TETRA'
  constraints: {
    stackable: boolean;
    deletable: boolean;
  };
}

/**
 * Represents a single row (shelf) in a refrigerator layout.
 */
export interface Row {
  id: string; // e.g., 'row-1'
  capacity: number; // in pixels
  maxHeight: number; // in pixels
  allowedProductTypes: 'all' | string[];
}

/**
 * Represents a full refrigerator layout.
 */
export interface RefrigeratorLayout {
  [key: string]: Row;
}

/**
 * Represents the complete data for a specific refrigerator model.
 */
export interface LayoutData {
  id: string; // e.g., 'g-26c'
  name: string;
  width: number; // in pixels
  height: number; // in pixels
  layout: RefrigeratorLayout;
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
-   **Description:** Retrieves the detailed structure of a single refrigerator layout.
-   **URL Parameters:**
    -   `layoutId` (string, required): The ID of the layout to retrieve (e.g., `g-26c`).
-   **Response Body:**
    ```json
    {
      "id": "g-26c",
      "name": "G-26c Upright Cooler",
      "width": 505,
      "height": 981,
      "layout": {
        "row-1": {
          "id": "row-1",
          "capacity": 505,
          "maxHeight": 245,
          "allowedProductTypes": ["CAN", "TETRA"]
        },
        "row-2": {
          "id": "row-2",
          "capacity": 505,
          "maxHeight": 245,
          "allowedProductTypes": ["SSS", "PET_SMALL", "CAN", "TETRA"]
        },
        "row-3": {
          "id": "row-3",
          "capacity": 505,
          "maxHeight": 245,
          "allowedProductTypes": ["LSS"]
        },
        "row-4": {
          "id": "row-4",
          "capacity": 505,
          "maxHeight": 245,
          "allowedProductTypes": ["SMS", "PET_LARGE"]
        }
      }
    }
    ```

### 3. Get All SKUs

-   **Endpoint:** `GET /api/skus`
-   **Description:** Retrieves a list of all available SKUs.
-   **Response Body:**
    ```json
    {
      "skus": [
        {
          "skuId": "sku-coke-can",
          "name": "Coke Can",
          "widthMM": 66,
          "heightMM": 123,
          "imageUrl": "/skus/coke-can.png",
          "productType": "CAN",
          "constraints": {
            "stackable": true,
            "deletable": true
          }
        }
      ]
    }
    ```

### 4. Search SKUs

-   **Endpoint:** `GET /api/skus/search`
-   **Description:** Searches for SKUs based on a query string.
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
