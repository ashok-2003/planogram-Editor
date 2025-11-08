# Pixel Ratio Configuration Integration

## ✅ Integration Complete

Both image capture and bounding box scaling now use the same `PIXEL_RATIO` constant from `lib/config.ts`, ensuring perfect alignment between captured images and bounding box coordinates.

## 📁 Configuration File

**`lib/config.ts`**
```typescript
export const PIXELS_PER_MM = 0.4;
export const PIXEL_RATIO = 3;  // ← Single source of truth
```

## 🔗 Integration Points

### 1. Image Capture (`lib/capture-utils.ts`)
```typescript
import { PIXEL_RATIO } from './config';

const blob = await htmlToImage.toBlob(element, {
  pixelRatio: PIXEL_RATIO,  // Uses config value
  // ...
});
```

### 2. Bounding Box Scaling (`lib/backend-transform.ts`)
```typescript
import { PIXEL_RATIO } from './config';

export function scaleBackendBoundingBoxes(
  backendData: BackendOutput,
  pixelRatio: number = PIXEL_RATIO  // Defaults to config value
): BackendOutput
```

### 3. State Preview (`app/planogram/components/statePreview.tsx`)
```typescript
import { PIXEL_RATIO } from '@/lib/config';

// Uses config value automatically (via default parameter)
return useScaledCoords ? scaleBackendBoundingBoxes(baseData) : baseData;
```

## 🎯 Benefits

✅ **Single Source of Truth** - Change `PIXEL_RATIO` in one place  
✅ **Guaranteed Consistency** - Image and bounding boxes always match  
✅ **Easy Configuration** - No need to update multiple files  
✅ **Type Safe** - TypeScript ensures correct usage

## 🔧 How to Change Quality

Edit `lib/config.ts`:
```typescript
export const PIXEL_RATIO = 2;  // Lower quality, smaller files
export const PIXEL_RATIO = 3;  // Current: High quality (default)
export const PIXEL_RATIO = 4;  // Ultra quality, larger files
```

**Everything updates automatically!** ✨

## 📊 Impact

| Pixel Ratio | Browser | Image Size | Bounding Box Scale |
|-------------|---------|------------|-------------------|
| 2x | 301×788px | 602×1576px | All coords × 2 |
| 3x | 301×788px | 903×2364px | All coords × 3 |
| 4x | 301×788px | 1204×3152px | All coords × 4 |

## ✨ Simplified Code

**Before**: Hardcoded values scattered across files
```typescript
pixelRatio: 3  // Hardcoded in capture-utils.ts
scaleBackendBoundingBoxes(data, 3)  // Hardcoded in statePreview.tsx
```

**After**: Single config import
```typescript
import { PIXEL_RATIO } from './config';
pixelRatio: PIXEL_RATIO  // From config
scaleBackendBoundingBoxes(data)  // Uses config default
```

## 🧹 Cleanup Done

- ✅ Removed `logScalingComparison()` function (no longer needed)
- ✅ Simplified imports across all files
- ✅ Updated comments to reference config
- ✅ Removed hardcoded pixel ratio values

---

**Status**: ✅ Complete  
**Files Modified**: 3  
**Configuration File**: `lib/config.ts`  
**Current Value**: `PIXEL_RATIO = 3`
