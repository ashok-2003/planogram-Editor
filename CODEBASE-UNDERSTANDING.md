# 📚 Codebase Understanding - Planogram Editor

## 🎯 Overview
This is a **Next.js-based Planogram Editor** that allows users to visually manage product layouts in refrigerator coolers. The application supports drag-and-drop, stacking, rule validation, and data persistence.

---

## 📊 Data Flow Architecture

```
Backend Data (API) 
    ↓
[data-transformer.ts] → Converts Backend → Frontend Format
    ↓
Frontend State (Zustand Store)
    ↓
User Edits (Drag & Drop, Stack, Delete, etc.)
    ↓
[backend-transform.ts] → Converts Frontend → Backend Format
    ↓
Export/Save to Backend API
```

---

## 🗂️ Core Data Structures

### Frontend Types (`lib/types.ts`)

#### 1. **Item** (Individual Product Instance)
```typescript
interface Item {
  id: string;              // Unique instance ID (e.g., 'pepsi-can-12345')
  skuId: string;           // SKU ID from backend (e.g., 'sku-pepsi-can')
  name: string;            // Product name
  width: number;           // Width in PIXELS
  height: number;          // Height in PIXELS
  widthMM?: number;        // Width in MILLIMETERS (for conversions)
  heightMM?: number;       // Height in MILLIMETERS (for conversions)
  imageUrl: string;        // Product image URL
  productType: string;     // e.g., 'PET', 'SSS', 'TETRA', 'CAN', 'BLANK'
  constraints: ItemConstraints;
  customWidth?: number;    // For BLANK spaces (adjustable width)
}
```

#### 2. **Row** (Shelf/Section)
```typescript
interface Row {
  id: string;                           // e.g., 'row-1'
  capacity: number;                     // Max width in pixels
  maxHeight: number;                    // Max height in pixels
  stacks: Item[][];                     // 2D array: [stack1[], stack2[], ...]
  allowedProductTypes: 'all' | string[]; // Rule enforcement
}
```

#### 3. **Refrigerator** (Complete Layout)
```typescript
interface Refrigerator {
  [key: string]: Row;  // e.g., { 'row-1': {...}, 'row-2': {...} }
}
```

#### 4. **Sku** (Product Template)
```typescript
interface Sku {
  skuId: string;
  name: string;
  widthMM: number;
  heightMM: number;
  width: number;       // Converted from MM using PIXELS_PER_MM
  height: number;      // Converted from MM using PIXELS_PER_MM
  imageUrl: string;
  productType: string;
  constraints: ItemConstraints;
}
```

### Backend Data Structure (`lib/backend-transform.ts`)

#### Backend Format (API Response/Request)
```typescript
interface BackendOutput {
  Cooler: {
    "Door-1": {
      data: number[][];              // Door polygon coordinates
      Sections: BackendSection[];    // Array of shelves
      "Door-Visible": boolean;
    };
  };
  dimensions: {
    width: number;
    height: number;
  };
}

interface BackendSection {
  data: number[][];           // Section polygon coordinates
  position: number;           // Section number (1, 2, 3, ...)
  products: BackendProduct[]; // Array of products in this section
}

interface BackendProduct {
  product: string;                    // Product name
  stacked: BackendProduct[] | null;   // Stacked items (recursive)
  Position: string;                   // Position in section
  "SKU-Code": string;                 // SKU identifier
  stackSize: number;                  // Number of items in stack
  Confidence: string;                 // AI confidence score
  "Bounding-Box": number[][];         // Bounding box coordinates
}
```

---

## 🔄 Data Transformation

### 1. **Backend → Frontend** (`lib/data-transformer.ts`)

**Purpose**: Convert API response into frontend-friendly format

**Key Functions**:
- `transformSkus(backendSkus)` - Converts SKU catalog
- `transformPlanogram(planogramData, allSkus)` - Converts layout data

**Transformation Logic**:
```typescript
Backend Section → Frontend Row
Backend Products → Frontend Item Stacks
Backend stacked array → Nested items in stack array
```

**Example**:
```typescript
// Backend
{
  "Sections": [{
    "position": 1,
    "products": [{
      "product": "Pepsi Can",
      "SKU-Code": "sku-pepsi",
      "stacked": [{ "SKU-Code": "sku-pepsi" }]
    }]
  }]
}

// Frontend
{
  "row-1": {
    id: "row-1",
    stacks: [
      [
        { id: "pepsi-123", skuId: "sku-pepsi", ... },
        { id: "pepsi-456", skuId: "sku-pepsi", ... }
      ]
    ]
  }
}
```

### 2. **Frontend → Backend** (`lib/backend-transform.ts`)

**Purpose**: Convert frontend state back to API format for saving

**Key Function**:
- `convertFrontendToBackend(frontendData: Refrigerator): BackendOutput`

**Transformation Logic**:
```typescript
Frontend Row → Backend Section
Frontend Stack[0] → Backend Product (front item)
Frontend Stack[1...n] → Backend Product.stacked (stacked items)
Filter out BLANK spaces (skuId === 'sku-blank-space')
```

