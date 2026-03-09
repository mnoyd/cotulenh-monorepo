# CotuLenh Lesson QA Checklist

## Purpose

Use this checklist whenever rule docs, learn lessons, or lesson translations
change.

Source order for disputes:

1. `packages/cotulenh/core/src`
2. `packages/cotulenh/core/__tests__`
3. `docs/cotulenh-rules.md`
4. `packages/cotulenh/learn/src/lessons`
5. `packages/cotulenh/learn/src/i18n`

## Preflight

- Confirm the rule change against `docs/cotulenh-rules.md`.
- Check whether the change also affects `docs/cotulenh-rules-worked-examples.md`.
- Check whether the change also affects `docs/cotulenh-rules-assessment-fens.md`.
- Confirm whether English and Vietnamese learn copy both need updates.

## Curriculum Coverage

- `subject-1-basic-movement`: each piece move range, move directions, and core
  movement caveats are accurate.
- `subject-2-terrain`: water, mixed zones, heavy crossing, and Air Force landing
  rules are accurate.
- `subject-3-capture`: normal, stay, suicide, and commander-capture behavior are
  accurate.
- `subject-4-blocking`: blocked pieces, capture-through-blocker pieces, and
  current Tank behavior are accurate.
- `subject-5-air-defense`: provider list, defense outcomes, and kamikaze rules
  are accurate.
- `subject-6-combine-piece`: carrier rules, terrain validation, and valid stack
  outcomes are accurate.
- `subject-7-deploy-move`: session timing, partial deploy, recombine, and commit
  behavior are accurate.
- `subject-8-heroic-rule`: promotion by check, movement upgrades, and Last Guard
  are accurate.
- `subject-9-flying-general`: commander exposure and illegal open-line moves are
  accurate.
- `subject-10-game-state-rules`: check, checkmate, stalemate, commander capture,
  draw rules, and deploy timing are accurate.

## Per-Lesson Review

For every touched lesson:

- The lesson `startFen` loads in core without FEN errors.
- The lesson goal or custom completion matches the intended rule.
- Any required move is actually present in the legal move list.
- Any action described as illegal is absent from the legal move list.
- The lesson title, description, content, instruction, hint, and success copy
  all describe the same rule.
- `targetSquares` match the teaching intent and do not imply illegal moves.
- English and Vietnamese translations match the lesson source behavior.

## Piece-By-Piece Rule Sweep

- Commander: long-range movement, adjacent capture, exposure rule, direct
  commander capture, heroic nuance.
- Infantry: 1-step orthogonal movement, heroic upgrade, terrain behavior.
- Engineer: Infantry-like movement, stack role, terrain behavior.
- Tank: 2-step orthogonal movement, blocked movement, blocked capture, carrier
  role.
- Militia: 1-step all-direction movement, terrain behavior.
- Artillery: 3-step all-direction movement, blocked movement, capture-through
  blocking, heavy crossing.
- Anti-Air: 1-step movement, air-defense role, heavy crossing.
- Missile: circular movement pattern, air-defense role, capture-through
  blocking, heavy crossing.
- Air Force: 4-step flight, blocking exception, landing restriction, air-defense
  interaction.
- Navy: navy and mixed terrain only, special blocking behavior, capture range,
  carrier role.
- Headquarters: base immobility, heroic movement, stack role, Last Guard.

## Mechanic Sweep

- Normal movement.
- Terrain.
- Capture types.
- Blocking.
- Air defense.
- Combination.
- Deploy.
- Heroic rule.
- Flying general.
- Game-state rules.

## Regression Assets

- Worked example FENs still produce the documented results.
- Advanced assessment FENs still classify the same way.
- Lesson IDs referenced in docs still exist.
- New lessons are included in both `en.ts` and `vi.ts`.

## Sign-Off

- Rule source verified.
- Lesson behavior verified in engine or learn tests.
- Docs updated.
- Translations updated.
- Tests and type checks passed.
