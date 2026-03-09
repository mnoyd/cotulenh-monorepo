# CotuLenh Rules Reference

## Purpose

This document is the current rules reference for CotuLenh.

Companion study guide:

- `docs/cotulenh-rules-study-plan.md`

It follows the same top-level mechanic grouping used by the learn system:

1. Basic movement
2. Terrain
3. Capture
4. Blocking
5. Air defense
6. Combine pieces
7. Deploy move
8. Heroic rule
9. Flying general

It then adds a final chapter for core-enforced game-state rules that the learn
system does not yet present as a separate subject.

## Source Hierarchy

When two documents disagree, use this order:

1. Core engine source in `packages/cotulenh/core/src`
2. Core tests in `packages/cotulenh/core/__tests__`
3. Learn curriculum structure in `packages/cotulenh/learn/src/lessons`
4. Older prose docs and condensed references

This matters because some learn lesson copy and some older summaries appear to
lag behind the current engine in a few places.

## Core Files

- Board, masks, flags, squares: `packages/cotulenh/core/src/type.ts`
- Game state facade: `packages/cotulenh/core/src/cotulenh.ts`
- Move generation: `packages/cotulenh/core/src/move-generation.ts`
- Session and deploy flow: `packages/cotulenh/core/src/move-session.ts`
- Atomic move application: `packages/cotulenh/core/src/move-apply.ts`
- Stack helpers and notation: `packages/cotulenh/core/src/utils.ts`
- Air defense: `packages/cotulenh/core/src/air-defense.ts`
- FEN validation: `packages/cotulenh/core/src/fen-validation.ts`

## Key Terms

- `stack`: multiple pieces occupying one square under one carrier
- `carrier`: the top-level piece type that defines the stack's terrain rules
- `passenger`: a carried piece inside a stack
- `deploy`: a multi-step sequence that splits a stack into separate moves
- `recombine`: moving a remaining deploy piece onto a previously deployed square
  to form a valid stack again
- `stay capture`: a capture where the attacker does not move
- `suicide capture`: a capture where attacker and target are both removed
- `heroic`: an upgraded piece state with modified movement and air-defense
  behavior
- `commander danger`: broader than check; includes both direct attack and
  commander exposure

## Board Model And Notation

### Board

- The board is `11 x 12`.
- Files are `a` through `k`.
- Ranks are `1` through `12`.
- The river sits between ranks `6` and `7`.

### Terrain Zones

- Pure navy: files `a` and `b`
- Mixed: file `c`, plus `d6`, `e6`, `d7`, `e7`
- Land: files `d` through `k`, except the four mixed river squares above
- Bridge squares for heavy crossing: `f6`, `f7`, `h6`, `h7`

### FEN

- FEN uses 12 ranks separated by `/`.
- Red pieces are uppercase.
- Blue pieces are lowercase.
- Heroic pieces use a `+` prefix.
- Stacks use parentheses, for example `(FTI)` or `(+n+t)`.
- Castling and en passant are always `-`.
- Active turn, halfmove count, and move number are included.

### SAN And LAN

Current separator symbols in core notation are:

- normal move: no separator, example `Ed6`
- deploy: `>`, example `I>c3`
- stay capture: `_`, example `A_b2`
- normal capture: `x`, example `Ixc6`
- suicide capture: `@`
- combination: `&`, example `T&e6`
- deploy recombine: `>&`, example `T>&c5`

Check and mate suffixes are not currently appended by the move-notation
generator.

### FEN Edge Cases

- Empty counts `10` and `11` are valid.
- `0` and `12` are invalid rank counts.
- Nested stack parentheses are invalid.
- Dangling `+` heroic markers are invalid.
- Missing or extra ranks are invalid.
- Invalid turn tokens, non-dash castling fields, and non-dash en passant fields
  are invalid.

Primary tests:

- `packages/cotulenh/core/__tests__/fen-validation.test.ts`
- `packages/cotulenh/core/__tests__/cotulenh.test.ts`
- `packages/cotulenh/core/__tests__/san.test.ts`

## 1. Basic Movement

### Core Movement Table

