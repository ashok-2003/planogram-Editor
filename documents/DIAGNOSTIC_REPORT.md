# Multi-Door Comprehensive Diagnostic Report
**Generated**: November 18, 2025  
**Status**: Analysis Phase

---

## 🎯 Executive Summary

The application currently works with "patches" but needs comprehensive refactoring to achieve production quality. This report identifies all issues and provides a systematic fix plan.

---

## 🔍 Issues Identified

### CRITICAL Issues (Must Fix)

#### 1. **Helper Functions Create Unnecessary Complexity**
**Location**: `lib/store.ts`  
**Problem**: `_getRefrigeratorData` and `_updateRefrigeratorData` add branching logic and complexity
- Used in 20+ locations
- Creates dual-state management confusion
- Makes debugging harder
- Violates single source of truth principle

**Impact**: High - Core architectural issue  
**Solution**: Inline the logic and use direct access to `refrigerators[doorId]`

#### 2. **Backward Compatibility Bloat**
**Location**: `lib/store.ts` state
**Problem**: Still maintaining `refrigerator` (singular) for backward compatibility
```typescript
refrigerator: Refrigerator;  // OLD - deprecated but kept
refrigerators: MultiDoorRefrigerator;  // NEW - actual source of truth
```

**Impact**: Medium - Causes confusion, wastes memory  
**Solution**: Remove after verifying no code uses it

#### 3. **History System Uses Union Types**
**Location**: `lib/store.ts`
**Problem**: History can be `Refrigerator | MultiDoorRefrigerator`
```typescript
history: (Refrigerator | MultiDoorRefrigerator)[];
```

**Impact**: Medium - Makes undo/redo complex  
**Solution**: Normalize to always use `MultiDoorRefrigerator` format

#### 4. **Validation Functions May Not Support Multi-Door**
**Location**: `lib/validation.ts`
**Problem**: Functions like `findConflicts`, `findDimensionalConflicts` take single `Refrigerator`
```typescript
export function findConflicts(refrigerator: Refrigerator): string[]
```

**Impact**: High - May miss conflicts in multi-door layouts  
**Solution**: Update to accept `MultiDoorRefrigerator` and check all doors

#### 5. **localStorage May Have Old Draft Format**
**Location**: `lib/store.ts` - persistence functions
**Problem**: Old drafts saved before multi-door refactor may fail to load
- No migration helper exists
- Could cause crashes or data loss

**Impact**: High - User data at risk  
**Solution**: Add `migrateDraftIfNeeded()` helper

---

### HIGH Priority Issues

#### 6. **Backend Transform Needs Verification**
**Location**: `lib/backend-transform.ts` - `convertMultiDoorFrontendToBackend`
**Problem**: Function exists but needs testing with real 2-door layouts
- X-coordinate calculation for door offsets
- Door merging logic
- Bounding box scaling

**Impact**: High - Export failure = unusable feature  
**Solution**: Test and verify with 2-door layout

#### 7. **BoundingBoxOverlay Multi-Door Support**
**Location**: `app/planogram/components/BoundingBoxOverlay.tsx`
**Problem**: Uses `convertMultiDoorFrontendToBackend` but needs verification
- May not handle door offsets correctly
- Visual alignment might be off

**Impact**: Medium - Visual bug in overlay  
**Solution**: Test and fix if needed

---

### MEDIUM Priority Issues

#### 8. **findStackLocation May Not Always Return doorId**
**Location**: `lib/store.ts`
**Problem**: Type says `doorId?: string` (optional), but code assumes it exists
```typescript
type StackLocation = { doorId?: string; rowId: string; stackIndex: number; itemIndex: number; };
```

**Impact**: Medium - Could cause bugs in multi-door scenarios  
**Solution**: Make `doorId` required, ensure it's always set

#### 9. **Duplicate Code in initializeLayout and switchLayout**
**Location**: `lib/store.ts`
**Problem**: Both functions have similar logic for handling multi-door initialization
- Code duplication
- Hard to maintain

**Impact**: Low - Maintainability issue  
**Solution**: Extract common logic to helper

---

### LOW Priority Issues

#### 10. **Console Logs in Production Code**
**Location**: `lib/store.ts` - `addItemFromSku`
```typescript
console.log('🔧 addItemFromSku called:', ...)
console.log('📦 Current fridge data:', ...)
```

