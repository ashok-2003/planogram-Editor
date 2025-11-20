# Frontend State Preview Fix

## Problems Fixed

### 1. **Duplicate Data Display** ❌
**Before:** Showing both `refrigerator` (old single-door) AND `refrigerators` (new multi-door)
```json
{
  "refrigerator": {      // ❌ Old structure (deprecated)
    "row-1": {...},
    "row-2": {...}
  },
  "refrigerators": {     // ✅ New structure (current)
    "door-1": {
      "row-1": {...},
      "row-2": {...}
    },
    "door-2": {...}
  }
}
```

**After:** Only showing `refrigerators` (current multi-door structure)
```json
{
  "refrigerators": {     // ✅ Only current structure
    "door-1": {
      "row-1": {...},
      "row-2": {...}
    },
    "door-2": {...}
  },
  "isMultiDoor": true,
  "currentLayoutId": "g-26c-double",
  "historyIndex": 49,
  "historyLength": 50
}
```

### 2. **Stale Data / Not Updating** ❌
**Before:** Using `useMemo` with only `historyIndex` and `currentLayoutId` dependencies
- State changes weren't triggering updates properly
- Data appeared "frozen" or stale

**After:** Using `useEffect` with debounced updates
- Updates whenever state actually changes
- Debounced to avoid performance issues during rapid changes
- Matches backend state preview behavior

## Implementation Details

### Key Changes

#### 1. Removed Deprecated `refrigerator` Field
```typescript
// ❌ BEFORE - Showed both old and new structures
const frontendState = {
  refrigerator: state.refrigerator,      // Old single-door
  refrigerators: state.refrigerators,    // New multi-door
  isMultiDoor: state.isMultiDoor,
  // ...
};
```

```typescript
// ✅ AFTER - Only shows current structure
const frontendState = {
  refrigerators: state.refrigerators,    // Only multi-door structure
  isMultiDoor: state.isMultiDoor,
  // ...
};
```

#### 2. Changed from `useMemo` to `useEffect` with Debouncing
```typescript
// ❌ BEFORE - Using useMemo (doesn't update reliably)
const frontendState = useMemo(() => {
  const state = usePlanogramStore.getState();
  return { /* ... */ };
}, [historyIndex, currentLayoutId]);

const formattedState = JSON.stringify(frontendState, null, 2);
```

```typescript
// ✅ AFTER - Using useEffect with debounce (updates reliably)
const [formattedState, setFormattedState] = useState<string>('');
const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

useEffect(() => {
  if (updateTimeoutRef.current) {
    clearTimeout(updateTimeoutRef.current);
  }

  updateTimeoutRef.current = setTimeout(() => {
    const state = usePlanogramStore.getState();
    const frontendState = { /* ... */ };
    const formatted = JSON.stringify(frontendState, null, 2);
    setFormattedState(formatted);
  }, 100); // 100ms debounce

  return () => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
  };
}, [historyIndex, currentLayoutId, refrigerators]);
```

### Why This Works Better

1. **No Duplicate Data**
   - Removed `refrigerator` field completely
   - Only shows `refrigerators` (the current source of truth)
   - Cleaner, more accurate representation

2. **Real-Time Updates**
   - `useEffect` runs whenever dependencies change
   - `refrigerators` dependency ensures updates on ANY state change
   - Debouncing prevents excessive re-renders during rapid changes

3. **Matches Backend Preview**
   - Same pattern as `BackendStatePreview.tsx`
   - Consistent behavior across both preview components
   - Easier to understand and maintain

## Files Modified

### `app/planogram/components/FrontendStatePreview.tsx`
- Added `useEffect` with debounced updates
- Added `useRef` for timeout management
- Changed `formattedState` from computed value to state
- Removed `refrigerator` from displayed data
- Added `refrigerators` as dependency to ensure updates

## Testing Checklist

- [x] Frontend state preview shows only `refrigerators` (no duplicate `refrigerator`)
- [x] State updates in real-time when adding/moving/deleting items
- [x] No performance issues during rapid drag-and-drop operations
- [x] Copy to clipboard works correctly
- [x] Debouncing prevents excessive updates (100ms delay)
- [x] Works for both single-door and multi-door setups

## Example Output

### Multi-Door Layout (g-26c-double)
```json
{
  "refrigerators": {
    "door-1": {
      "row-0": {
        "id": "row-0",
        "capacity": 269,
        "maxHeight": 131,
        "allowedProductTypes": "all",
        "stacks": [[{...}, {...}], [{...}]]
      },
      "row-1": {...},
      "row-2": {...},
      "row-3": {...}
    },
    "door-2": {
      "row-0": {...},
      "row-1": {...},
      "row-2": {...},
      "row-3": {...}
    }
  },
  "isMultiDoor": true,
  "currentLayoutId": "g-26c-double",
  "historyIndex": 5,
  "historyLength": 6
}
```

### Single-Door Layout (g-26c)
```json
{
  "refrigerators": {
    "door-1": {
      "row-0": {
        "id": "row-0",
        "capacity": 673,
        "maxHeight": 131,
        "allowedProductTypes": "all",
        "stacks": [[{...}], [{...}]]
      },
      "row-1": {...},
      "row-2": {...},
      "row-3": {...}
    }
  },
  "isMultiDoor": false,
  "currentLayoutId": "g-26c",
  "historyIndex": 3,
  "historyLength": 4
}
```

## Benefits

1. ✅ **Cleaner Data** - No duplicate/deprecated fields
2. ✅ **Real-Time Updates** - State changes reflected immediately
3. ✅ **Better Performance** - Debouncing prevents excessive re-renders
4. ✅ **Consistent Behavior** - Matches backend state preview
5. ✅ **Easier Debugging** - Shows only current, relevant data

## Status
✅ **COMPLETE** - Frontend state preview now shows clean, up-to-date data without duplicates.
