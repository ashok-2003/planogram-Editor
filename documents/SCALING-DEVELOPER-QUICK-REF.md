# 🎯 Bounding Box Scaling - Developer Quick Reference

## TL;DR

```typescript
// Import the functions
import { convertFrontendToBackend, scaleBackendBoundingBoxes } from '@/lib/backend-transform';

// Get browser coordinates (1x)
const browserData = convertFrontendToBackend(fridge, 301, 788);

// Scale for captured image (3x)
const imageData = scaleBackendBoundingBoxes(browserData, 3);

// Done! Coordinates now match 903×2364px captured image
```

## When to Use What?

| Use Case | Function | Coordinates |
|----------|----------|-------------|
| 🖥️ Browser debugging | `convertFrontendToBackend()` | 1x (301×788) |
| 📸 Image overlay | `scaleBackendBoundingBoxes(data, 3)` | 3x (903×2364) |
| 🤖 ML/CV pipeline | `scaleBackendBoundingBoxes(data, 3)` | 3x (903×2364) |
| 📏 CSS measurements | `convertFrontendToBackend()` | 1x (301×788) |

## UI Quick Access

### State Preview Component

```
┌─────────────────────────────────────────────┐
│ Live State Preview (Backend Format)         │
│ ✓ Scaled 3x (matches captured image)       │
│                                             │
│ [🔍 Debug] [3x Scaled] [Copy JSON]         │
└─────────────────────────────────────────────┘
```

**Buttons:**
- 🟣 **Debug** → Logs scaling comparison to console
- 🟢 **3x Scaled** → Toggle (Green = Scaled, Gray = Browser)
- 🔵 **Copy JSON** → Copy current coordinates to clipboard

## Testing in 3 Steps

1. **Click Debug button** → Opens console with comparison
2. **Capture image** → Gets 903×2364px PNG
3. **Overlay coordinates** → Perfect alignment! ✅

## Console Output Example

```javascript
🎯 Bounding Box Scaling Comparison
Pixel Ratio: 3x
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📐 Dimensions
  Browser (1x): { width: 301, height: 788 }
  Scaled (3x): { width: 903, height: 2364 }

📦 First Product Example
  Product: Aquafina 1L
  SKU: sku-aquafina-1l
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Browser (1x) Bounding Box: [[16,116], [16,296], [96,296], [96,116]]
  Scaled (3x) Bounding Box: [[48,348], [48,888], [288,888], [288,348]]
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Browser (1x) Size: { width: 80, height: 180 }
  Scaled (3x) Size: { width: 240, height: 540 }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Total Products Scaled: 12
✅ All coordinates multiplied by 3
```

## Code Snippets

### Snippet 1: Basic Scaling
```typescript
const scaled = scaleBackendBoundingBoxes(browserData, 3);
```

### Snippet 2: Conditional Scaling
```typescript
const finalData = isForImage 
  ? scaleBackendBoundingBoxes(browserData, 3)
  : browserData;
```

### Snippet 3: Custom Pixel Ratio
```typescript
const scaled2x = scaleBackendBoundingBoxes(browserData, 2);
const scaled4x = scaleBackendBoundingBoxes(browserData, 4);
```

### Snippet 4: Debug Logging
```typescript
import { logScalingComparison } from '@/lib/backend-transform';

logScalingComparison(browserData, 3); // Check console
```

## Math Cheat Sheet

| Operation | Formula | Example |
|-----------|---------|---------|
| Browser → Image | `coord × 3` | `16 × 3 = 48` |
| Image → Browser | `coord ÷ 3` | `888 ÷ 3 = 296` |
| Width/Height | `size × 3` | `80 × 3 = 240` |

## Common Values

| Element | Browser (1x) | Image (3x) |
|---------|--------------|------------|
| Frame Border | 16px | 48px |
| Header Height | 100px | 300px |
| Grille Height | 90px | 270px |
| Content Width | 301px | 903px |
| Content Height | 788px | 2364px |
| Total Width | 333px | 999px |
| Total Height | 1004px | 3012px |