**Impact**: Low - Performance/security minor concern  
**Solution**: Remove or wrap in DEV check

---

## 📋 Refactor Execution Plan

### Phase 1: Foundation Cleanup (Critical Path)
**Goal**: Fix core architectural issues

1. ✅ **Fix Nested `set()` Bug** (DONE)
   - Remove nested `set()` calls from all actions
   - Status: Completed for all 8 functions

2. **Normalize History System**
   - Change history type to only `MultiDoorRefrigerator[]`
   - Update `pushToHistory` helper
   - Ensure undo/redo always uses multi-door format

3. **Inline Helper Functions**
   - Remove `_getRefrigeratorData` 
   - Remove `_updateRefrigeratorData`
   - Use direct access: `refrigerators[doorId]`
   - Update history manually in each action

4. **Make doorId Required**
   - Update `StackLocation` type: `doorId: string` (not optional)
   - Update `findStackLocation` to always return doorId
   - Add default 'door-1' where needed

5. **Remove Deprecated State**
   - Remove `refrigerator: Refrigerator` from state
   - Verify no code depends on it
   - Update all consumers to use `refrigerators['door-1']`

---

### Phase 2: Validation & Data Integrity
**Goal**: Ensure validation works for multi-door

6. **Update Validation Functions**
   - Modify `findConflicts` to accept `MultiDoorRefrigerator`
   - Modify `findDimensionalConflicts` similarly
   - Loop through all doors and aggregate conflicts
   - Test with 2-door layout

7. **Add Draft Migration**
   - Create `migrateDraftIfNeeded(draft)` helper
   - Check if draft has old format (single `refrigerator`)
   - Convert to multi-door format if needed
   - Update `loadFromLocalStorage` to use migration

---

### Phase 3: Backend & Export
**Goal**: Verify export functionality

8. **Test Backend Transform**
   - Create test case with 2-door layout
   - Verify X-coordinates account for door offsets
   - Verify bounding boxes scale correctly
   - Verify doors merge into single array

9. **Fix BoundingBoxOverlay**
   - Test visual alignment with 2-door layout
   - Fix any offset issues
   - Verify drag preview works correctly

---

### Phase 4: Polish & Cleanup
**Goal**: Production-ready code quality

10. **Remove Console Logs**
    - Remove debug logs from store
    - Add proper error handling
    - Use environment checks for dev-only logs

11. **Extract Common Logic**
    - Refactor `initializeLayout` and `switchLayout`
    - Create shared helper for initialization
    - Reduce code duplication

12. **Comprehensive Testing**
    - Test all drag & drop scenarios
    - Test undo/redo extensively
    - Test cross-door moves
    - Test stacking
    - Test deletion
    - Test replacement
    - Test width adjustment
    - Test backend export
    - Test draft save/restore

---

## 🎬 Next Actions

### Immediate (Do First)
1. **Normalize History System** - Critical for undo/redo stability
2. **Inline Helper Functions** - Simplifies architecture
3. **Make doorId Required** - Prevents bugs

### Soon After
4. **Update Validation** - Critical for data integrity
5. **Add Draft Migration** - Protect user data

### Before Launch
6. **Test Backend Export** - Verify end-to-end flow
7. **Comprehensive Testing** - No bugs escape

---

## 🤔 Questions for Clarification

1. **Backward Compatibility**: Do we need to support loading old single-door layouts, or can we assume all layouts are now multi-door format?

2. **Migration Strategy**: For existing drafts in localStorage, should we:
   - Automatically migrate them on load?
   - Show a warning and ask user to confirm?
   - Just clear old drafts?

3. **Validation Scope**: Should dimension/conflict validation:
   - Check each door independently?
   - Consider the entire multi-door system as one unit?
   - Both?

4. **Testing Priority**: Which features are most critical to test first?
   - Drag & drop between doors?
   - Undo/redo with multi-door?
   - Backend export?
   - Draft persistence?

---

## 📊 Estimated Work

- **Phase 1**: ~2-3 hours (Foundation cleanup)
- **Phase 2**: ~1-2 hours (Validation & migration)
- **Phase 3**: ~1-2 hours (Backend & export testing)
- **Phase 4**: ~1-2 hours (Polish & testing)

**Total**: ~5-9 hours of focused work

---

## ✅ Ready to Begin?

Waiting for your answers to the questions above, then we'll start with **Phase 1: Foundation Cleanup**.