| Piece        | Base Move                | Base Capture  | Directions       | Important Notes                                            |
| ------------ | ------------------------ | ------------- | ---------------- | ---------------------------------------------------------- |
| Commander    | board-limited long range | adjacent only | orthogonal       | special exposure rules                                     |
| Infantry     | 1                        | 1             | orthogonal       | heroic gains diagonal mobility                             |
| Engineer     | 1                        | 1             | orthogonal       | stack-related carrier unit                                 |
| Tank         | 2                        | 2             | orthogonal       | does not ignore blocking in current core                   |
| Militia      | 1                        | 1             | all 8 directions | simple diagonal-capable land unit                          |
| Artillery    | 3                        | 3             | all 8 directions | capture can ignore blockers                                |
| Anti-Air     | 1                        | 1             | orthogonal       | projects air defense                                       |
| Missile      | 2                        | 2             | all 8 directions | diagonal range is effectively 1 in base form               |
| Air Force    | 4                        | 4             | all 8 directions | ignores piece blocking, checks air defense while traveling |
| Navy         | 4                        | 4             | all 8 directions | restricted to navy and mixed terrain                       |
| Headquarters | 0                        | 0             | none             | only moves when heroic                                     |

### Exact Rules

- Movement is generated by ray-casting from the source square.
- For most pieces, move range and capture range are both finite and piece
  specific.
- Commander movement is long-range orthogonal, but its normal capture remains
  adjacent only.
- Air Force ignores piece blocking while moving.
- Navy treats non-navy pieces differently from navy pieces for blocking.

### Heroic Movement Overrides

In current core behavior:

- Most pieces gain `+1` move range.
- Most pieces gain `+1` capture range.
- Most pieces gain diagonal movement if they did not already have it.
- Headquarters becomes a 1-square mover when heroic.

Important commander nuance:

- The movement config increases commander capture range numerically.
- Actual move generation still restricts commander capture to adjacent squares.
- For rules writing, treat commander capture as adjacent only unless the engine
  changes.

### Edge Cases

- Heroic infantry gains diagonal movement.
- Heroic tank gains 3-square orthogonal movement.
- Heroic headquarters can move one square in all directions.
- Heroic status is shown in SAN with `+`.

### Learn Coverage

Subject: `subject-1-basic-movement`

Lessons:

- `bm-1-1` infantry
- `bm-1-2` engineer
- `bm-1-3` militia
- `bm-1-4` commander
- `bm-1-5` headquarters
- `bm-2-1` tank
- `bm-2-2` anti-air
- `bm-2-3` missile
- `bm-3-1` artillery
- `bm-3-2` air force
- `bm-3-3` navy

### Engine References

- `packages/cotulenh/core/src/move-generation.ts`
- `packages/cotulenh/core/src/type.ts`
- `packages/cotulenh/core/__tests__/heroic.test.ts`

## 2. Terrain

### Exact Rules

- Navy can only occupy navy or mixed terrain.
- Land units can occupy land or mixed terrain.
- Air Force can cross forbidden terrain in flight but still uses land-style
  landing rules for move destinations.
- Terrain is enforced both when placing pieces and when generating moves.

### Heavy Crossing

Heavy pieces are:

- Artillery
- Anti-Air
- Missile

Heavy pieces may not cross between board halves except through bridge routes.
The current implementation handles this by checking zone transitions and
allowing the crossing when the route passes the bridge files.

### Edge Cases

- Navy cannot enter pure land even if a move path otherwise looks open.
- Land pieces cannot enter pure navy squares on files `a` and `b`.
- A combined piece is validated against the final carrier terrain, not the
  incoming piece's terrain.
- Recombine moves are filtered out if the resulting carrier would end on invalid
  terrain.
- Air Force may pass over water but cannot freely end on pure navy squares.

### Learn Coverage

Subject: `subject-2-terrain`

Lessons:

- `terrain-1` water vs land
- `terrain-2` river and bridges
- `terrain-3` mixed zones

### Engine References

- `packages/cotulenh/core/src/type.ts`
- `packages/cotulenh/core/src/cotulenh.ts`
- `packages/cotulenh/core/src/move-generation.ts`
- `packages/cotulenh/core/__tests__/recombine.test.ts`
- `packages/cotulenh/core/TEST_RULES_REFERENCE.md`

## 3. Capture

### Capture Types

#### Normal Capture

