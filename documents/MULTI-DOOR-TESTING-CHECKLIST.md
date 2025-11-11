# Multi-Door Implementation - Testing Checklist

## 🎯 IMPLEMENTATION STATUS: COMPLETE ✅

All core features have been implemented and are ready for testing.

---

## 📋 PRE-TESTING CHECKLIST

### Environment Setup
- [ ] All files saved and compiled without errors
- [ ] Development server started: `npm run dev`
- [ ] Browser open at `http://localhost:3000/planogram`
- [ ] Browser console open (F12) for any errors

---

## 🧪 TEST SUITE

### Test 1: Backward Compatibility - Single Door Layouts

#### Test 1.1: G-26c Layout
- [ ] Select "G-26c Upright Cooler" from dropdown
- [ ] **Expected**: Single door displays with 4 rows
- [ ] **Expected**: All existing features work (drag, drop, undo, redo)
- [ ] Add items to rows
- [ ] **Expected**: Items appear correctly
- [ ] Enable bounding boxes
- [ ] **Expected**: Bounding boxes align perfectly
- [ ] Check backend state preview
- [ ] **Expected**: Coordinates start at X: 16 (frame border)

#### Test 1.2: G-10f Layout
- [ ] Select "g-10f upright Cooler" from dropdown
- [ ] **Expected**: Single door displays with 3 rows
- [ ] **Expected**: All features work as before
- [ ] **Expected**: No regressions from multi-door changes

**Result**: ✅ PASS 
**Notes**: ___pass evrything works ____________________________

---

### Test 2: Multi-Door Layout - Basic Rendering

#### Test 2.1: Load Double Door Layout
- [ ] Select "G-26c Double Door Cooler" from dropdown
- [ ] **Expected**: TWO doors appear side-by-side
- [ ] **Expected**: Gap between doors is 0px (frames touch)
- [ ] **Expected**: Each door has 4 rows
- [ ] **Expected**: Both doors have same dimensions

#### Test 2.2: Visual Inspection
- [ ] Measure gap between doors (should be exactly 0px)
- [ ] Check frame borders (16px on each side)
- [ ] Check header height (80px-100px)
- [ ] Check grille height (70px-90px)
- [ ] **Expected**: Perfect alignment, no gaps or overlaps

**Result**:  ❌ FAIL
**Notes**: _________the coolers are not showing and this is the sotre data that is showing when we are clicking the multidoor 

{
  "refrigerator": {},
  "currentLayoutId": "g-26c-double",
  "historyIndex": 6,
  "historyLength": 7
}______________________

---

### Test 3: Data Operations - Door-1

#### Test 3.1: Add Items to Door-1
- [ ] Drag "Pepsi Can" from palette to Door-1, Row-1
- [ ] **Expected**: Item appears in Door-1
- [ ] Drag "Coke Can" from palette to Door-1, Row-2
- [ ] **Expected**: Item appears correctly
- [ ] Add 5-6 different items to Door-1

#### Test 3.2: Stack Items in Door-1
- [ ] Switch to "Stack" mode
- [ ] Drag one item onto another in Door-1
- [ ] **Expected**: Items stack vertically
- [ ] Create 2-3 stacks

#### Test 3.3: Reorder Items in Door-1
- [ ] Switch to "Re-Order" mode
- [ ] Drag items left/right within Door-1
- [ ] **Expected**: Items reorder smoothly
- [ ] **Expected**: No items jump between doors

**Result**: ✅ PASS / ❌ FAIL
**Notes**: _______________________________

---

### Test 4: Data Operations - Door-2

#### Test 4.1: Add Items to Door-2
- [ ] Drag items from palette to Door-2, Row-1
- [ ] **Expected**: Items appear in Door-2 (right door)
- [ ] Add items to all 4 rows of Door-2
- [ ] **Expected**: Door-1 items remain unchanged

#### Test 4.2: Independent Operations
- [ ] Add items to Door-1
- [ ] Add items to Door-2
- [ ] **Expected**: Each door operates independently
- [ ] **Expected**: No cross-contamination of data

