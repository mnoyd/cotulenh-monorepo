# Test Rules Reference

**READ THIS BEFORE WRITING ANY TEST.** This is the condensed version of game
rules that you MUST understand to create valid tests.

---

## 1. Terrain Zones

The board is 11×12 (files a-k, ranks 1-12). River divides ranks 6 and 7.

### Zone Map

| Zone Type | Squares                                      |
| --------- | -------------------------------------------- |
| Pure Navy | Files a, b (all ranks)                       |
| Mixed     | File c (all ranks) + river: d6, e6, d7, e7   |
| Land      | Files d-k (except river squares)             |
| Bridge    | f6, f7, h6, h7 (required for heavy crossing) |

### Movement Permissions

| Piece Type      | Pure Navy (a-b) | Mixed (c, river) | Land (d-k) | Notes                           |
| --------------- | --------------- | ---------------- | ---------- | ------------------------------- |
| Navy            | ✓               | ✓                | ✗          | Water-only                      |
| Land units      | ✗               | ✓                | ✓          | Infantry, Militia, Tank, etc.   |
| Heavy (A, G, S) | ✗               | ✓                | ✓          | Must use bridges to cross river |
| Air Force       | ✓               | ✓                | ✓          | Ignores all terrain             |

### Common ILLEGAL Moves

```
❌ Navy c3 → d3       (Navy cannot enter pure land)
❌ Tank d1 → b1       (Land unit cannot enter pure navy zone)
❌ Artillery e5 → e8  (Heavy cannot cross river without bridge)
✓  Artillery e5 → f6 → e8  (Must route through bridge)
```

---

## 2. Piece Movement Ranges

| Piece        | Symbol | Base Move | Base Capture | Directions | Heroic Move | Heroic Capture |
| ------------ | ------ | --------- | ------------ | ---------- | ----------- | -------------- |
| Commander    | C/c    | ∞         | 1            | Orthogonal | ∞           | 2              |
| Infantry     | I/i    | 1         | 1            | Orthogonal | 2           | 2              |
| Tank         | T/t    | 2         | 2            | Orthogonal | 3           | 3              |
| Militia      | M/m    | 1         | 1            | All 8 dirs | 2           | 2              |
| Engineer     | E/e    | 1         | 1            | Orthogonal | 2           | 2              |
| Artillery    | A/a    | 3         | 3            | All 8 dirs | 4           | 4              |
| Anti-Air     | G/g    | 1         | 1            | Orthogonal | 2           | 2              |
| Missile      | S/s    | 2         | 2            | All\*      | 3           | 3              |
| Air Force    | F/f    | 4         | 4            | All 8 dirs | 5           | 5              |
| Navy         | N/n    | 4         | 4            | All 8 dirs | 5           | 5              |
| Headquarters | H/h    | 0         | 0            | None       | 1           | 1              |

\*Missile: diagonal limited to 1 square (2 when heroic)

### Special Abilities

- **Tank, Artillery, Missile, Air Force, Navy**: Ignore blocking (can shoot over
  pieces)
- **Air Force**: Ignores terrain, subject to air defense zones
- **Heavy pieces** (Artillery, Anti-Air, Missile): Require bridges f6/f7 or
  h6/h7 to cross river

---

## 3. Valid Piece Stacking (from blueprints.yaml)

**ONLY these combinations are valid. Do NOT invent stacks.**

| Carrier     | Slot 1                       | Slot 2                             |
| ----------- | ---------------------------- | ---------------------------------- |
| NAVY        | AIR_FORCE                    | COMMANDER, INFANTRY, MILITIA, TANK |
| TANK        | COMMANDER, INFANTRY, MILITIA | —                                  |
| ENGINEER    | ARTILLERY, ANTI_AIR, MISSILE | —                                  |
| AIR_FORCE   | TANK                         | COMMANDER, INFANTRY, MILITIA       |
| HEADQUARTER | COMMANDER                    | —                                  |

### Stack Examples

```typescript
// ✓ VALID: Navy carrying Air Force (slot 1) + Tank (slot 2)
makePiece(NAVY, RED, false, [makePiece(AIR_FORCE), makePiece(TANK)])

// ✓ VALID: Tank carrying Infantry (slot 1)
makePiece(TANK, RED, false, [makePiece(INFANTRY)])

// ✓ VALID: Engineer carrying Artillery (slot 1)
makePiece(ENGINEER, RED, false, [makePiece(ARTILLERY)])

// ❌ INVALID: Navy carrying Tank + Infantry (both in slot 2!)
makePiece(NAVY, RED, false, [makePiece(TANK), makePiece(INFANTRY)])

// ❌ INVALID: Tank carrying Artillery (not allowed)
makePiece(TANK, RED, false, [makePiece(ARTILLERY)])

// ❌ INVALID: Infantry as carrier (Infantry cannot carry)
makePiece(INFANTRY, RED, false, [makePiece(MILITIA)])
```

---

## 4. Valid Square Placements

### By Piece Type

| Piece     | Valid Squares for Tests                       |
| --------- | --------------------------------------------- |
| Navy      | a1-a12, b1-b12, c1-c12, d6, e6, d7, e7        |
| Land      | c1-c12, d1-k12 (all except pure navy a-b)     |
| Heavy     | Same as Land, but river crossing needs bridge |
| Air Force | Any square (a1-k12)                           |

### Safe Test Squares (no terrain issues)

- **For Navy tests**: Use `c3`, `c5`, `b4` (pure/mixed navy zones)
- **For Land tests**: Use `e4`, `f5`, `g6`, `h3` (pure land, no river)
- **For Heavy tests**: Use `e3`, `f6`, `h7`, `g9` (land + bridges)
- **For Air Force**: Any square works

---

## 5. Quick Validation Checklist

Before writing a test, verify:

- [ ] Piece is placed on valid terrain for its type
- [ ] Move destination is valid terrain for piece type
- [ ] Move distance is within piece's range (check heroic status)
- [ ] Stack combination is in blueprints.yaml
- [ ] Heavy pieces cross river only via f6/f7 or h6/h7
- [ ] Using `makePiece()`, `makeMove()`, `setupGameBasic()` helpers

---

## 6. Color Conventions

| Color | Code   | Piece Symbols | Starting Ranks |
| ----- | ------ | ------------- | -------------- |
| Red   | `RED`  | UPPERCASE     | 1-4            |
| Blue  | `BLUE` | lowercase     | 9-12           |

Red moves first.