- The attacker moves onto the target square.
- The target is removed.
- The attacker replaces it.

#### Stay Capture

- The attacker remains on its original square.
- The target is removed from the target square.
- This is represented with `_` in SAN and LAN.

#### Suicide Capture

- Both attacker and target are removed.
- This is used by air-defense kamikaze outcomes.

### Piece-Specific Capture Rules

- Commander captures only adjacent squares in normal play.
- Commander may directly capture the enemy commander along an orthogonal line of
  sight if the path is open.
- Navy has two effective attack modes:
  - against navy targets, full capture range
  - against non-navy targets, reduced effective range
- Air Force may generate both normal-capture and stay-capture options when not
  deploying.

### Edge Cases

- If a piece cannot legally land on a target square, the engine may still allow
  a stay capture there.
- Deploy captures are legal and are folded into a deploy session.
- Suicide capture is resolved immediately and does not move the attacker onto
  the target square.
- The engine tracks capture flags per atomic move and then aggregates them into
  deploy results.

### Learn Coverage

Subject: `subject-3-capture`

Lessons:

- `capture-1` normal capture
- `capture-2` stay capture
- `capture-3` river capture
- `capture-4` air force capture

### Engine References

- `packages/cotulenh/core/src/move-generation.ts`
- `packages/cotulenh/core/src/move-apply.ts`
- `packages/cotulenh/core/src/utils.ts`
- `packages/cotulenh/core/__tests__/san.test.ts`

## 4. Blocking

### General Rule

Blocking is not uniform across pieces. The engine separates:

- whether a piece blocks movement
- whether a piece blocks capture
- whether the move ray should stop at a piece

### Current Core Behavior

- Most pieces are blocked normally.
- Tank does not ignore movement blocking in current core.
- Artillery and Missile can capture through blockers because capture ignores
  piece blocking for those types.
- Air Force ignores movement and capture blocking.
- Navy is blocked by navy pieces, but not by non-navy pieces for movement.

### Terrain-Driven Blocking

- Navy has hard-coded diagonal obstacle squares for specific diagonals.
- Heavy pieces can be blocked by river-crossing rules even with open lines.

### Edge Cases

- A commander cannot slide past an enemy commander on an orthogonal line.
- Blocking resolution happens after move and capture candidate generation, which
  is why some long-range pieces can still capture through blockers.
- Some older test references and lesson text about tank blocking appear stale;
  the engine does not currently give tank generic shoot-through blocking.

### Learn Coverage

Subject: `subject-4-blocking`

Lessons:

- `blocking-1` tank blocked
- `blocking-2` artillery blocked
- `blocking-3` commander blocked
- `blocking-3a` navy coast movement
- `blocking-4` tank blocking capture lesson
- `blocking-5` artillery long-range strike
- `blocking-6` air force overflight
- `blocking-7` navy through congestion
- `blocking-8` missile shoots over

### Engine References

- `packages/cotulenh/core/src/move-generation.ts`
- `packages/cotulenh/core/__tests__/checkmate.test.ts`
- `packages/cotulenh/core/TEST_RULES_REFERENCE.md`

## 5. Air Defense

### Providers

Only these pieces project air defense in current core:

- Missile
- Navy
- Anti-Air

### Defense Level

- Missile: base level 2
- Navy: base level 1
- Anti-Air: base level 1
- Heroic status adds `+1` defense level

### Zone Shape

- Air defense zones are geometric circular masks using `x^2 + y^2 <= level^2`.
- The defended square map includes the defender's own square.
- Overlapping defenders stack in the map as multiple defenders on one protected
  square.

### Air Force Interaction

While generating Air Force movement, the engine checks each traveled step
through enemy air defense:

- `SAFE_PASS`: move may continue
- `KAMIKAZE`: a special suicide capture can be generated
- `DESTROYED`: the route is illegal and the move is rejected

### Edge Cases

- Board edges clip the air-defense zone naturally.
- Heroic Anti-Air covers more squares than base Anti-Air.
- Two defenders can both cover the same square.
- Kamikaze depends on the path state, not just the destination square.

### Learn Coverage

Subject: `subject-5-air-defense`

Lessons:

- `air-defense-1` avoid defended zones
- `air-defense-2` kamikaze capture

