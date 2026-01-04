# Agent Guidelines for @cotulenh/core

This document defines rules and conventions that all agents must follow when
working on this codebase.

---

## ⚠️ MANDATORY: Before Writing ANY Test Code

**STOP. You MUST read these files FIRST before writing or modifying tests.**

### Required Reading (in order)

1. ✅ `AGENTS.md` - You're reading it now
2. 📖 **`TEST_RULES_REFERENCE.md`** - Terrain zones, movement ranges, valid
   squares
3. 📖 **`blueprints.yaml`** - Valid piece stacking combinations (in
   `../combine-piece/`)

### If You Skip This

- Your tests WILL have illegal moves or invalid stacks
- You MUST delete your work and start over
- There is NO excuse for inventing moves without checking rules

### Quick Terrain Reference

| Piece Type      | Files a-b | File c + river | Files d-k            |
| --------------- | --------- | -------------- | -------------------- |
| Navy            | ✓         | ✓              | ✗                    |
| Land units      | ✗         | ✓              | ✓                    |
| Heavy (A, G, S) | ✗         | ✓              | ✓ (bridge for river) |
| Air Force       | ✓         | ✓              | ✓                    |

### Quick Stack Reference

| Carrier     | Can Carry (Slot 1)           | Can Carry (Slot 2)                 |
| ----------- | ---------------------------- | ---------------------------------- |
| NAVY        | AIR_FORCE                    | COMMANDER, INFANTRY, MILITIA, TANK |
| TANK        | COMMANDER, INFANTRY, MILITIA | —                                  |
| ENGINEER    | ARTILLERY, ANTI_AIR, MISSILE | —                                  |
| AIR_FORCE   | TANK                         | COMMANDER, INFANTRY, MILITIA       |
| HEADQUARTER | COMMANDER                    | —                                  |

**Read `TEST_RULES_REFERENCE.md` for complete details before proceeding.**

---

## 🚨 ESCALATION RULE: When You Get Stuck

**If you encounter problems setting up tests using the standard rules above, you
MUST:**

1. **STOP immediately** - Do NOT try to work around or bypass the rules
2. **Describe the problem** - Explain exactly what you're trying to do and why
   standard approaches aren't working
3. **Propose a plan** - Outline what alternative approach you want to take
4. **ASK FOR PERMISSION** - Wait for explicit approval before proceeding

**Examples of situations requiring escalation:**

- Test helper validation throws an error you don't understand
- You need a piece combination not in blueprints.yaml
- You need to place a piece on terrain that seems invalid
- You think the rules might be wrong or incomplete
- You want to use `game.put()` directly instead of `placeAt()`

**NEVER:**

- Suppress or catch validation errors to make tests pass
- Hardcode pieces/moves to bypass helpers
- Assume rules are wrong and proceed without asking
- Create workarounds that bypass established patterns

**The test helpers now have runtime validation.** If `makePiece()` or
`placeAt()` throws an error, that's intentional - it means your test setup is
invalid.

---

## Package Management

**Always use `pnpm`** - never use `npm` or `yarn`.

- Install: `pnpm install`
- Add dependencies: `pnpm add <package>`
- Run tests: `pnpm test`
- Build: `pnpm build`

## Test Setup Rules (CRITICAL)

When writing or modifying tests, follow the rules below. This is non-negotiable.

### Golden Rules

1. **Always use test helpers from `__tests__/test-helpers.ts`**
   - Use `makePiece()` to create pieces - never hardcode piece objects
   - Use `makeMove()` to create moves - never hardcode move objects
   - Use `setupGameBasic()` for standard board setup
   - Use `findVerboseMove()`, `findMove()` to locate moves

