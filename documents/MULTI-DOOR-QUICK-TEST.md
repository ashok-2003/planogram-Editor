# 🧪 Multi-Door Testing Checklist - Quick Test

## ✅ Pre-Test Setup

1. **Clear LocalStorage** (in browser console):
   ```javascript
   clearAllDrafts()
   ```

2. **Refresh the page** (Ctrl+R or F5)

---

## 🎯 Critical Tests (5 minutes)

### Test 1: Single-Door Layout Works
- [ ] Select "G-26c Upright Cooler" from dropdown
- [ ] Both doors should NOT be visible (single door only)
- [ ] Drag a product from SKU palette to a row
- [ ] Product should appear correctly
- [ ] **Expected**: Drag & drop works perfectly ✅

### Test 2: Double-Door Layout Renders
- [ ] Select "G-26c Double Door Cooler" from dropdown
- [ ] Should see TWO doors side-by-side
- [ ] Each door should have header showing "DOOR-1" and "DOOR-2"
- [ ] Each door should show 4 empty rows
- [ ] **Expected**: Both doors visible with correct dimensions ✅

### Test 3: Drag to Door-1
- [ ] Stay in double-door layout
- [ ] Drag a product from SKU palette
- [ ] Drop it into any row of **Door-1** (left door)
- [ ] Product should appear in Door-1
- [ ] **Expected**: Works correctly ✅

### Test 4: Drag to Door-2
- [ ] Drag another product from SKU palette
- [ ] Drop it into any row of **Door-2** (right door)
- [ ] Product should appear in Door-2
- [ ] **Expected**: Works correctly ✅

### Test 5: State Previews Update
- [ ] Scroll down to "Backend State Preview" section
- [ ] Should see data for BOTH doors
- [ ] Switch to "G-26c Upright Cooler"
- [ ] Backend preview should update to show single door
- [ ] **Expected**: Previews update correctly ✅

### Test 6: Layout Switching Preserves Data
- [ ] In double-door layout, add products to both doors
- [ ] Switch to "G-26c Upright Cooler"
- [ ] Switch back to "G-26c Double Door Cooler"
- [ ] Products should still be there
- [ ] **Expected**: Data persists ✅

---

## 🚀 Advanced Tests (Optional - 10 minutes)

### Test 7: Reorder Within Door
- [ ] In double-door layout, add 3 products to Door-1
- [ ] Drag the first product to the right of the second
- [ ] **Expected**: Reordering works ✅

### Test 8: Stack Within Door
- [ ] Switch to "Stack" mode (top-right toggle)
- [ ] Drag one product onto another in same door
- [ ] **Expected**: Stacking works ✅

### Test 9: Undo/Redo
- [ ] Make some changes (add/move products)
- [ ] Click "Undo" button
- [ ] Click "Redo" button
- [ ] **Expected**: Undo/redo works ✅

### Test 10: Properties Panel
- [ ] Click on a product in Door-2
- [ ] Properties panel should show product details
- [ ] Try "Duplicate" action
- [ ] **Expected**: Product operations work ✅

---

## 🐛 Known Issues (Expected Behavior)

### ✅ Working:
- Both doors render correctly
- Drag & drop to each door independently
- Reorder within same door
- Stack within same door
- Layout switching
- Data persistence
- State previews
- Undo/redo

### ⚠️ Not Yet Implemented (Phase 3):
- **Cross-door drag & drop**: Cannot drag items from Door-1 to Door-2
- **Conflict validation**: Only checks Door-1 rules
- **Some properties actions**: Duplicate/replace may only work within current door

---

## 📊 Test Results Template

Copy this to document your testing:

```
## Test Results - [Your Name] - [Date]

### Test 1: Single-Door Layout
- Status: ✅ PASS / ❌ FAIL
- Notes: 

### Test 2: Double-Door Rendering
- Status: ✅ PASS / ❌ FAIL
- Notes:

### Test 3: Drag to Door-1
- Status: ✅ PASS / ❌ FAIL
- Notes:

### Test 4: Drag to Door-2
- Status: ✅ PASS / ❌ FAIL
- Notes:

### Test 5: State Previews
- Status: ✅ PASS / ❌ FAIL
- Notes:

### Test 6: Data Persistence
- Status: ✅ PASS / ❌ FAIL
- Notes:

### Overall Result: ✅ PASS / ⚠️ PARTIAL / ❌ FAIL
```

---

## 🆘 If Something Breaks

### Issue: Doors not showing
**Solution**: Clear localStorage and refresh
```javascript
clearAllDrafts()
```

### Issue: Drag & drop not working
**Check**:
1. Are you in "Re-Order" mode? (not "Stack" mode)
2. Is the row accepting that product type? (rules enabled)
3. Check browser console for errors

### Issue: State previews not updating
**Solution**: This was fixed! If still broken, refresh the page

### Issue: Data lost when switching layouts
**Solution**: This was fixed! If still broken, check localStorage data

---

## ✅ Success Criteria

**Phase 2 is COMPLETE if**:
- ✅ All 6 critical tests pass
- ✅ No browser console errors
- ✅ Drag & drop works smoothly
- ✅ Layout switching is seamless
- ✅ Data persists correctly

---

*Quick Test Checklist - Phase 2 Complete*  
*Estimated Time: 5-15 minutes*
