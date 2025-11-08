# 📐 Bounding Box Visual Guide

## 🎯 Understanding Bounding Boxes

### What is a Bounding Box?

A bounding box is a **rectangle defined by 4 corner coordinates** that completely encloses a product.

```
(x1, y1) ●━━━━━━━━━━━━━━━━● (x2, y1)
         ┃                  ┃
         ┃   PRODUCT IMAGE  ┃
         ┃     (Item)       ┃
         ┃                  ┃
(x1, y2) ●━━━━━━━━━━━━━━━━● (x2, y2)
```

**4 Corners Format** (Clockwise from top-left):
```json
"Bounding-Box": [
  [x1, y1],  // Top-left corner
  [x1, y2],  // Bottom-left corner
  [x2, y2],  // Bottom-right corner
  [x2, y1]   // Top-right corner
]
```

---

## 🗺️ Coordinate System Explained

### Reference Point: Refrigerator Top-Left Corner (0, 0)

```
(0, 0) ●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━● (673px, 0)
       ┃  🧊 REFRIGERATOR G-26C                      ┃
       ┃  Width: 673px, Height: 1308px              ┃
       ┃                                             ┃
       ┃  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓   ┃
       ┃  ┃ ROW 1 (Shelf 1) - Height: 327px   ┃   ┃
       ┃  ┃ Y: 0 to 327                        ┃   ┃
       ┃  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛   ┃
       ┃  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓   ┃
       ┃  ┃ ROW 2 (Shelf 2) - Height: 327px   ┃   ┃
       ┃  ┃ Y: 327 to 654                      ┃   ┃
       ┃  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛   ┃
       ┃  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓   ┃
       ┃  ┃ ROW 3 (Shelf 3) - Height: 327px   ┃   ┃
       ┃  ┃ Y: 654 to 981                      ┃   ┃
       ┃  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛   ┃
       ┃  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓   ┃
       ┃  ┃ ROW 4 (Shelf 4) - Height: 327px   ┃   ┃
       ┃  ┃ Y: 981 to 1308                     ┃   ┃
       ┃  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛   ┃
       ┃                                             ┃
(0, 1308) ●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━● (673px, 1308px)
```

**Key Points**:
- **Origin (0, 0)**: Top-left corner of refrigerator
- **X-axis**: Increases left → right (0 to 673px)
- **Y-axis**: Increases top → bottom (0 to 1308px)
- **Rows stack vertically**: Each row height adds to Y offset

---

## 📦 Example: Single Item Bounding Box

### Scenario: Pepsi Can in Row 1

```
Refrigerator:
┌─────────────────────────────────────────────┐ Y = 0
│ ROW 1 (Height: 327px)                       │
│                                              │
│     ┌──────┐                                │
│     │ PEPSI│  ← Item:                       │
│     │ CAN  │     Width: 80px                │
│     │      │     Height: 265px              │
│     │      │     X: 50px (from left)        │
│     │      │     Y: 62px (from top)         │
│     │      │                                 │
│     └──────┘                                │
│                                              │
└─────────────────────────────────────────────┘ Y = 327
```

**Calculation**:
```typescript
Item position in Row 1:
- Row starts at Y = 0
- Row height = 327px
- Item height = 265px
- Items are bottom-aligned in rows

// Y position calculation:
rowBottom = 0 + 327 = 327px
itemTop = 327 - 265 = 62px
itemBottom = 327px

// X position:
itemLeft = 50px
itemRight = 50 + 80 = 130px

// Final Bounding Box:
[
  [50, 62],    // Top-left
  [50, 327],   // Bottom-left
  [130, 327],  // Bottom-right
  [130, 62]    // Top-right
]
```

**JSON Output**:
```json
{
  "product": "Pepsi Can",
  "SKU-Code": "sku-pepsi-can",
  "Bounding-Box": [
    [50, 62],
    [50, 327],
    [130, 327],
    [130, 62]
  ]
}
```

---

## 🏗️ Example: Multiple Items in Row

### Scenario: 3 Items in Row 2

```
Refrigerator (Row 2 only shown):
┌─────────────────────────────────────────────────────────┐ Y = 327
│ ROW 2 (Height: 327px, starts at Y=327)                  │
│                                                          │
│  ┌────┐  ┌────┐  ┌────┐                                │
│  │ A  │  │ B  │  │ C  │                                 │
│  │    │  │    │  │    │                                 │
│  │    │  │    │  │    │                                 │
│  └────┘  └────┘  └────┘                                │
│  ↑       ↑       ↑                                       │
│  X=0     X=81    X=162                                  │
│  W=80    W=80    W=80                                   │
│  (gap=1px between each)                                 │
└─────────────────────────────────────────────────────────┘ Y = 654
```

