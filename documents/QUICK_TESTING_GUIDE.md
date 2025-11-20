# 🚀 Quick Testing Guide - Clean Implementation

## ⚡ 5-Minute Verification

### Test 1: Single-Door Capture (2 minutes)
```bash
1. Open browser: http://localhost:3000/planogram
2. Layout should be 'g-26c' (default single-door)
3. Click "Capture Layout" button (camera icon)
4. ✅ Image downloads with filename: planogram-YYYY-MM-DD-HH-MM-SS.png
5. ✅ Image shows complete refrigerator (header, content, grille, frame)
```

### Test 2: Multi-Door Capture (2 minutes)
```bash
1. Change layout dropdown to 'g-52c' (two doors)
2. Add a product to Door-1 (left door)
3. Add a product to Door-2 (right door)
4. Click "Capture Layout" button
5. ✅ Image downloads with BOTH doors visible
6. ✅ Doors appear flush against each other (no gap)
```

### Test 3: Backend Coordinates (1 minute)
```bash
1. Keep 'g-52c' loaded with products in both doors
2. Open browser DevTools (F12)
3. Click "Console" tab
4. Look for backend preview calculations
5. ✅ Should see: 🚪 DOOR-1 Backend Coordinates: { doorXOffset: 16, ... }
6. ✅ Should see: 🚪 DOOR-2 Backend Coordinates: { doorXOffset: 721, ... }
```

---

## 🎯 Expected Results

### Console Output Example
```
🚪 DOOR-1 Backend Coordinates: {
  doorIndex: 0,
  doorWidth: 673,
  doorXOffset: 16,        ← Should be 16
  frameBorder: 16,
  doorGap: 0,
  formula: "16"
}
  📦 First Product in DOOR-1: {
    stackXRelative: 0,
    doorXOffset: 16,
    absoluteX: 16,          ← Absolute coordinate
    productName: "..."
  }

🚪 DOOR-2 Backend Coordinates: {
  doorIndex: 1,
  doorWidth: 673,
  doorXOffset: 721,       ← Should be 721 ✅
  frameBorder: 16,
  doorGap: 0,
  formula: "16 + 673 + 32 + 0"
}
  📦 First Product in DOOR-2: {
    stackXRelative: 0,
    doorXOffset: 721,
    absoluteX: 721,         ← Absolute coordinate ✅
    productName: "..."
  }
```

---

## ✅ Pass/Fail Criteria

### PASS ✅ if:
- [x] Single-door captures correctly
- [x] Multi-door captures BOTH doors
- [x] Doors appear flush (no visible gap)
- [x] Door-2 X-offset = 721px
- [x] Products have absolute coordinates
- [x] No TypeScript errors
- [x] No runtime errors

### FAIL ❌ if:
- [ ] Only one door captured in multi-door mode
- [ ] Gap visible between doors
- [ ] Door-2 X-offset ≠ 721px
- [ ] Products have relative (per-door) coordinates
- [ ] Console shows errors

---

## 🐛 Troubleshooting

### Issue: "Capture button doesn't work"
**Solution:** Check browser console for errors

### Issue: "Only Door-1 captured in multi-door"
**Solution:** Verify `id="refrigerator-layout"` wraps BOTH doors in MultiDoorRefrigerator.tsx

### Issue: "Gap visible between doors"
**Solution:** Verify `DOOR_GAP = 0` in lib/config.ts

### Issue: "Door-2 offset wrong"
**Solution:** Check getDoorXOffset() calculation in multi-door-utils.ts

---

## 📊 Performance Check

### Image Capture Time
- **Expected:** 0.5-2 seconds
- **If slower:** Normal for high-quality 3x pixel ratio

### Console Logs
- **Expected:** 2-4 log entries per door
- **If more:** No issue, just verbose logging

---

## 🎉 Success!

If all tests pass, the clean implementation is **PRODUCTION READY** ✅

Next steps:
1. Remove console.log statements (optional)
2. Deploy to production
3. Celebrate! 🎊

---

**Total Testing Time:** ~5 minutes  
**Confidence Level:** 100% if all pass ✅
