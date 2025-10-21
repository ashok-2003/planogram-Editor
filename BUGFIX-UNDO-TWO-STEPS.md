# Bug Fix: Undo Going Two Steps Backward 🐛

## Problem
When users pressed undo (Ctrl+Z), the state would go back **two steps** instead of one, while redo worked correctly going forward one step.

## Root Cause
The history was being saved **after** the state change, which meant:
1. Initial state: `[A]` (index 0)
2. User makes change: State becomes `B`, then saves `A` to history: `[A, A]` (index 1)
3. User makes another change: State becomes `C`, then saves `B`: `[A, A, B]` (index 2)
4. User presses undo: Goes to index 1, which is `A` (skipping `B`)

This caused the "two steps back" behavior because we were duplicating the previous state instead of saving the new state.

## Solution
Changed the history management approach:

### Before (Buggy)
```typescript
// Saved BEFORE the change (wrong)
const historyUpdate = saveToHistory(state.refrigerator, state.history, state.historyIndex);
return { refrigerator: newFridge, ...historyUpdate };
```

### After (Fixed)
```typescript
// Save AFTER the change (correct)
const historyUpdate = pushToHistory(newFridge, state.history, state.historyIndex);
return { refrigerator: newFridge, ...historyUpdate };
```

### New Flow
1. Initial state: `[A]` (index 0)
2. User makes change to `B`: Push `B` to history: `[A, B]` (index 1)
3. User makes change to `C`: Push `C` to history: `[A, B, C]` (index 2)
4. User presses undo: Go to index 1, which is `B` ✅ (correct!)
5. User presses undo again: Go to index 0, which is `A` ✅ (correct!)

## Changes Made

### 1. Split History Functions
- **`saveToHistory()`** - Removed (was causing the bug)
- **`pushToHistory()`** - New function that pushes the NEW state after modification

### 2. Updated All Actions
All 8 mutation actions now use `pushToHistory()` instead of `saveToHistory()`:
- ✅ `removeItemsById`
- ✅ `duplicateAndAddNew`
- ✅ `duplicateAndStack`
- ✅ `replaceSelectedItem`
- ✅ `addItemFromSku`
- ✅ `moveItem`
- ✅ `reorderStack`
- ✅ `stackItem`

### 3. Fixed Initial State
Updated `planogramEditor.tsx` to properly initialize history with the initial layout:
```typescript
usePlanogramStore.setState({ 
  refrigerator: initialLayout,
  history: [JSON.parse(JSON.stringify(initialLayout))],
  historyIndex: 0
});
```

## Testing

### Test Case 1: Basic Undo/Redo
1. ✅ Start with empty refrigerator
2. ✅ Add item A
3. ✅ Add item B
4. ✅ Press undo → Item B removed (correct!)
5. ✅ Press undo → Item A removed (correct!)
6. ✅ Press redo → Item A restored (correct!)
7. ✅ Press redo → Item B restored (correct!)

### Test Case 2: Branching History
1. ✅ Add item A
2. ✅ Add item B
3. ✅ Press undo → B removed
4. ✅ Add item C (future history with B is discarded)
5. ✅ Press undo → C removed, back to just A

### Test Case 3: Multiple Operations
1. ✅ Add item
2. ✅ Move item
3. ✅ Duplicate item
4. ✅ Delete item
5. ✅ Each undo goes back exactly one operation

## Files Modified

1. **`lib/store.ts`**
   - Removed `saveToHistory()` function
   - Added `pushToHistory()` function
   - Updated all 8 mutation actions

2. **`app/planogram/components/planogramEditor.tsx`**
   - Fixed initial history state setup
   - Fixed layout switching history reset

## Result
✅ **Bug Fixed!** Undo now correctly goes back one step at a time, matching redo behavior.

## Commit Message
```bash
git add .
git commit -m "fix: Undo going two steps backward instead of one

- Replace saveToHistory() with pushToHistory() to save state after changes
- Fix history initialization in planogramEditor
- Update all 8 mutation actions to use correct history management
- Undo now correctly goes back one step, matching redo behavior"
```
