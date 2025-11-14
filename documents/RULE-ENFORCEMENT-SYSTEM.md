# Rule Enforcement & Validation System

## Overview

The rule enforcement system validates product placements in the refrigerator and visually highlights violations with **red borders**. This document explains how the entire validation flow works.

---

## 🔍 Core Components

### 1. **Validation Logic** (`lib/validation.ts`)

This file contains two main functions:

#### A. `findConflicts(refrigerator)` - Detects Violations

This function scans the entire refrigerator and returns an array of item IDs that violate the rules.

**Location:** `lib/validation.ts` (Lines 20-44)

**Rules Checked:**

1. **Height Constraint:**
   ```typescript
   const stackHeight = stack.reduce((sum, item) => sum + item.height, 0);
   if (stackHeight > row.maxHeight) {
     // Mark all items in this stack as conflicts
   }
   ```

2. **Product Type Constraint:**
   ```typescript
   if (row.allowedProductTypes !== 'all' && 
       !row.allowedProductTypes.includes(item.productType)) {
     // Mark this item as a conflict
   }
   ```

3. **Special Case - BLANK spaces:**
   ```typescript
   if (item.productType === 'BLANK') continue; // BLANK items never conflict
   ```

**Returns:** `string[]` - Array of item IDs that are in conflict

**Example:**
```typescript
const conflicts = findConflicts(refrigerator);
// Returns: ['item-123', 'item-456', 'item-789']
```

---

#### B. `runValidation(payload)` - Drag & Drop Validation

This function runs during drag operations to determine where items can be dropped.

**Location:** `lib/validation.ts` (Lines 52-133)

**Returns:** 
```typescript
{
  validRowIds: Set<string>,        // Rows where item can be placed
  validStackTargetIds: Set<string> // Stacks where item can be stacked
}
```

---

### 2. **Detection & State Management** (`planogramEditor.tsx`)

#### When Conflicts are Detected:

**Location:** Lines 400-407

```typescript
useEffect(() => {
  if (refrigerator && Object.keys(refrigerator).length > 0 && isRulesEnabled) {
    const conflicts = findConflicts(refrigerator);
    setConflictIds(conflicts); // Store conflict IDs in state
  } else if (!isRulesEnabled) {
    setConflictIds([]); // Clear conflicts when rules are disabled
  }
}, [refrigerator, isRulesEnabled]);
```

**Trigger:** This runs whenever:
- The refrigerator state changes (items added/moved/deleted)
- The `isRulesEnabled` toggle is changed

---

### 3. **Passing Conflicts Down the Component Tree**

#### Flow:
```
PlanogramEditor (has conflictIds array)
    ↓
RefrigeratorComponent (receives conflictIds)
    ↓
RowComponent (receives conflictIds)
    ↓
StackComponent (receives conflictIds)
    ↓
Visual Red Border Applied
```

#### In PlanogramEditor.tsx (Line 722):
```tsx
<RefrigeratorComponent
  conflictIds={isRulesEnabled ? conflictIds : []}
  ...
/>
```

---

### 4. **Visual Display** (`stack.tsx`)

This is where the **red boxes** are rendered!

**Location:** Lines 84-97

```tsx
{hasConflict && !isDragging && !isStackHighlight && (
  <div className="absolute -inset-1 rounded-lg ring-4 ring-red-500 ring-offset-2 ring-offset-white pointer-events-none z-10" />
)}
```

#### How it Works:

1. **Check if Stack Has Conflicts:**
   ```typescript
   const hasConflict = useMemo(
     () => stack.some(item => conflictIds.includes(item.id)),
     [stack, conflictIds]
   );
   ```

2. **Render Red Border:**
   - Uses Tailwind's `ring-4 ring-red-500` for the red border
   - `ring-offset-2` creates spacing between the item and border
   - `absolute -inset-1` positions it slightly outside the item
   - `pointer-events-none` ensures it doesn't block clicks

---

## 🎨 Visual States

### 1. **Normal State** (No Conflicts)
```
┌─────────────┐
│   Product   │
└─────────────┘
```

### 2. **Conflict State** (Rule Violation)
```
┏━━━━━━━━━━━━━┓  ← Red border (ring-4 ring-red-500)
┃ ┌─────────┐ ┃
┃ │ Product │ ┃
┃ └─────────┘ ┃
┗━━━━━━━━━━━━━┛
```

