# Phase 3: Multi-Door Validation Testing Plan

## ✅ Status: No TypeScript Errors - Ready for Testing

## Overview
Phase 3 successfully updated all validation functions to support multi-door refrigerators. Now we need to verify the functionality works correctly in both single-door and multi-door modes.

---

## Testing Strategy

### Test Environment Setup
1. **Single-Door Layout**: Use `g-26c` (2-shelf cooler)
2. **Multi-Door Layout**: Use `g-52c` (2-door, 4-shelf cooler)
3. **Enable/Disable Rules**: Test with rules ON and OFF
4. **Enable/Disable Dimension Validation**: Test separately

---

## Test Suite 1: Single-Door Mode (Backward Compatibility)

### 1.1 Conflict Detection
**Steps:**
1. Load `g-26c` layout
2. Enable business rules toggle
3. Add a "FROZEN" item to a "REFRIGERATED" shelf
4. **Expected:** Item should be highlighted with red border (conflict)
5. Add another conflicting item
6. **Expected:** Both items highlighted

**Success Criteria:**
- ✅ Conflicts detected correctly
- ✅ Visual feedback shows red borders
- ✅ Conflict list updates in real-time

### 1.2 Dimension Conflict Detection
**Steps:**
1. Keep `g-26c` layout
2. Enable dimension validation toggle
3. Add items until width exceeds shelf capacity
4. **Expected:** Overflowing items highlighted in orange
5. Stack items until height exceeds shelf maxHeight
6. **Expected:** Stack items highlighted in orange

**Success Criteria:**
- ✅ Width overflow detected
- ✅ Height overflow detected
- ✅ Orange borders shown correctly

### 1.3 Drag Validation
**Steps:**
1. Keep `g-26c` layout
2. Enable business rules
3. Drag a "FROZEN" item
4. **Expected:** Only shelves that accept "FROZEN" products should show green highlight
5. Hover over invalid shelf
6. **Expected:** No drop indicator shown
7. Hover over valid shelf
8. **Expected:** Blue drop indicator shown

**Success Criteria:**
- ✅ Valid shelves highlighted in green
- ✅ Invalid shelves stay default color
- ✅ Drop indicators only on valid targets

---

## Test Suite 2: Multi-Door Mode (New Functionality)

### 2.1 Conflict Detection Across All Doors
**Steps:**
1. Switch to `g-52c` layout (2 doors)
2. Enable business rules
3. Add conflicting item to **door-1, shelf-1**
4. Add conflicting item to **door-2, shelf-1**
5. **Expected:** Both items highlighted across both doors
6. Check conflict IDs in console
7. **Expected:** Console shows conflicts from both doors

**Success Criteria:**
- ✅ Door-1 conflicts detected
- ✅ Door-2 conflicts detected
- ✅ Visual feedback on both doors
- ✅ Console log shows: `conflicts === ['item-from-door-1', 'item-from-door-2']`

### 2.2 Dimension Conflicts Across All Doors
**Steps:**
1. Keep `g-52c` layout
2. Enable dimension validation
3. Overflow width in **door-1, shelf-1**
4. Overflow height in **door-2, shelf-2**
5. **Expected:** Items in both doors highlighted in orange
6. Check dimension conflicts in console

**Success Criteria:**
- ✅ Width overflow in door-1 detected
- ✅ Height overflow in door-2 detected
- ✅ Orange borders on correct items in both doors
- ✅ Console shows conflicts from both doors

### 2.3 Drag Validation with Door Context
**Steps:**
1. Keep `g-52c` layout
2. Enable business rules
3. **Drag from palette** (SKU) to door-2
4. **Expected:** Console shows `doorIdForValidation: 'door-1'` (default)
5. **Expected:** Valid shelves highlighted correctly
6. **Drag existing item** from door-2, shelf-1
7. **Expected:** Console shows `doorIdForValidation: 'door-2'`
8. **Expected:** Validation runs in door-2 context

**Success Criteria:**
- ✅ Palette items validate against door-1
- ✅ Existing items validate against their origin door
- ✅ Console logs show correct doorId
- ✅ Visual feedback matches validation context

### 2.4 Cross-Door Move with Validation
**Steps:**
1. Keep `g-52c` layout
2. Enable business rules
3. Drag item from **door-1, shelf-1** to **door-2, shelf-2**
4. **Expected:** Valid drop targets highlighted
5. Drop item
6. **Expected:** Item moves successfully
7. Check conflicts
8. **Expected:** No false conflicts from cross-door move

**Success Criteria:**
- ✅ Cross-door validation works
- ✅ Move completes successfully
- ✅ No phantom conflicts
- ✅ History records move correctly

---

## Test Suite 3: Edge Cases

### 3.1 Empty Doors
**Steps:**
1. Switch to `g-52c` layout
2. Clear all items from door-1
3. Keep items in door-2
4. Enable rules
5. **Expected:** Only door-2 items checked for conflicts
6. **Expected:** No errors from empty door

**Success Criteria:**
- ✅ No crashes from empty doors
- ✅ Conflicts only in non-empty doors
- ✅ Console shows correct conflict IDs

### 3.2 Switch Layouts with Conflicts
**Steps:**
1. Load `g-26c` with conflicts
2. Enable rules
3. Verify conflicts shown
4. Switch to `g-52c`
5. **Expected:** Conflict state resets
6. **Expected:** New layout validated correctly

**Success Criteria:**
- ✅ Conflicts cleared on layout switch
- ✅ New layout validated independently
- ✅ No carryover conflicts

### 3.3 Toggle Rules On/Off
**Steps:**
1. Load `g-52c` with conflicts in both doors
2. **Rules ON** → conflicts shown
3. **Toggle rules OFF** → conflicts cleared
4. **Toggle rules ON** → conflicts reappear
5. **Expected:** Real-time update on every toggle

