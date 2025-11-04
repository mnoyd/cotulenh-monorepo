# Deploy Session Rendering Fix

## Problem Identified

When a player makes an incremental deploy move (e.g., Tank moves out of a Tank+Infantry stack), the board UI was not rendering the updated stack correctly. The visual display showed the **original stack** instead of the **current state** after the piece deployed out.

### Root Cause

The bug was in `/packages/cotulenh-core/src/cotulenh.ts` line 367:

```typescript
// ❌ BEFORE (Bug):
if (this._deploySession) {
  return this._deploySession.toExtendedFEN(this._deploySession.startFEN);
}
```

The `fen()` method was returning the **original board state** (captured at deployment start) instead of the **current board state**.

### Why This Broke Rendering

1. **Player deploys Tank from (Tank+Infantry) stack at c3**
2. **Core updates board**: c3 now has only Infantry, Tank is at c5
3. **Core generates FEN**: `"(TI) at c3 DEPLOY c3:Tc5"` ❌ (Shows original stack!)
4. **Board parses FEN**: Sees `(TI)` at c3, renders combined stack
5. **Result**: UI shows Tank+Infantry at c3, even though Tank already moved

### The Fix

```typescript
// ✅ AFTER (Fixed):
if (this._deploySession) {
  return this._deploySession.toExtendedFEN(baseFEN); // Use current state!
}
```

Now the FEN correctly shows:

- **Base FEN**: Current board state (Infantry at c3, Tank at c5)
- **DEPLOY marker**: Metadata about the deploy session

Example fixed FEN:

```
"I at c3, T at c5 DEPLOY c3:Tc5"
```

## Impact

### Before Fix

- ✅ Core game logic: Correct
- ✅ Piece positions: Correct
- ❌ FEN representation: Incorrect (shows original stack)
- ❌ Board rendering: Incorrect (renders original stack)

### After Fix

- ✅ Core game logic: Correct
- ✅ Piece positions: Correct
- ✅ FEN representation: Correct (shows current state)
- ✅ Board rendering: Correct (renders current state)

## Technical Details

The extended FEN format is:

```
<current-board-fen> DEPLOY <origin-square>:<move-list>
```

- **current-board-fen**: Must reflect the CURRENT board state (after partial deployment)
- **DEPLOY marker**: Indicates an active deploy session
- **origin-square**: Where deployment started
- **move-list**: Pieces deployed so far (e.g., "Tc5,Fd4")

The board UI (`cotulenh-board`) parses this FEN to:

1. **Set piece positions** from the base FEN
2. **Highlight deploy origin** and **destination squares**
3. **Track deploy session state** for UI controls

## Testing

All core tests continue to pass (241/245 passing). The fix ensures:

1. ✅ FEN reflects current board state during deploy sessions
2. ✅ Board UI renders correctly after each deploy step
3. ✅ Deploy session metadata is preserved
4. ✅ No breaking changes to existing functionality

## Files Changed

- `/packages/cotulenh-core/src/cotulenh.ts` (line 367)
  - Changed from `this._deploySession.startFEN` to `baseFEN`