**Result**: ✅ PASS / ❌ FAIL
**Notes**: _______________________________

---

### Test 5: Backend State & Bounding Boxes

#### Test 5.1: Backend State Preview - Single Door
- [ ] Select "G-26c" layout
- [ ] Add items to rows
- [ ] Open backend state preview panel
- [ ] Check `dimensions.width` and `dimensions.height`
- [ ] Check `BoundingBoxScale` (should be 3)
- [ ] Check Door-1 products
- [ ] **Expected**: Bounding boxes start at X: ~16-48 (frame border)
- [ ] **Expected**: All coordinates scaled by 3x

#### Test 5.2: Backend State Preview - Multi Door
- [ ] Select "G-26c Double Door" layout
- [ ] Add items to Door-1 (left)
- [ ] Add items to Door-2 (right)
- [ ] Check backend state preview
- [ ] **Expected**: Door-1 items X: ~16-48 (left side)
- [ ] **Expected**: Door-2 items X: ~737+ (right side offset)
- [ ] **Expected**: X offset difference ≈ 737px (door1 width + frames)
- [ ] **Expected**: Y coordinates same for both doors

**Calculation Check**:
```
Door-1 X Start: 16px (frame)
Door-2 X Start: 16 + 673 + 16 + 16 + 16 = 737px
Difference: 721px

After 3x scaling:
Door-1: ~48px
Door-2: ~2211px (737 * 3)
```

**Result**: ✅ PASS / ❌ FAIL
**Notes**: _______________________________

---

### Test 6: Bounding Box Overlay

#### Test 6.1: Single Door Bounding Boxes
- [ ] Select "G-26c" layout
- [ ] Add 3-4 items across different rows
- [ ] Enable "Bounding Box" toggle
- [ ] **Expected**: Green rectangles outline each item
- [ ] **Expected**: Rectangles align perfectly with items
- [ ] **Expected**: No offset or misalignment

#### Test 6.2: Multi Door Bounding Boxes
- [ ] Select "G-26c Double Door" layout
- [ ] Add items to Door-1
- [ ] Add items to Door-2
- [ ] Enable "Bounding Box" toggle
- [ ] **Expected**: Bounding boxes appear on BOTH doors
- [ ] **Expected**: Door-1 boxes align with Door-1 items
- [ ] **Expected**: Door-2 boxes align with Door-2 items
- [ ] **Expected**: No cross-door misalignment

#### Test 6.3: Coordinate Verification
- [ ] Inspect element or use browser tools
- [ ] Check SVG coordinates of bounding boxes
- [ ] Door-1 boxes should start around X: 16-48
- [ ] Door-2 boxes should start around X: 737+
- [ ] **Expected**: Matches backend state coordinates

**Result**: ✅ PASS / ❌ FAIL
**Notes**: _______________________________

---

### Test 7: History & Undo/Redo

#### Test 7.1: Single Door History
- [ ] Select "G-26c" layout
- [ ] Add item → **Ctrl+Z** (Undo)
- [ ] **Expected**: Item removed
- [ ] **Ctrl+Y** (Redo)
- [ ] **Expected**: Item restored
- [ ] Test 5-6 undo/redo operations
- [ ] **Expected**: All operations reversible

#### Test 7.2: Multi Door History
- [ ] Select "G-26c Double Door" layout
- [ ] Add item to Door-1
- [ ] Add item to Door-2
- [ ] **Ctrl+Z** (Undo)
- [ ] **Expected**: Door-2 item removed, Door-1 intact
- [ ] **Ctrl+Z** (Undo again)
- [ ] **Expected**: Door-1 item removed
- [ ] **Ctrl+Y** twice (Redo)
- [ ] **Expected**: Both items restored

**Result**: ✅ PASS / ❌ FAIL
**Notes**: _______________________________

---

### Test 8: Layout Switching