## Troubleshooting

### ❌ Bounding boxes misaligned on image
**Solution:** Ensure you're using scaled coordinates (3x)
```typescript
const scaledData = scaleBackendBoundingBoxes(browserData, 3); ✅
```

### ❌ Toggle button not working
**Solution:** Check React state updates
```typescript
const [useScaledCoords, setUseScaledCoords] = useState(true);
```

### ❌ Console logs not showing
**Solution:** Click the purple "Debug" button in State Preview

### ❌ Wrong dimensions in JSON
**Solution:** Verify toggle is on correct mode (3x Scaled vs 1x Browser)

## API Reference

### `scaleBackendBoundingBoxes(data, ratio)`

**Parameters:**
- `data: BackendOutput` - Backend data with browser coordinates
- `ratio: number` - Pixel ratio to scale by (default: 3)

**Returns:**
- `BackendOutput` - New object with scaled coordinates

**Features:**
- ✅ Deep clones (non-mutating)
- ✅ Scales all bounding boxes
- ✅ Scales width/height
- ✅ Handles stacked products recursively
- ✅ Scales dimension metadata

### `logScalingComparison(data, ratio)`

**Parameters:**
- `data: BackendOutput` - Backend data with browser coordinates
- `ratio: number` - Pixel ratio to compare (default: 3)

**Returns:**
- `void` - Logs to console

**Output:**
- Dimensions comparison
- First product example
- Total product count

## File Locations

| File | Purpose |
|------|---------|
| `lib/backend-transform.ts` | Scaling functions |
| `app/planogram/components/statePreview.tsx` | UI with toggle |
| `lib/capture-utils.ts` | Image capture (pixelRatio: 3) |

## Related Docs

- `SCALING-IMPLEMENTATION-COMPLETE.md` - Full implementation details
- `BOUNDING-BOX-SCALING-FOR-IMAGES.md` - Technical deep dive
- `BOUNDING-BOX-SCALING-QUICK-EXAMPLE.md` - Visual examples

## Quick Actions

| Action | Steps |
|--------|-------|
| **Get scaled JSON** | Toggle "3x Scaled" → Copy JSON |
| **Debug scaling** | Click "Debug" button → Check console |
| **Test alignment** | Capture image → Overlay coordinates |
| **Switch modes** | Click toggle button (Green/Gray) |

## Keyboard Shortcuts (if implemented)

```
Ctrl/Cmd + Shift + S  - Toggle scaling mode
Ctrl/Cmd + Shift + D  - Debug log
Ctrl/Cmd + Shift + C  - Copy JSON
```

## Best Practices

✅ **DO:** Use 3x scaled for all captured images  
✅ **DO:** Use 1x browser for CSS debugging  
✅ **DO:** Test with Debug button before using  
✅ **DO:** Check console for verification

❌ **DON'T:** Mix browser and image coordinates  
❌ **DON'T:** Forget to toggle before copying  
❌ **DON'T:** Scale already-scaled data  
❌ **DON'T:** Use wrong pixel ratio

## One-Liners

```typescript
// Scale for image
const img = scaleBackendBoundingBoxes(data, 3);

// Log comparison
logScalingComparison(data, 3);

// Get browser data
const browser = convertFrontendToBackend(fridge, w, h);

// Toggle in UI
onClick={() => setUseScaledCoords(!useScaledCoords)}
```

## Success Criteria

✅ Console shows correct scaling (×3)  
✅ Bounding boxes align perfectly on image  
✅ Toggle button switches between modes  
✅ JSON shows correct coordinate values  
✅ No compilation errors

---

**Last Updated:** 2025-11-07  
**Status:** ✅ Complete and Tested  
**Pixel Ratio:** 3 (configurable)