### 3. **Stack Highlight** (Valid Drop Target)
```
╔═══════════════╗  ← Green border (ring-4 ring-green-500)
║ ┌─────────┐   ║
║ │ Product │   ║
║ └─────────┘   ║
╚═══════════════╝
```

---

## 🔄 Complete Flow Example

### Scenario: User places a CAN in a PET-only row

1. **User drops item:**
   ```typescript
   actions.addItemFromSku(canSku, 'row-2', 0);
   ```

2. **Refrigerator state updates:**
   ```typescript
   refrigerator['row-2'].stacks[0] = [
     { id: 'can-123', productType: 'CAN', ... }
   ];
   ```

3. **useEffect triggers validation:**
   ```typescript
   const conflicts = findConflicts(refrigerator);
   // Detects: row-2 allows ['PET'] but has 'CAN'
   // Returns: ['can-123']
   setConflictIds(['can-123']);
   ```

4. **Props flow down:**
   ```
   PlanogramEditor conflictIds=['can-123']
       ↓
   RefrigeratorComponent conflictIds=['can-123']
       ↓
   RowComponent (row-2) conflictIds=['can-123']
       ↓
   StackComponent conflictIds=['can-123']
   ```

5. **StackComponent renders:**
   ```typescript
   const hasConflict = stack.some(item => 
     conflictIds.includes(item.id)
   ); // true for 'can-123'
   
   // Red border appears!
   ```

6. **User sees:**
   - ❌ Red border around the CAN
   - 🔴 Conflict panel appears at bottom-right
   - 📊 "1 item(s) violate the current placement rules"

---

## 🛠️ Key Files & Locations

| File | Lines | Purpose |
|------|-------|---------|
| `lib/validation.ts` | 20-44 | `findConflicts()` - Detects violations |
| `lib/validation.ts` | 52-133 | `runValidation()` - Drag validation |
| `planogramEditor.tsx` | 400-407 | useEffect that detects conflicts |
| `planogramEditor.tsx` | 722 | Passes conflictIds to Refrigerator |
| `stack.tsx` | 42-45 | Checks if stack has conflicts |
| `stack.tsx` | 84-97 | Renders red border |

---

## 🎯 Rules Enforced

### Height Rule:
```typescript
stackHeight > row.maxHeight → CONFLICT
```

### Product Type Rule:
```typescript
row.allowedProductTypes = ['PET', 'CAN']
item.productType = 'TETRA' → CONFLICT
```

### Special Exceptions:
```typescript
item.productType === 'BLANK' → NEVER CONFLICTS
row.allowedProductTypes === 'all' → ACCEPTS ANYTHING
```

---

## 🎨 CSS Classes Used for Red Border

```css
.ring-4          /* 4px border width */
.ring-red-500    /* Red color */
.ring-offset-2   /* 2px spacing between item and border */
.ring-offset-white /* White background for spacing */
.absolute        /* Position absolutely */
.-inset-1        /* -0.25rem offset (slightly outside) */
.rounded-lg      /* Rounded corners */
.pointer-events-none /* Doesn't block clicks */
.z-10            /* Stack above other elements */
```

---

## 🔧 Debugging Tips

### 1. Check Console Logs:
The validation system doesn't have built-in logs, but you can add:
```typescript
// In planogramEditor.tsx useEffect
console.log('Conflicts detected:', conflicts);
```

### 2. React DevTools:
- Search for `StackComponent`
- Check `props.conflictIds` and `hasConflict` state

### 3. Toggle Rules:
- Click "Enforce Placement Rules" toggle
- Conflicts should appear/disappear instantly

### 4. Manual Test:
1. Enable rules
2. Try to place a CAN in a PET-only row
3. Should see red border immediately

---

## 📊 Performance Notes

- `findConflicts()` runs on every refrigerator change
- Uses `useMemo` in StackComponent to prevent unnecessary re-renders
- Red border uses CSS only (no animations during drag)
- `conflictIds` comparison in React.memo for optimization

---

## 🚀 Future Enhancements

1. **Show specific violation reason:**
   ```tsx
   <Tooltip>
     "This CAN is not allowed in a PET-only row"
   </Tooltip>
   ```

2. **Highlight row restrictions:**
   - Show allowed product types on each row
   - Visual indicators before dropping

3. **Soft warnings vs Hard errors:**
   - Yellow border for warnings
   - Red border for hard violations

4. **Auto-fix suggestions:**
   - "Move to row-1 where CANs are allowed"

---

**Last Updated:** January 12, 2025  
**Status:** ✅ Fully Functional  
**Performance:** Optimized with memoization