#### Test 8.1: Switch from Single to Multi
- [ ] Select "G-26c" (single door)
- [ ] Add 3-4 items
- [ ] Switch to "G-26c Double Door" (multi door)
- [ ] **Expected**: Data clears (different layout)
- [ ] **Expected**: Two empty doors appear
- [ ] Add items to both doors

#### Test 8.2: Switch from Multi to Single
- [ ] Have items in "G-26c Double Door"
- [ ] Switch to "G-26c" (single door)
- [ ] **Expected**: Data clears
- [ ] **Expected**: Single door appears empty

#### Test 8.3: Switch Between Multi Door Layouts (Future)
- [ ] If multiple multi-door layouts exist, test switching
- [ ] **Expected**: Data persists per layout (via localStorage)

**Result**: ✅ PASS / ❌ FAIL
**Notes**: _______________________________

---

### Test 9: Draft Persistence

#### Test 9.1: Single Door Draft
- [ ] Select "G-26c" layout
- [ ] Add items
- [ ] Refresh page (F5)
- [ ] **Expected**: Draft restore prompt appears
- [ ] Click "Restore"
- [ ] **Expected**: Items restored correctly

#### Test 9.2: Multi Door Draft
- [ ] Select "G-26c Double Door" layout
- [ ] Add items to Door-1
- [ ] Add items to Door-2
- [ ] Refresh page (F5)
- [ ] **Expected**: Draft restore prompt appears
- [ ] Click "Restore"
- [ ] **Expected**: Both doors' items restored
- [ ] **Expected**: Items in correct doors

**Result**: ✅ PASS / ❌ FAIL
**Notes**: _______________________________

---

### Test 10: Validation & Rules

#### Test 10.1: Single Door Validation
- [ ] Select "G-26c" layout
- [ ] Enable "Enforce Placement Rules"
- [ ] Try to place wrong product type in restricted row
- [ ] **Expected**: Error message or visual feedback
- [ ] Check conflict detection

#### Test 10.2: Multi Door Validation
- [ ] Select "G-26c Double Door" layout
- [ ] Enable "Enforce Placement Rules"
- [ ] Place items in Door-1 following rules
- [ ] Place items in Door-2 following rules
- [ ] **Expected**: Rules enforced per door
- [ ] Try to violate rules in Door-2
- [ ] **Expected**: Validation works on Door-2

**Result**: ✅ PASS / ❌ FAIL
**Notes**: _______________________________

---

### Test 11: Performance

#### Test 11.1: Single Door Performance
- [ ] Select "G-26c" layout
- [ ] Add 20+ items across all rows
- [ ] Drag items around
- [ ] **Expected**: Smooth drag operations (60fps)
- [ ] Enable bounding boxes
- [ ] **Expected**: No lag or stuttering

#### Test 11.2: Multi Door Performance
- [ ] Select "G-26c Double Door" layout
- [ ] Add 20+ items to Door-1
- [ ] Add 20+ items to Door-2 (40+ total)
- [ ] Drag items around
- [ ] **Expected**: Performance similar to single door
- [ ] Enable bounding boxes
- [ ] **Expected**: Overlay renders smoothly
- [ ] Check browser console for performance warnings

**Result**: ✅ PASS / ❌ FAIL
**Notes**: _______________________________

---

### Test 12: Edge Cases

#### Test 12.1: Empty Doors
- [ ] Select "G-26c Double Door" layout
- [ ] Leave both doors empty
- [ ] Check backend state
- [ ] **Expected**: Valid JSON with empty sections
- [ ] Enable bounding boxes
- [ ] **Expected**: No error, no boxes shown

#### Test 12.2: One Door Full, One Empty
- [ ] Fill Door-1 completely
- [ ] Leave Door-2 empty
- [ ] Check backend state
- [ ] **Expected**: Door-1 has products, Door-2 empty
- [ ] Enable bounding boxes
- [ ] **Expected**: Boxes only on Door-1