2. **Never invent piece stacks**
   - All piece stacking must be valid according to
     `packages/cotulenh/combine-piece/blueprints.yaml`
   - Valid stacks ONLY:
     - `NAVY: [AIR_FORCE], [COMMANDER|INFANTRY|MILITIA|TANK]`
     - `TANK: [COMMANDER|INFANTRY|MILITIA]`
     - `ENGINEER: [ARTILLERY|ANTI_AIR|MISSILE]`
     - `AIR_FORCE: [TANK], [COMMANDER|INFANTRY|MILITIA]`
     - `HEADQUARTER: [COMMANDER]`
   - INVALID example: `Navy(Tank, Infantry)` - Navy slot 2 can't have both
     pieces
   - VALID example: `Navy(AirForce, Tank)` - Navy slot 1 (AirForce) + slot 2
     (Tank)

3. **Never hardcode board state**
   - Always use `setupGameBasic()` or `makePiece()` + `game.put()`
   - Never create raw objects like `{ type: 'n', color: 'r' }`

4. **Always validate stacks before creating test data**
   - Check blueprints.yaml for carrier rules
   - Ask if unsure - better to fail fast than create invalid tests

### Example: Correct Test Setup

```typescript
import { makePiece, makeMove, setupGameBasic, placeAt } from './test-helpers'

it('should handle navy deploy', () => {
  const game = setupGameBasic()

  // ✅ CORRECT: Use valid stack from blueprints
  const originalPiece = makePiece(NAVY, RED, false, [
    makePiece(AIR_FORCE), // Slot 1: AIR_FORCE ✓
    makePiece(TANK), // Slot 2: TANK ✓
  ])
  placeAt(game, originalPiece, 'c3') // ✅ Use placeAt for terrain validation

  // ✅ CORRECT: Use makeMove helper
  const move = makeMove({
    from: SQUARE_MAP.c3,
    to: SQUARE_MAP.c5,
    piece: makePiece(NAVY),
  })
  session.addMove(move)
})
```

### Example: Incorrect Test Setup

```typescript
// ❌ WRONG: Invalid stack (Tank + Infantry in slot 2)
const invalidStack = makePiece(NAVY, RED, false, [
  makePiece(TANK),
  makePiece(INFANTRY), // Navy can't carry both in slot 2!
])

// ❌ WRONG: Hardcoded piece object
game.put({ type: 'n', color: 'r', heroic: false }, 'c3')

// ❌ WRONG: Hardcoded move
const move = { from: 146, to: 114, piece: { type: 'n' } }
```

## Code Quality Rules

1. **Deep Clone Inputs to External Libraries**
   - When calling `pieceOps.combine()`, `PieceStacker.combine()`, or similar
     external functions
   - Always deep clone input pieces to prevent mutations:
     ```typescript
     const clonedPieces = pieces.map((p) => clonePiece(p) as Piece)
     return pieceOps.combine(clonedPieces)
     ```
   - This prevents external libraries from mutating caller's data

2. **Error Handling**
   - Catch and handle errors during move validation gracefully
   - Expected errors (invalid moves) should not bubble up as unhandled
     exceptions
   - Use try-catch in validation paths, not in happy paths

3. **Comments**
   - Comment WHY, not WHAT
   - "Deep clone pieces to avoid mutations by PieceStacker" ✓
   - "Clone the pieces array" ✗

## File Organization

- Test files: `__tests__/*.test.ts`
- Test helpers: `__tests__/test-helpers.ts` (import from here!)
- Core logic: `src/*.ts`
- Documentation: `TEST_SETUP_GUIDE.md` (reference for details)
- Type definitions: `src/type.ts`

## When to Ask

Before writing tests for:

- New piece types or stacking combinations
- Complex board states
- Deploy/recombine mechanics

Ask the human or refer to `blueprints.yaml`.

## Debugging

When tests fail:

1. Check if it's an invalid stack → fix using blueprints.yaml
2. Check if helpers were used → convert to helpers
3. Check for mutations in external calls → add deep cloning
4. Check stderr for "Error during move validation" → this is often expected
   during filtering

If console errors are from caught exceptions (move validation), they're usually
harmless.