### Engine References

- `packages/cotulenh/core/src/air-defense.ts`
- `packages/cotulenh/core/src/move-generation.ts`
- `packages/cotulenh/core/__tests__/air-defense.test.ts`

## 6. Combine Pieces

### General Rule

A friendly piece can move onto another friendly piece and form a stack if the
combination is valid under the stack blueprint rules from
`@cotulenh/combine-piece`.

### Core Properties

- Mixed-color stacks are rejected.
- Not every piece can be a carrier.
- Valid slot ordering matters for multi-piece stacks.
- The resulting carrier determines the terrain legality of the combined stack.

### Current Valid Carrier Families

The tests document these carrier families:

- Navy
- Tank
- Engineer
- Air Force
- Headquarters

### Edge Cases

- A piece may fit one slot but not another.
- A single carried piece can fit any legal slot for that carrier.
- Removing a piece from a stack can promote a passenger into the resulting
  carrier position.
- A stack containing a commander still counts as a commander-holding square for
  commander-limit checks.

### Learn Coverage

Subject: `subject-6-combine-piece`

Lessons:

- `combine-1`
- `combine-2`
- `combine-3`
- `combine-4`
- `combine-5`

### Engine References

- `packages/cotulenh/core/src/utils.ts`
- `packages/cotulenh/core/src/cotulenh.ts`
- `packages/cotulenh/core/src/move-generation.ts`
- `packages/cotulenh/core/__tests__/test-helpers.ts`

## 7. Deploy Move

### What Deployment Is

Deployment is a session-based multi-move mechanic for splitting a stack. The
engine does not treat each deploy submove as a full turn by itself.

### Session Rules

- The first deploy submove creates a `MoveSession`.
- Submoves execute immediately on the board.
- The turn does not switch during an unfinished deploy session.
- The session may auto-commit when all pieces are deployed.
- The session may also be committed manually with remaining pieces left on the
  origin square.

### Remaining And Stay Pieces

- The session computes the remaining atomic pieces by subtracting deployed
  pieces from the original flattened stack.
- If the session is committed early, the remaining pieces stay at the origin as
  a legal combined piece.

### Recombine

- During deploy, a remaining piece may target a previously deployed square.
- If the resulting combined stack is legal, this becomes a recombine move.
- Recombine moves use deploy-plus-combination notation like `>&`.
- Invalid recombination is filtered out, especially when the resulting carrier
  would violate terrain.

### Undo And Cancel

- Undo can revert individual deploy submoves.
- Undoing the last remaining deploy submove clears the session.
- Canceling a session restores the original board state.

### Game-State Edge Cases

- `isGameOver()` intentionally returns false during an active deploy session.
- Commander safety for deploy can be delayed until commit so that a full deploy
  sequence may escape danger even if an intermediate position does not.
- Partial deploy can still be legal if the remaining stack is valid on the
  origin square.

### Learn Coverage

Subject: `subject-7-deploy-move`

Lessons:

- `deploy-1`
- `deploy-2`
- `deploy-3`

### Engine References

- `packages/cotulenh/core/src/move-session.ts`
- `packages/cotulenh/core/src/move-generation.ts`
- `packages/cotulenh/core/src/move-apply.ts`
- `packages/cotulenh/core/__tests__/deploy-integration.test.ts`
- `packages/cotulenh/core/__tests__/deploy-auto-commit.test.ts`
- `packages/cotulenh/core/__tests__/recombine.test.ts`

## 8. Heroic Rule

### Promotion By Giving Check

After a move resolves, the engine finds all of the moving side's pieces that
now attack the enemy commander. Any such non-heroic attackers become heroic.

This can include:

- the piece that moved
- another friendly piece whose line was opened
- pieces inside stacks if they now count as attackers

### Movement Effects

- Range increases by 1 for most pieces.
- Diagonal movement is enabled for pieces that normally lack it.
- Headquarters gains 1-square movement and capture.

### Last Guard

Current core includes an additional heroic rule that learn does not fully teach:

- If a side is reduced to commander plus exactly one non-commander atomic piece,
  that last remaining non-commander piece becomes heroic.
- This counts flattened pieces, not just visible stack carriers.
- A stack that still contains multiple atomic pieces does not qualify.

