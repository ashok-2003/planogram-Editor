# Backend Transform - Modular Architecture

## 📁 Module Structure

The backend transformation logic is now split into three focused modules:

### 1. `lib/bounding-box-generator.ts`
**Purpose**: Generate bounding boxes for products

**Exports**:
- `generateBoundingBox()` - Creates 4-corner bounding box with absolute coordinates
- `generateSectionPolygon()` - Creates section outline (optional feature)

**Responsibilities**:
- Calculate product positions with frame/header offsets
- Handle absolute coordinate system from refrigerator top-left
- Support for stacked products

### 2. `lib/bounding-box-scaler.ts`
**Purpose**: Scale bounding boxes to match captured image coordinates

**Exports**:
- `scaleBoundingBox()` - Scale single bounding box
- `scaleProduct()` - Scale product and all stacked items recursively
- `scaleBackendBoundingBoxes()` - Scale entire backend output

**Responsibilities**:
- Multiply coordinates by pixel ratio (from `lib/config.ts`)
- Scale product dimensions (width/height)
- Handle nested stacked products
- Scale dimension metadata

### 3. `lib/backend-transform.ts`
**Purpose**: Core transformation logic from frontend to backend format

**Exports**:
- `convertFrontendToBackend()` - Main transformation function
- `scaleBackendBoundingBoxes` - Re-exported from scaler for convenience

**Responsibilities**:
- Convert frontend refrigerator structure to backend format
- Calculate row positions and stack positions
- Orchestrate bounding box generation
- Manage backend data structure

## 🔄 Data Flow

```
Frontend Data
     ↓
convertFrontendToBackend()
     ↓
  Uses: generateBoundingBox() ← lib/bounding-box-generator.ts
     ↓
Backend Data (browser coordinates)
     ↓
scaleBackendBoundingBoxes() ← lib/bounding-box-scaler.ts
     ↓
Backend Data (scaled for image)
```

## 📝 Usage Examples

### Basic Transformation

```typescript
import { convertFrontendToBackend } from '@/lib/backend-transform';

const backendData = convertFrontendToBackend(
  refrigerator,
  301,  // width
  788   // height
);
```

### With Scaling

```typescript
import { convertFrontendToBackend } from '@/lib/backend-transform';
import { scaleBackendBoundingBoxes } from '@/lib/bounding-box-scaler';

// Step 1: Convert to backend format
const backendData = convertFrontendToBackend(refrigerator, 301, 788);

// Step 2: Scale for captured image
const scaledData = scaleBackendBoundingBoxes(backendData);
// Uses PIXEL_RATIO from config automatically
```

### Custom Scaling

```typescript
import { scaleBackendBoundingBoxes } from '@/lib/bounding-box-scaler';

// Scale with custom pixel ratio
const scaled2x = scaleBackendBoundingBoxes(backendData, 2);
const scaled4x = scaleBackendBoundingBoxes(backendData, 4);
```

### Direct Bounding Box Generation

```typescript
import { generateBoundingBox } from '@/lib/bounding-box-generator';

const bbox = generateBoundingBox(
  item,              // Product item
  100,               // X position
  200,               // Row Y start
  0,                 // Stack height below
  180,               // Row max height
  16,                // Frame border
  100                // Header height
);
// Returns: [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
```

## ✅ Benefits of Modular Architecture

### 1. **Separation of Concerns**
- Generation logic isolated from scaling logic
- Each module has single responsibility
- Easier to test individual components

### 2. **Reusability**
- Use `generateBoundingBox()` independently
- Use `scaleBackendBoundingBoxes()` with any backend data
- Mix and match as needed

### 3. **Maintainability**
- Changes to scaling don't affect generation
- Clear module boundaries
- Easier to locate and fix bugs

### 4. **Readability**
- Smaller, focused files
- Clear function names and purposes
- Better documentation per module

### 5. **Testability**
- Test generation separately from scaling
- Mock dependencies easily
- Isolated unit tests possible

## 🔧 Configuration

All modules respect the central configuration:

```typescript
// lib/config.ts
export const PIXEL_RATIO = 3;
```

Changes to `PIXEL_RATIO` automatically affect:
- ✅ Image capture (`lib/capture-utils.ts`)
- ✅ Bounding box scaling (`lib/bounding-box-scaler.ts`)
- ✅ State preview display

## 📊 Module Dependencies

```
backend-transform.ts
  ├─ imports → bounding-box-generator.ts
  ├─ imports → types.ts
  └─ re-exports → bounding-box-scaler.ts

bounding-box-generator.ts
  └─ imports → types.ts

bounding-box-scaler.ts
  ├─ imports → config.ts
  └─ imports → backend-transform.ts (types only)
```

## 🎯 Backward Compatibility

Old imports still work:

```typescript
// ✅ Still works (uses re-export)
import { 
  convertFrontendToBackend, 
  scaleBackendBoundingBoxes 
} from '@/lib/backend-transform';

// ✅ Also works (direct import from new module)
import { scaleBackendBoundingBoxes } from '@/lib/bounding-box-scaler';
```

## 📦 Files Changed

### New Files Created
- ✅ `lib/bounding-box-generator.ts` (80 lines)
- ✅ `lib/bounding-box-scaler.ts` (100 lines)

### Files Modified
- ✅ `lib/backend-transform.ts` (simplified from 390 to 260 lines)

### Total Lines Reduced
- Before: 390 lines in one file
- After: 80 + 100 + 260 = 440 lines in three files
- Better organization despite slight increase

## 🧪 Testing

Each module can be tested independently:

```typescript
// Test bounding box generation
import { generateBoundingBox } from '@/lib/bounding-box-generator';
test('generates correct bounding box', () => {
  const bbox = generateBoundingBox(item, 0, 0, 0, 180, 16, 100);
  expect(bbox[0]).toEqual([16, 116]); // Top-left with offsets
});

// Test scaling
import { scaleBoundingBox } from '@/lib/bounding-box-scaler';
test('scales bounding box by pixel ratio', () => {
  const bbox = [[16, 116], [16, 296], [96, 296], [96, 116]];
  const scaled = scaleBoundingBox(bbox, 3);
  expect(scaled[0]).toEqual([48, 348]); // 3x scaled
});

// Test full transformation
import { convertFrontendToBackend } from '@/lib/backend-transform';
test('converts frontend to backend', () => {
  const result = convertFrontendToBackend(refrigerator, 301, 788);
  expect(result.Cooler["Door-1"].Sections.length).toBeGreaterThan(0);
});
```

## 📚 Related Documentation

- Configuration: See `lib/config.ts`
- Type definitions: See `lib/types.ts`
- Image capture: See `lib/capture-utils.ts`
- Usage in UI: See `app/planogram/components/statePreview.tsx`

---

**Status**: ✅ Modularization Complete  
**Architecture**: Three focused modules  
**Backward Compatibility**: ✅ Maintained via re-exports  
**Code Quality**: ✅ Improved separation of concerns