**Example**:
```typescript
// Frontend
{
  "row-1": {
    stacks: [
      [
        { id: "pepsi-123", skuId: "sku-pepsi", name: "Pepsi" },
        { id: "pepsi-456", skuId: "sku-pepsi", name: "Pepsi" }
      ]
    ]
  }
}

// Backend
{
  "Cooler": {
    "Door-1": {
      "Sections": [{
        "position": 1,
        "products": [{
          "product": "Pepsi",
          "SKU-Code": "sku-pepsi",
          "stackSize": 2,
          "stacked": [{
            "product": "Pepsi",
            "SKU-Code": "sku-pepsi"
          }]
        }]
      }]
    }
  }
}
```

---

## 🏪 State Management (`lib/store.ts`)

**Technology**: Zustand (lightweight state management)

### State Structure
```typescript
interface PlanogramState {
  refrigerator: Refrigerator;          // Current layout
  selectedItemId: string | null;        // Currently selected item
  history: Refrigerator[];              // Undo/Redo stack
  historyIndex: number;                 // Current position in history
  
  // Persistence
  currentLayoutId: string | null;       // Active layout ID
  hasPendingDraft: boolean;             // Has unsaved changes
  draftMetadata: {...} | null;          // Draft info
  syncStatus: 'idle' | 'syncing' | 'synced';
  lastSynced: Date | null;
  
  // Actions
  actions: {
    selectItem, deleteSelectedItem, removeItemsById,
    duplicateAndAddNew, duplicateAndStack, replaceSelectedItem,
    moveItem, addItemFromSku, reorderStack, stackItem,
    undo, redo, updateBlankWidth,
    initializeLayout, switchLayout, restoreDraft, dismissDraft,
    clearDraft, manualSync
  }
}
```

### Key Store Actions

#### Product Manipulation
- **`selectItem(itemId)`** - Select/deselect an item
- **`deleteSelectedItem()`** - Delete selected item
- **`duplicateAndAddNew()`** - Duplicate item as new stack
- **`duplicateAndStack()`** - Duplicate and stack on existing
- **`replaceSelectedItem(newSku)`** - Replace with different product

#### Layout Manipulation
- **`moveItem(itemId, targetRowId, targetStackIndex)`** - Move stack to different row
- **`reorderStack(rowId, oldIndex, newIndex)`** - Reorder stacks horizontally
- **`stackItem(draggedStackId, targetStackId)`** - Stack one item on another

#### Special Features
- **`updateBlankWidth(itemId, newWidthMM)`** - Adjust blank space width
- **Auto-sort stacks by width** (narrowest at top → widest at bottom)

---

## 🎨 UI Components

### Component Hierarchy
```
PlanogramEditor (main container)
  ├── DndContext (drag-and-drop context)
  │   ├── RefrigeratorComponent
  │   │   └── RowComponent (for each row)
  │   │       └── StackComponent (for each stack)
  │   │           └── ItemComponent (for each item)
  │   └── DragOverlay (preview during drag)
  ├── SkuPalette (product catalog)
  ├── PropertiesPanel (right sidebar - minimal)
  └── InfoPanel (detailed properties when item selected)
```

### Key Components

#### 1. **`ItemComponent`** (`item.tsx`)
- Displays individual product
- Handles selection
- **Floating Action Menu** (portaled to document.body):
  - Stack button (duplicate and stack)
  - Duplicate button (duplicate as new stack)
  - Delete button
- Shows width measurement for BLANK spaces

#### 2. **`StackComponent`** (`stack.tsx`)
- Manages vertical stack of items
- Uses `useSortable` for drag-and-drop
- Auto-sorts by width (ascending)
- Visual feedback for valid drop targets

#### 3. **`RowComponent`** (`row.tsx`)
- Represents a shelf/section
- Uses `useDroppable` for drop zones
- Enforces height constraints
- Shows disabled state for invalid drops

#### 4. **`RefrigeratorComponent`** (`Refrigerator.tsx`)
- Main container with exact dimensions
- Professional styling (header, grille, frame)
- Empty state message
- Displays layout name and badge

#### 5. **`StatePreview`** (`statePreview.tsx`)
- **LIVE BACKEND DATA PREVIEW**
- Uses `convertFrontendToBackend()` to show real-time backend format
- Copy to clipboard button
- JSON syntax highlighting

---

## 🔧 Core Features

### 1. **Drag & Drop** (dnd-kit)
- **Reorder Mode**: Rearrange stacks horizontally within/between rows
- **Stack Mode**: Stack items vertically
- Visual feedback for valid/invalid drop targets
- Constraint validation during drag

### 2. **Rule Enforcement** (`lib/validation.ts`)
- **Product Type Rules**: Each row allows specific product types
- **Height Constraints**: Stack height cannot exceed `row.maxHeight`
- **Width Constraints**: Total row width cannot exceed `row.capacity`
- **Toggle**: Rules can be enabled/disabled
- **Conflict Detection**: Auto-highlights violating items

### 3. **Undo/Redo** (`store.ts`)
- Full history management (last 50 states)
- Every action pushes to history
- Keyboard shortcuts support