### Edge Cases

- Heroic status is undone correctly when the move is undone.
- Multiple attackers can become heroic after one move.
- Headquarter can become the last guard and promote.
- `skipLastGuardPromotion` disables that post-move promotion path.

### Learn Coverage

Subject: `subject-8-heroic-rule`

Lessons:

- `heroic-rule-1`
- `heroic-rule-2`

### Engine References

- `packages/cotulenh/core/src/move-generation.ts`
- `packages/cotulenh/core/src/move-apply.ts`
- `packages/cotulenh/core/__tests__/heroic.test.ts`
- `packages/cotulenh/core/__tests__/last-guard.test.ts`

## 9. Flying General

### General Rule

Commander safety is broader than direct attack. The engine also enforces
commander exposure: if a commander stands in an unobstructed line against the
enemy commander, that can make the square illegal.

### Current Core Behavior

- Commander exposure constraints are computed before commander move generation.
- Commander moves that enter or remain in exposed lines are blocked.
- A commander cannot slide past an enemy commander on an orthogonal line.
- Direct commander-on-commander orthogonal capture is a special allowed case.

### Important Distinction

- `isCheck()` only tests direct attack on the current side's commander.
- `isCommanderInDanger()` includes both direct attack and exposure.

That means a position can be:

- not in check
- but still illegal or dangerous because of commander exposure

### Hidden Commander Edge Case

If a commander is carried inside a legal stack, it is not treated the same way
as an exposed visible top-level commander for some move-generation cases. Tests
show that a carrier containing a commander can cross an otherwise exposed line
in situations where a visible commander could not.

### Learn Coverage

Subject: `subject-9-flying-general`

Lessons:

- `flying-general-1`

### Engine References

- `packages/cotulenh/core/src/move-generation.ts`
- `packages/cotulenh/core/src/cotulenh.ts`
- `packages/cotulenh/core/__tests__/commander_vision.test.ts`
- `packages/cotulenh/core/__tests__/cotulenh.test.ts`
- `packages/cotulenh/core/__tests__/checkmate.test.ts`

## 10. Game-State Rules

### Check

- A side is in check when its commander is directly attacked.
- Exposure alone does not make `isCheck()` true.

### Checkmate

- Checkmate requires:
  - current side is in check
  - no legal moves escape the condition

### Stalemate

- Stalemate requires:
  - current side is not in check
  - current side has no legal moves

### Commander Captured

- The game is over if either commander is removed from the board.
- Commander removal is tracked explicitly by commander-square bookkeeping.

### Repetition And Fifty-Move Rule

- Threefold repetition is based on full FEN position counts.
- Fifty-move draw uses halfmove count `>= 100`.

### Deploy Interaction

- Active deploy sessions suppress `isGameOver()` until the session is resolved.

### Edge Cases

- A position may be `commander in danger` without being `check`.
- Stalemate and checkmate are distinguished correctly in tests.
- Commander capture counts as terminal even if no checkmate search is needed.

### Engine References

- `packages/cotulenh/core/src/cotulenh.ts`
- `packages/cotulenh/core/__tests__/checkmate.test.ts`
- `packages/cotulenh/core/__tests__/cotulenh.test.ts`

## Known Documentation Mismatches To Resolve

These should be reviewed before reusing older lesson copy as formal rules text:

1. Artillery wording

- Some learn prose describes artillery as unlimited orthogonal movement.
- Current core config gives artillery finite range with diagonal capability.

2. Tank blocking wording

- Some older text implies tank may shoot over blockers.
- Current core move generation does not treat tank as generally ignoring
  blockers.

3. Air Force terrain summaries

- Some older helper prose suggests Air Force can occupy any square.
- Current core allows Air Force to traverse forbidden terrain in flight, but its
  legal move destinations still use land-style masks.

4. Heroic commander interpretation

- Movement config upgrades heroic commander broadly.
- Actual commander capture logic remains adjacent-only in move generation.

## Suggested Follow-Up Work

1. Reconcile learn lesson copy against current core behavior.
2. Promote `Game-State Rules` and `Last Guard` into the learn curriculum.
3. Add example diagrams for:
   - heavy bridge crossing
   - air-defense pathing
   - recombine during deploy
   - commander exposure versus direct check