#### Test 12.3: Maximum Capacity
- [ ] Try to overfill a row in Door-1
- [ ] **Expected**: Cannot add more items than capacity
- [ ] Try same in Door-2
- [ ] **Expected**: Same capacity enforcement

**Result**: ✅ PASS / ❌ FAIL
**Notes**: _______________________________

---

## 🐛 BUG TRACKING

### Bugs Found During Testing

| ID | Severity | Description | Status | Notes |
|----|----------|-------------|--------|-------|
| 1  |          |             |        |       |
| 2  |          |             |        |       |
| 3  |          |             |        |       |

---

## 📸 VISUAL VERIFICATION

### Screenshots to Capture

1. **Single Door Layout**
   - [ ] G-26c with items
   - [ ] Bounding boxes enabled
   - [ ] Backend state preview

2. **Multi Door Layout**
   - [ ] G-26c Double with items in both doors
   - [ ] Bounding boxes enabled showing both doors
   - [ ] Backend state preview with Door-2 offsets
   - [ ] Zoomed view showing 0px gap between doors

3. **Coordinate Verification**
   - [ ] Browser inspector showing bounding box coordinates
   - [ ] Door-1 item at X: ~48
   - [ ] Door-2 item at X: ~2211

---

## ✅ ACCEPTANCE CRITERIA

### Must Pass (Critical)
- [ ] All single-door layouts work without regression
- [ ] Multi-door layout renders two doors side-by-side
- [ ] Bounding boxes align perfectly on both doors
- [ ] Backend coordinates have correct X offsets per door
- [ ] Door-1 X offset ≈ 16px (frame)
- [ ] Door-2 X offset ≈ 737px (calculated)
- [ ] History and undo/redo work correctly

### Should Pass (Important)
- [ ] Draft persistence works for multi-door
- [ ] Layout switching preserves drafts per layout
- [ ] Performance acceptable with 40+ items total
- [ ] Validation rules enforced per door
- [ ] No console errors

### Nice to Have (Optional)
- [ ] Cross-door drag and drop (not implemented yet)
- [ ] Multi-door conflict detection (partial)
- [ ] Advanced multi-door operations

---

## 📊 TEST SUMMARY

**Date**: _______________  
**Tester**: _______________  
**Build**: _______________

### Results
- Total Tests: 12 test suites
- Passed: _____ / 12
- Failed: _____ / 12
- Bugs Found: _____

### Overall Status
- [ ] ✅ APPROVED - Ready for production
- [ ] ⚠️ APPROVED WITH ISSUES - Document known issues
- [ ] ❌ REJECTED - Critical bugs found

### Notes
_____________________________________________
_____________________________________________
_____________________________________________

---

## 🚀 POST-TESTING ACTIONS

### If All Tests Pass
1. [ ] Merge feature branch
2. [ ] Update documentation
3. [ ] Deploy to staging
4. [ ] Notify stakeholders
5. [ ] Plan next iteration (cross-door drag & drop)

### If Tests Fail
1. [ ] Document all failures in bug tracking section
2. [ ] Prioritize bugs by severity
3. [ ] Create fix branches
4. [ ] Re-test after fixes
5. [ ] Repeat until acceptance criteria met

---

## 📞 SUPPORT

If you encounter issues during testing:

1. **Check browser console** (F12) for errors
2. **Check backend state preview** for coordinate verification
3. **Review MULTI-DOOR-PROGRESS-REPORT.md** for architecture details
4. **Refer to coordinate system diagram** in progress report
5. **Document unexpected behavior** in bug tracking section

**Expected Coordinate Values** (for reference):
```
Single Door:
- Total Width: ~721px (content) + 32px (frames) = 753px
- Door-1 X Start: 16px
- After 3x scaling: 48px

Multi Door:
- Total Width: ~1486px (2 doors + frames)
- Door-1 X Start: 16px → 48px (scaled)
- Door-2 X Start: 737px → 2211px (scaled)
- Offset difference: 721px → 2163px (scaled)
```