### 4. **Persistence** (localStorage)
- **Auto-save**: Debounced (1 second delay)
- **Draft Management**: Restore unsaved work (2-day expiry)
- **Manual Sync**: Force save button
- **Layout Switching**: Save current before switching

### 5. **Measurements** (MM ↔ Pixels)
- **`PIXELS_PER_MM = 0.4`** (config.ts)
- All dimensions stored in both units
- Visual rulers (optional feature)

### 6. **Blank Spaces**
- Dynamic width adjustment (25mm - available space)
- Auto-fills row height
- Visual width indicator
- Slider + input field in InfoPanel

---

## 📦 Data Persistence Strategy

### LocalStorage Format
```typescript
Key: `planogram-draft-${layoutId}`
Value: {
  refrigerator: Refrigerator;
  history: Refrigerator[];
  historyIndex: number;
  layoutId: string;
  timestamp: string;  // ISO format
}
```

### Auto-Save Flow
```
User Action → Store Update → Debounced Save (1s) → LocalStorage
                           ↓
                    Update syncStatus
```

### Draft Restoration Flow
```
Page Load → initializeLayout(layoutId, initialLayout)
    ↓
Check localStorage for draft
    ↓
If found & not expired (< 2 days):
    → Load draft
    → Show restore prompt
    → Set hasPendingDraft = true
Else:
    → Use initialLayout
```

---

## 🎯 Key Business Logic

### 1. **Stack Width Calculation**
```typescript
// Use WIDEST item in stack (not first item)
const getStackWidth = (stack: Item[]): number => {
  return Math.max(...stack.map(item => item.width));
};
```

### 2. **Gap Calculation**
```typescript
// Account for 1px gap between each stack
const gapWidth = Math.max(0, row.stacks.length - 1);
const totalWidth = usedWidth + gapWidth;
```

### 3. **Auto-Sort Stacks**
```typescript
// After stacking, sort by width (ascending)
// narrowest at TOP (array[0]) → widest at BOTTOM
stack.sort((a, b) => a.width - b.width);
```

### 4. **Constraint Validation**
- **Width**: `totalWidth + gapWidth <= row.capacity`
- **Height**: `stackHeight <= row.maxHeight`
- **Type**: `row.allowedProductTypes === 'all' || allowedProductTypes.includes(item.productType)`

---

## 🔌 API Integration Points

### Current State
- **Mock Data**: Using `demo-sku.ts` and `planogram-data.ts`
- **No Active API**: Transformers ready but not connected

### Future Integration Points

#### 1. **Fetch Layouts & SKUs**
```typescript
// Replace in page.tsx
const response = await fetch('/api/planograms');
const data = await response.json();
const skus = transformSkus(data.skus);
const layout = transformPlanogram(data.planogram, skus);
```

#### 2. **Save Layout**
```typescript
const backendData = convertFrontendToBackend(refrigerator);
await fetch('/api/planograms', {
  method: 'POST',
  body: JSON.stringify(backendData)
});
```

---

## 🧪 Testing the Transformation

### Manual Test
1. Open app at `http://localhost:3000/planogram`
2. Add/edit products
3. Scroll to bottom → **"Live State Preview (Backend Format)"**
4. Click **Copy** button
5. Verify JSON structure matches backend expectations

---

## 🚀 Key Files Summary

| File | Purpose |
|------|---------|
| `lib/types.ts` | TypeScript type definitions |
| `lib/store.ts` | Zustand state management |
| `lib/backend-transform.ts` | **Frontend → Backend converter** |
| `lib/data-transformer.ts` | **Backend → Frontend converter** |
| `lib/validation.ts` | Rule enforcement logic |
| `lib/config.ts` | Global constants (PIXELS_PER_MM) |
| `lib/demo-sku.ts` | Mock SKU data |
| `lib/planogram-data.ts` | Mock layout data |
| `app/planogram/components/planogramEditor.tsx` | Main editor container |
| `app/planogram/components/item.tsx` | Product item with floating menu |
| `app/planogram/components/statePreview.tsx` | **Backend JSON preview** |

---

## 💡 Important Notes

1. **BLANK Spaces**: 
   - Always filtered out in backend export (`skuId === 'sku-blank-space'`)
   - Used for layout spacing only

2. **Stack Visual Display**:
   - Uses `flex-col-reverse` CSS
   - Array[0] (narrowest) shows at TOP
   - Array[last] (widest) shows at BOTTOM

3. **History Management**:
   - Saves state BEFORE modification
   - Pushes new state AFTER modification
   - Clears future history on new action

4. **Floating Action Menu**:
   - Uses React Portal to escape drag listeners
   - Positioned absolutely via `getBoundingClientRect()`
   - z-index: 10000 to stay above all elements

5. **Performance**:
   - Virtual scrolling for large SKU lists
   - Memoized computations
   - Debounced auto-save

---

## 🎓 Next Steps for Backend Integration

1. **Create API routes** (`/api/planograms`)
2. **Replace mock data** in `page.tsx`
3. **Add Save button** that calls `convertFrontendToBackend()`
4. **Handle API responses** with error states
5. **Add loading states** during fetch/save
6. **Implement authentication** if needed

---

Ready for your next instruction! 🚀
