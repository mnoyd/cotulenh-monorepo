# Checkmate Detection with Deploy Sequences - TODO

## 🎯 Current Status

### ✅ Implemented: Delayed Validation (Option B)

**What works:**

- Deploy moves allowed during check
- Recombine instructions queued during check
- Commander safety validated at **commit time**
- If commander still in danger after deploy+recombine sequence, commit fails

```typescript
// Example: Commander escapes via deploy sequence
// Commander at c2, checked by Tank at c4
// F(C) stack at c2

game.move({ from: 'c2', to: 'f2', piece: AIR_FORCE, deploy: true })
// ✅ Allowed - exploring escape

game.recombine('c2', 'f2', COMMANDER)
// ✅ Allowed - queuing rescue

game.commitDeploySession()
// Validates: Is commander safe now?
// If yes: ✅ Success - Commander escaped via F(C) at f2
// If no:  ❌ Error: "Deploy sequence does not escape check"
```

### ❌ Not Implemented: Checkmate Detection

**Current behavior:**

```typescript
game.isCheckmate()
// Only checks normal moves
// Does NOT check if deploy sequences can escape
// May return true (checkmate) when deploy escape exists!
```

## 🚧 TODO: Implement Checkmate Detection with Deploy Sequences

### The Challenge

CoTuLenh checkmate is more complex than regular chess because:

1. **Normal moves** - Standard piece moves
2. **Deploy sequences** - Multi-step deploy + recombine operations
3. **Exponential complexity** - N pieces in stack = 2^N possible sequences

### Complexity Analysis

**Naive Approach (Too Expensive):**

```
O(M + 2^N * R) where:
- M = normal moves (~50)
- N = pieces in stack (2-4)
- R = recombine checks
Cost: ~500+ checks ❌
```

**Optimized Approach (Recommended):**

```
O(M + S * C * D) where:
- M = normal moves (~50)
- S = stacks with commander (1-2)
- C = carriers in stack (1-3)
- D = safe destinations (~10)
Cost: ~60 checks ✅
```

### Recommended Implementation

```typescript
function isCheckmate(): boolean {
  const us = this.turn()

  // Not in check = not checkmate
  if (!this._isCommanderAttacked(us)) return false

  // Generate ALL legal moves (already filtered)
  const legalMoves = this.moves({ verbose: false })

  // If ANY legal move exists, not checkmate
  if (legalMoves.length > 0) return false

  // OPTIMIZATION: Only check stacks containing commander
  if (this.canCommanderEscapeViaDeploySequence(us)) {
    return false
  }

  return true // CHECKMATE!
}

private canCommanderEscapeViaDeploySequence(color: Color): boolean {
  const commanderSq = this._commanders[color]
  const stackPiece = this.get(commanderSq)

  // Commander not in stack? Can't escape via deploy
  if (!stackPiece?.carrying) return false

  // Try each carried piece as potential carrier
  const flatPieces = flattenPiece(stackPiece)

  for (const carrier of flatPieces) {
    if (carrier.type === COMMANDER) continue // Skip commander itself

    // Get safe destination squares
    const safeSquares = this.findSafeSquaresForEscape(
      carrier,
      commanderSq,
      color
    )

    // If any safe square reachable, commander can escape
    if (safeSquares.length > 0) return true
  }

  return false
}
```

### Optimization Strategies

1. **Only check commander stacks** - Don't check all possible deploy sequences
2. **Pre-calculate attack zones** - Cache which squares are under attack
3. **Quick simulation** - Use fast board updates without full command pattern
4. **Early exit** - Stop as soon as one escape is found

### Performance Target

- **Current checkmate detection**: ~50 checks (normal moves only)
- **With deploy escapes**: ~60-100 checks (acceptable)
- **Naive approach**: ~500+ checks (too slow)

## 📋 Implementation Checklist

When implementing, complete these steps:

- [ ] Add `canCommanderEscapeViaDeploySequence()` method
- [ ] Add `findSafeSquaresForEscape()` helper
- [ ] Add `quickCheckDeployEscape()` for fast simulation
- [ ] Update `isCheckmate()` to check deploy escapes
- [ ] Add tests for checkmate with deploy escape possibilities
- [ ] Add tests for checkmate when no deploy escape exists
- [ ] Performance benchmark (should be < 100ms per position)

## 🧪 Test Cases Needed

### Case 1: Checkmate with no deploy escape

```typescript
// Commander at c2, checked by Tank at c4
// T(C) at c2 - Tank can't escape check
// Expected: isCheckmate() === true
```

### Case 2: Not checkmate - deploy escape exists

```typescript
// Commander at c2, checked by Tank at c4
// F(C) at c2 - AirForce can escape to f2
// Expected: isCheckmate() === false
```

### Case 3: Not checkmate - normal move escape exists

```typescript
// Commander at c2, checked by Tank at c4
// Commander can move to d2
// Expected: isCheckmate() === false (already works)
```

## 📖 References

- Current implementation: `src/cotulenh.ts` lines ~1026-1036 (delayed
  validation)
- Detailed analysis: `docs/RECOMBINE-LOGIC-ANALYSIS.md`
- Deploy system: `src/deploy-session.ts`

## 🎯 Priority

**Medium Priority** - Not blocking gameplay, but needed for complete game rule
enforcement.

Current workaround: Players can discover checkmate themselves by attempting all
possible moves/deploys.

## 💭 Design Decision

We chose **Option B (Delayed Validation)** over **Option A (Full Validation)**
because:

- ✅ Simpler to implement
- ✅ More flexible (try different sequences)
- ✅ Better UX (undo-friendly)
- ✅ Uses existing validation at commit time

This makes checkmate detection slightly more complex, but keeps the deploy
system clean and maintainable.