**Item A** (First item):
```typescript
X: 0
Y: 327 + (327 - 265) = 389
Width: 80
Height: 265

Bounding Box: [
  [0, 389],      // Top-left
  [0, 654],      // Bottom-left
  [80, 654],     // Bottom-right
  [80, 389]      // Top-right
]
```

**Item B** (Second item, after 1px gap):
```typescript
X: 80 + 1 = 81
Y: 389 (same as Item A, same height)
Width: 80
Height: 265

Bounding Box: [
  [81, 389],
  [81, 654],
  [161, 654],
  [161, 389]
]
```

**Item C** (Third item):
```typescript
X: 161 + 1 = 162
Y: 389
Width: 80
Height: 265

Bounding Box: [
  [162, 389],
  [162, 654],
  [242, 654],
  [242, 389]
]
```

---

## 📚 Example: Stacked Items

### Scenario: 2 Cans Stacked Vertically in Row 3

```
Refrigerator (Row 3 only):
┌─────────────────────────────────────────────┐ Y = 654
│ ROW 3 (Height: 327px)                       │
│                                              │
│     ┌──────┐                                │
│     │ CAN  │ ← Top can (stacked[0])         │
│     │  B   │   Height: 150px                │
│     ├──────┤                                │
│     │ CAN  │ ← Bottom can (front product)   │
│     │  A   │   Height: 150px                │
│     └──────┘                                │
│                                              │
└─────────────────────────────────────────────┘ Y = 981
```

**Bottom Can (Front Product)**:
```typescript
Row Y start: 654
Row height: 327
Row Y end: 654 + 327 = 981

// Bottom-aligned:
itemBottom = 981
itemTop = 981 - 150 = 831
itemLeft = 50
itemRight = 50 + 80 = 130

Bounding Box: [
  [50, 831],    // Top-left
  [50, 981],    // Bottom-left (touches row bottom)
  [130, 981],   // Bottom-right
  [130, 831]    // Top-right
]
```

**Top Can (Stacked Item)**:
```typescript
// Sits on top of bottom can:
stackHeight = 150 (bottom can height)
itemBottom = 831 (top of bottom can)
itemTop = 831 - 150 = 681
itemLeft = 50
itemRight = 130

Bounding Box: [
  [50, 681],    // Top-left
  [50, 831],    // Bottom-left (sits on bottom can)
  [130, 831],   // Bottom-right
  [130, 681]    // Top-right
]
```

**Stack Order in Array**:
```typescript
stack = [
  bottomCan,  // stack[0] = front product (visible first)
  topCan      // stack[1] = stacked item (on top)
]

// In backend JSON:
{
  "product": "Bottom Can",
  "Bounding-Box": [[50, 831], [50, 981], [130, 981], [130, 831]],
  "stacked": [
    {
      "product": "Top Can",
      "Bounding-Box": [[50, 681], [50, 831], [130, 831], [130, 681]]
    }
  ]
}
```

---

## 🔢 Complete Real Example

### Real Planogram Layout

```
G-26C Refrigerator (673px × 1308px)

Row 1 (Y: 0-327):    [Pepsi 80×265] [Coke 80×265] [Sprite 80×265]
Row 2 (Y: 327-654):  [Water 100×200] [Juice 90×220]
Row 3 (Y: 654-981):  [Can-A 70×150]
                     [Can-B 70×150] (stacked on Can-A)
Row 4 (Y: 981-1308): [BigBottle 120×300]
```

### Generated Bounding Boxes

#### Row 1 Products (Y: 0 to 327)

**Pepsi** (X: 0, H: 265):
```json
{
  "product": "Pepsi",
  "Position": "1",
  "Bounding-Box": [
    [0, 62],      // Top: 327 - 265 = 62
    [0, 327],     // Bottom: row end
    [80, 327],    // Right: 0 + 80 = 80
    [80, 62]
  ]
}
```

**Coke** (X: 81, H: 265):
```json
{
  "product": "Coke",
  "Position": "2",
  "Bounding-Box": [
    [81, 62],
    [81, 327],
    [161, 327],   // 81 + 80 = 161
    [161, 62]
  ]
}
```

**Sprite** (X: 162, H: 265):
```json
{
  "product": "Sprite",
  "Position": "3",
  "Bounding-Box": [
    [162, 62],
    [162, 327],
    [242, 327],
    [242, 62]
  ]
}
```

#### Row 2 Products (Y: 327 to 654)

**Water** (X: 0, H: 200):
```json
{
  "product": "Water Bottle",
  "Position": "1",
  "Bounding-Box": [
    [0, 454],      // 654 - 200 = 454
    [0, 654],
    [100, 654],
    [100, 454]
  ]
}
```

**Juice** (X: 101, H: 220):
```json
{
  "product": "Orange Juice",
  "Position": "2",
  "Bounding-Box": [
    [101, 434],    // 654 - 220 = 434
    [101, 654],
    [191, 654],    // 101 + 90 = 191
    [191, 434]
  ]
}
```

