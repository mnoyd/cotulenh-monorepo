# Stack Selection Destination Highlighting Fix

## Problem

When clicking on a stack (e.g., Tank+Militia) without opening the piece selection popup, the board was highlighting **all possible destinations** for **all pieces** in the stack, creating a confusing UI with too many green squares.

### Expected Behavior

- **Click stack directly**: Show only carrier's (base piece) legal moves
- **Open popup → select specific piece**: Show only that piece's legal moves
- **Deploy mode**: Show all pieces' moves (unchanged)

### Actual Bug

Clicking a stack showed destinations for carrier + all carried pieces combined.

## Root Cause

The destination mapping system (`mapPossibleMovesToDests`) creates keys in the format `"square.pieceType"` (e.g., `"f4.militia"`).

However, when you click a stack **without selecting a specific piece**, the board creates a selection with `type: undefined`, resulting in a lookup key of `"f4.undefined"`.

Since the dests map only had keys like `"f4.militia"` and `"f4.infantry"`, the board couldn't find any matches and fell back to showing all destinations.

## Solution

Create **dual keys** for carrier moves on stacks:

1. **With type** (`"f4.militia"`): For when user selects specific piece from popup
2. **Without type** (`"f4.undefined"`): For when user clicks stack directly

### Implementation

```typescript
// For carrier moves on a stack: create TWO keys
const isCarrier = piece.type === pieceAtSquare.type;
const isStack = pieceAtSquare.carrying && pieceAtSquare.carrying.length > 0;

// Always create key with type for specific piece selection
const keyWithType = origMoveToKey(moveOrig);
dests.set(keyWithType, [...destinations]);

// For carrier moves: also create key WITHOUT type
if (isCarrier && isStack && !move.isDeploy()) {
  const keyWithoutType = `${move.from}.undefined` as OrigMoveKey;
  dests.set(keyWithoutType, [...destinations]);
}
```

## User Flow After Fix

### Scenario 1: Click Stack Directly

1. User clicks stack at f4 (Militia carrying Infantry)
2. Board creates selection: `{ square: "f4", type: undefined }`
3. Lookup key: `"f4.undefined"`
4. **Result**: Shows only Militia's (carrier) legal moves ✅

### Scenario 2: Select Specific Piece from Popup

1. User clicks stack at f4
2. Popup opens showing: Militia, Infantry
3. User selects "Infantry"
4. Board creates selection: `{ square: "f4", type: "infantry" }`
5. Lookup key: `"f4.infantry"`
6. **Result**: Shows only Infantry's legal moves ✅

### Scenario 3: Deploy Mode

1. Deploy session active at h4
2. User clicks stack
3. All pieces can move independently
4. **Result**: Shows all pieces' destinations ✅

## Files Changed

**`/apps/cotulenh-app/src/routes/+page.svelte`** (lines 106-143)

- Modified `mapPossibleMovesToDests` function
- Added dual-key creation for carrier moves on stacks
- Maintained backward compatibility for all other move types

## Benefits

### Before Fix

- ❌ Confusing UI with too many highlighted squares
- ❌ Couldn't tell which piece's moves were shown
- ❌ Stack selection felt broken

### After Fix

- ✅ Clear visual feedback: only carrier's moves shown
- ✅ Intuitive UX: click stack = carrier moves
- ✅ Popup selection works correctly for individual pieces
- ✅ Deploy mode unchanged and working

## Edge Cases Handled

1. **Single piece (no stack)**: Works as before (no dual keys needed)
2. **Deploy mode**: All pieces' moves shown (no dual keys created)
3. **Popup selection**: Specific piece type used (finds typed key)
4. **Direct stack click**: No type specified (finds undefined key)

## Testing

Test the following scenarios:

1. ✅ Click stack → see only carrier moves
2. ✅ Open popup → select piece → see only that piece's moves
3. ✅ Deploy mode → see all pieces' moves
4. ✅ Single piece → works normally
5. ✅ Move execution → works for all scenarios
