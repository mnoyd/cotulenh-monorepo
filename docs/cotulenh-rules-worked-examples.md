# CotuLenh Rules Worked Examples

## Purpose

These worked examples turn the hardest rules interactions from
`docs/cotulenh-rules.md` into reusable teaching and review assets.

Use them when:

- writing or revising learn lessons
- reviewing engine-facing rules prose
- checking whether a regression changed a previously documented outcome

## 1. Heavy Bridge Crossing

### Illegal crossing off the bridge file

- FEN: `9c1/11/11/11/11/11/11/4A6/11/11/11/10C r - - 0 1`
- Candidate move: `e5 -> e7`
- Outcome: illegal

Why:

- Artillery is a heavy unit.
- It may approach the river on `e6`, but it cannot cross from `e6` to `e7`
  because that route is not a bridge crossing.
- In this position the legal Artillery moves include `e6`, `f6`, and diagonal
  options, but not `e7`.

### Legal crossing through the bridge file

- FEN: `9c1/11/11/11/11/11/11/5A5/11/11/11/10C r - - 0 1`
- Candidate move: `f5 -> f7`
- Outcome: legal

Why:

- The route stays on the `f` bridge file.
- Heavy pieces may cross the river through bridge routes on `f6/f7` or
  `h6/h7`.
- From this position, the engine includes `f6`, `f7`, and `f8` as legal
  Artillery destinations.

## 2. Air-Defense Pathing Outcomes

### Safe route

- FEN: `9c1/11/11/11/11/11/5s5/11/11/3F7/11/10C r - - 0 1`
- Candidate move: `d3 -> d5`
- Outcome: legal

Why:

- The Air Force stays outside the defended route around the Missile on `f6`.
- The move remains in the legal move list for the Air Force.

### Destroyed route

- FEN: `9c1/11/11/11/11/11/5s5/11/11/3F7/11/10C r - - 0 1`
- Candidate move: `d3 -> f5`
- Outcome: illegal

Why:

- The Air Force route passes through defended airspace.
- The engine omits the move entirely because the route result is
  `DESTROYED`.

### Kamikaze route

- FEN: `9c1/11/11/11/11/11/11/4g6/11/11/11/4F5C r - - 0 1`
- Candidate move: `e1 -> e5`
- SAN: `F@e5`
- Outcome: legal suicide capture

Why:

- The Air Force is allowed to strike through exactly one defendable route and
  remove the Anti-Air target.
- The capture succeeds, but the attacking Air Force is also removed.
- After the move, only the commanders remain on the board.

## 3. Recombine During Deploy

- FEN: `9c1/11/11/11/11/11/11/11/4(TI)6/11/11/10C r - - 0 1`
- First move: `T>f4`
- Position after first move:
  `9c1/11/11/11/11/11/11/11/4(TI)6/11/11/10C r - - 0 1 e4:I:T>f4...`
- Follow-up move: `I>&f4`
- Outcome: legal recombine

Why:

- The first deploy step starts a deploy session and leaves Infantry at the
  origin.
- During the session, the remaining Infantry can target the previously deployed
  square.
- The engine exposes that follow-up as `I>&f4`, which is the deploy-recombine
  form.

## 4. Commander Exposure Versus Direct Check

### Danger but not check

- FEN: `5c5/11/11/11/11/11/11/11/11/11/11/5C5 r - - 0 1`
- Outcome: commander danger without check

Why:

- The commanders face each other on the same open file.
- `isCommanderInDanger()` is true because exposure exists.
- `isCheck()` is false because there is no direct attacking piece.

### Direct check

- FEN: `6c4/11/11/11/11/11/11/11/11/5t5/11/5C5 r - - 0 1`
- Outcome: check

Why:

- The Tank on `f3` directly attacks the Commander on `f1`.
- In this position both `isCheck()` and `isCommanderInDanger()` are true.

## Suggested Use

When a lesson, doc section, or test changes one of these mechanics:

1. Compare the updated behavior against the FEN in this file.
2. Update `docs/cotulenh-rules-assessment-fens.md` if the learner-facing
   classification should change.
3. Run the lesson QA review in `docs/cotulenh-lesson-qa-checklist.md`.