#### Row 3 Stacked Products (Y: 654 to 981)

**Can-A (Bottom)**:
```json
{
  "product": "Can A",
  "Position": "1",
  "stackSize": 2,
  "Bounding-Box": [
    [0, 831],      // 981 - 150 = 831
    [0, 981],
    [70, 981],
    [70, 831]
  ],
  "stacked": [...]
}
```

**Can-B (Top, stacked on Can-A)**:
```json
{
  "product": "Can B",
  "Bounding-Box": [
    [0, 681],      // 831 - 150 = 681
    [0, 831],      // Sits on Can-A
    [70, 831],
    [70, 681]
  ]
}
```

#### Row 4 Products (Y: 981 to 1308)

**Big Bottle** (X: 0, H: 300):
```json
{
  "product": "Big Bottle",
  "Position": "1",
  "Bounding-Box": [
    [0, 1008],     // 1308 - 300 = 1008
    [0, 1308],
    [120, 1308],
    [120, 1008]
  ]
}
```

---

## 🧮 Step-by-Step Calculation Algorithm

### For Each Item in Planogram:

```typescript
// 1️⃣ Find Row Position
let rowYStart = 0;
for (let i = 0; i < currentRowIndex; i++) {
  rowYStart += rows[i].maxHeight;
}
const rowYEnd = rowYStart + currentRow.maxHeight;

// 2️⃣ Find Stack X Position
let stackXStart = 0;
for (let j = 0; j < currentStackIndex; j++) {
  stackXStart += getStackWidth(stacks[j]) + 1; // +1 for gap
}

// 3️⃣ Calculate Item Y Position (bottom-aligned)
let stackHeight = 0;
for (let k = 0; k < currentItemIndexInStack; k++) {
  stackHeight += stack[k].height;
}
const itemYBottom = rowYEnd;
const itemYTop = rowYEnd - stackHeight - item.height;

// 4️⃣ Calculate Item X Position
const itemXLeft = stackXStart;
const itemXRight = stackXStart + item.width;

// 5️⃣ Generate Bounding Box
const boundingBox = [
  [itemXLeft, itemYTop],       // Top-left
  [itemXLeft, itemYBottom],    // Bottom-left
  [itemXRight, itemYBottom],   // Bottom-right
  [itemXRight, itemYTop]       // Top-right
];
```

---

## 🎨 Visual Debug Overlay

### How to Visualize Bounding Boxes During Development

Add this overlay component to see bounding boxes:

```typescript
// BoundingBoxOverlay.tsx
export function BoundingBoxOverlay({ item, boundingBox }) {
  return (
    <div 
      className="absolute border-2 border-red-500 pointer-events-none"
      style={{
        left: `${boundingBox[0][0]}px`,
        top: `${boundingBox[0][1]}px`,
        width: `${boundingBox[2][0] - boundingBox[0][0]}px`,
        height: `${boundingBox[1][1] - boundingBox[0][1]}px`,
      }}
    >
      <div className="text-xs bg-red-500 text-white p-1">
        [{boundingBox[0][0]}, {boundingBox[0][1]}]
      </div>
    </div>
  );
}
```

---

## 📏 Key Formulas Summary

### Y-Axis Calculations:
```typescript
// Row position
rowYStart = sum of all previous row heights
rowYEnd = rowYStart + currentRow.maxHeight

// Item position in stack (bottom-aligned)
itemYBottom = rowYEnd
itemYTop = rowYEnd - accumulatedStackHeight - item.height
```

### X-Axis Calculations:
```typescript
// Stack position
stackXStart = sum of all previous stack widths + gaps
stackXEnd = stackXStart + currentStackWidth

// Gap calculation
totalGaps = numberOfStacks - 1
gapWidth = 1px per gap
```

### Bounding Box Format:
```typescript
[
  [xLeft, yTop],      // Corner 1: Top-left
  [xLeft, yBottom],   // Corner 2: Bottom-left
  [xRight, yBottom],  // Corner 3: Bottom-right
  [xRight, yTop]      // Corner 4: Top-right
]
```

---

## ✅ Validation Checklist

Before sending to backend, verify:

1. ✅ All coordinates are positive numbers
2. ✅ xRight > xLeft (width is positive)
3. ✅ yBottom > yTop (height is positive)
4. ✅ Coordinates within refrigerator bounds
5. ✅ No overlapping bounding boxes
6. ✅ Stacked items are properly nested
7. ✅ Gap spacing is accounted for

---

## 🎓 Summary

**Bounding boxes start from refrigerator top-left (0,0) and:**
- Calculate Y by summing row heights from top
- Calculate X by summing stack widths from left
- Account for 1px gaps between stacks
- Align items to bottom of each row
- Stack items vertically from bottom to top

This ensures perfect coordinate matching with backend AI detection! 🎯
