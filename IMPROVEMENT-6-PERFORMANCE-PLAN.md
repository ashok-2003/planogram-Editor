# Improvement #6: Performance Optimization 🚀

## Current Status: IN PROGRESS

## Goals
Optimize the planogram editor for better performance, smoother interactions, and scalability with large datasets.

## Performance Issues to Address

### 1. **Unnecessary Re-renders**
- Components re-render even when their props haven't changed
- Expensive computations run on every render
- Event handlers recreated on each render

### 2. **Validation Performance**
- Validation runs on every drag operation
- No debouncing for heavy validations
- Conflicts calculated multiple times

### 3. **Image Loading**
- SKU images not optimized
- All images load immediately
- No lazy loading or optimization

### 4. **Component Rendering**
- Large lists render all items
- No memoization of expensive components
- Drag operations trigger full tree re-renders

---

## Implementation Plan

### Phase 1: Component Memoization (HIGH IMPACT)

#### A. Memoize Expensive Components
1. **`ItemComponent`** - Re-renders on every drag
2. **`StackComponent`** - Many stacks re-render unnecessarily
3. **`RowComponent`** - Entire rows re-render
4. **SKU Cards in Palette** - Already optimized with virtual scrolling

**Implementation:**
```tsx
export const ItemComponent = React.memo(({ item, isActive, ... }) => {
  // Component logic
}, (prevProps, nextProps) => {
  // Custom comparison for performance
  return prevProps.item.id === nextProps.item.id &&
         prevProps.isActive === nextProps.isActive;
});
```

#### B. Memoize Expensive Computations
1. **Conflict detection** - Cache results
2. **Layout statistics** - Don't recalculate on every render
3. **Validation results** - Cache per drag operation

**Implementation:**
```tsx
const conflicts = useMemo(() => {
  return findConflicts(refrigerator);
}, [refrigerator]);

const stats = useMemo(() => {
  return calculateStatistics(refrigerator);
}, [refrigerator]);
```

#### C. Stabilize Event Handlers
1. **Drag handlers** - Use `useCallback`
2. **Button click handlers** - Prevent recreation
3. **Form handlers** - Stable references

**Implementation:**
```tsx
const handleDragEnd = useCallback((event: DragEndEvent) => {
  // Handler logic
}, [/* minimal dependencies */]);
```

---

### Phase 2: Image Optimization (MEDIUM IMPACT)

#### A. Use Next.js Image Component
- Replace `<img>` with `<Image>`
- Automatic optimization
- Lazy loading built-in
- WebP conversion

**Implementation:**
```tsx
import Image from 'next/image';

<Image
  src={sku.imageUrl}
  alt={sku.name}
  width={80}
  height={80}
  loading="lazy"
  placeholder="blur"
/>
```

#### B. Image Preloading
- Preload visible SKU images
- Use IntersectionObserver for lazy loading
- Blur placeholder while loading

---

### Phase 3: Code Splitting (LOW IMPACT, FUTURE BENEFIT)

#### A. Dynamic Imports
```tsx
const StatePreview = dynamic(() => import('./statePreview'), {
  loading: () => <Spinner />,
  ssr: false,
});
```

#### B. Route-based Splitting
- Already done by Next.js automatically
- Consider splitting large components

---

### Phase 4: Validation Optimization (MEDIUM IMPACT)

#### A. Debounced Validation
```tsx
const debouncedValidate = useMemo(
  () => debounce((refrigerator) => {
    const conflicts = findConflicts(refrigerator);
    setConflictIds(conflicts.map(c => c.itemId));
  }, 300),
  []
);
```

#### B. Smart Validation
- Only validate affected rows during drag
- Skip validation when rules disabled
- Cache validation results

---

### Phase 5: Performance Monitoring

#### A. React DevTools Profiler
- Identify slow components
- Find unnecessary renders
- Optimize hot paths

#### B. Bundle Analysis
```bash
npm run build
# Analyze bundle with @next/bundle-analyzer
```

#### C. Performance Metrics
- Measure render times
- Track interaction latency
- Monitor memory usage

---

## Expected Improvements

### Before Optimization:
- ItemComponent re-renders: ~50-100 times per drag operation
- Validation runs: Every frame during drag
- Image loading: All at once, blocks render
- Bundle size: TBD

### After Optimization:
- ItemComponent re-renders: ~5-10 times per drag operation (90% reduction)
- Validation runs: Debounced to 300ms intervals (85% reduction)
- Image loading: Progressive, optimized by Next.js
- Memory usage: Reduced by memoization

---

## Implementation Checklist

### Phase 1: Memoization ✅ COMPLETE
- [x] Memoize `ItemComponent` - Added React.memo with custom comparison
- [x] Memoize `StackComponent` - Added React.memo with custom comparison
- [x] Memoize `RowComponent` - Added React.memo with custom comparison + useMemo for computations
- [x] Add `useMemo` for conflict detection in planogramEditor
- [x] Add `useMemo` for expensive computations in Stack/Row components
- [x] Add `useCallback` for drag handlers (handleDragStart, handleDragOver, handleDragEnd)
- [x] Add `useCallback` for button handlers (handleLayoutChange, handleManualSave, etc.)
- [x] Test re-render reduction - Ready for testing

### Phase 2: Images ⏳
- [ ] Replace `<img>` with Next.js `<Image>` in SKU cards
- [ ] Replace `<img>` with Next.js `<Image>` in Items
- [ ] Add blur placeholder
- [ ] Configure image domains in next.config.ts
- [ ] Test image loading performance

### Phase 3: Validation ⏳
- [ ] Add debounced validation during drag
- [ ] Skip validation when rules disabled
- [ ] Cache validation results
- [ ] Test validation performance

### Phase 4: Monitoring ⏳
- [ ] Profile with React DevTools
- [ ] Run bundle analysis
- [ ] Document performance gains
- [ ] Create performance benchmark

---

## Testing Strategy

1. **Visual Testing**
   - Drag items and verify smoothness
   - Check for UI lag or stuttering
   - Verify no visual regressions

2. **Performance Testing**
   - Use React DevTools Profiler
   - Measure render counts
   - Compare before/after metrics

3. **Load Testing**
   - Test with 200+ SKUs
   - Test with full refrigerator (50+ items)
   - Drag operations under load

4. **Memory Testing**
   - Monitor heap usage
   - Check for memory leaks
   - Profile long sessions

---

## Next Steps

Starting with **Phase 1: Component Memoization** as it has the highest impact with low risk.

Let's begin! 🚀