**Success Criteria:**
- ✅ Conflicts appear when enabled
- ✅ Conflicts disappear when disabled
- ✅ Toggle works in multi-door mode
- ✅ No performance lag

### 3.4 Undo/Redo with Conflicts
**Steps:**
1. Load `g-52c`
2. Add conflicting item to door-1
3. **Expected:** Conflict shown
4. Add conflicting item to door-2
5. **Expected:** Both conflicts shown
6. **Undo** → door-2 conflict removed
7. **Expected:** Only door-1 conflict remains
8. **Redo** → door-2 conflict reappears
9. **Expected:** Both conflicts shown again

**Success Criteria:**
- ✅ Undo removes correct conflicts
- ✅ Redo restores correct conflicts
- ✅ Validation updates on every undo/redo
- ✅ Performance is acceptable

---

## Test Suite 4: Console Verification

### 4.1 Drag Start Logging
**Expected Console Output:**
```javascript
🎯 DRAG START DEBUG: {
  isMultiDoor: true,
  doorIdForValidation: 'door-2',
  refrigeratorsKeys: ['door-1', 'door-2'],
  draggedItem: 'sku-123'
}

📋 VALIDATION RESULT: {
  validRowIds: ['row-1', 'row-2'],
  validStackTargetIds: ['item-5'],
  doorId: 'door-2'
}
```

### 4.2 Conflict Detection Logging
**Add this temporarily to verify:**
```typescript
// In planogramEditor.tsx conflict effect
useEffect(() => {
  if (isRulesEnabled && refrigerators && Object.keys(refrigerators).length > 0) {
    const conflicts = findConflicts(refrigerators);
    console.log('🔍 CONFLICTS DETECTED:', {
      totalConflicts: conflicts.length,
      conflictIds: conflicts,
      checkedDoors: Object.keys(refrigerators)
    });
    setConflictIds(conflicts);
  }
}, [refrigerators, isRulesEnabled]);
```

---

## Performance Checks

### Check 1: No Unnecessary Re-renders
**Monitor:**
- Drag start should not trigger multiple validations
- Conflict detection should only run when refrigerators change
- No infinite loops or excessive re-renders

### Check 2: Validation Speed
**Measure:**
- Conflict detection should be < 10ms for typical layout
- Drag validation should be instant (< 5ms)
- No lag when hovering over shelves

### Check 3: Memory Usage
**Verify:**
- No memory leaks from validation functions
- History doesn't grow unbounded
- localStorage writes are debounced (1 second)

---

## Success Criteria Summary

### Phase 3 is Complete When:
- ✅ All single-door tests pass (backward compatibility)
- ✅ All multi-door tests pass (new functionality)
- ✅ All edge cases handled gracefully
- ✅ Console logs show correct behavior
- ✅ Performance is acceptable
- ✅ No TypeScript errors (already verified)
- ✅ No runtime errors
- ✅ User can drag, drop, and see conflicts in both modes

---

## Next Steps After Testing

### If All Tests Pass:
1. Document any discovered edge cases
2. Move to **Phase 4: Comprehensive Testing** (full app test)
3. Consider adding automated tests
4. Prepare for production deployment

### If Issues Found:
1. Document the specific failure
2. Create minimal reproduction case
3. Fix the issue
4. Re-run affected tests
5. Update documentation

---

## Quick Test Script

**Copy this into browser console during testing:**
```javascript
// Quick validation check
const checkValidation = () => {
  const state = window.__PLANOGRAM_STORE__;
  console.log('🔍 VALIDATION STATE CHECK:', {
    isMultiDoor: state.isMultiDoor,
    doorCount: Object.keys(state.refrigerators).length,
    doors: Object.keys(state.refrigerators),
    conflictIds: state.conflictIds || [],
    dimensionConflictIds: state.dimensionConflictIds || []
  });
  
  // Check each door's items
  Object.keys(state.refrigerators).forEach(doorId => {
    const door = state.refrigerators[doorId];
    let itemCount = 0;
    Object.keys(door).forEach(rowId => {
      itemCount += door[rowId].stacks.reduce((sum, stack) => sum + stack.length, 0);
    });
    console.log(`  ${doorId}: ${itemCount} items`);
  });
};

// Run it
checkValidation();
```

---

## Testing Timeline

| Suite | Estimated Time | Priority |
|-------|---------------|----------|
| Suite 1: Single-Door | 15 min | HIGH |
| Suite 2: Multi-Door | 20 min | HIGH |
| Suite 3: Edge Cases | 15 min | MEDIUM |
| Suite 4: Console Checks | 10 min | MEDIUM |
| Performance Checks | 10 min | LOW |
| **Total** | **70 min** | |

---

## Report Template

After testing, fill out this template:

```markdown
# Phase 3 Testing Report

**Date:** [DATE]
**Tester:** [NAME]
**Duration:** [TIME]

## Results Summary
- ✅ / ❌ Single-Door Mode: [PASS/FAIL]
- ✅ / ❌ Multi-Door Mode: [PASS/FAIL]
- ✅ / ❌ Edge Cases: [PASS/FAIL]
- ✅ / ❌ Console Verification: [PASS/FAIL]
- ✅ / ❌ Performance: [PASS/FAIL]

## Issues Found
1. [Issue description]
   - Severity: [High/Medium/Low]
   - Steps to reproduce: [...]
   - Expected: [...]
   - Actual: [...]

## Overall Assessment
[PASS / FAIL / PASS WITH MINOR ISSUES]

## Recommendations
- [Action item 1]
- [Action item 2]
```

---

**Ready to begin testing! 🚀**
