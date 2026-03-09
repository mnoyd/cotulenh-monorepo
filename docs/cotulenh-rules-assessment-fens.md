# CotuLenh Rules Advanced FEN Assessment

## Purpose

This is the second assessment set referenced by
`docs/cotulenh-rules-study-plan.md`.

Each prompt gives a concrete FEN and a single candidate action or state to
classify. Use the rules reference as the answer source.

## Questions

### 1. Legal move

- FEN: `9c1/11/11/11/11/11/11/2I8/11/11/11/10C r - - 0 1`
- Candidate action: `c5 -> d5`
- Classify the result.

### 2. Illegal move

- FEN: `9c1/11/11/11/11/11/11/2I8/11/11/11/10C r - - 0 1`
- Candidate action: `c5 -> c7`
- Classify the result.

### 3. Legal capture

- FEN: `6c4/11/11/11/11/11/11/11/11/5t5/11/5C5 b - - 0 1`
- Candidate action: `f3 -> f1`
- Classify the result.

### 4. Illegal capture

- FEN: `9c1/11/11/11/11/11/4i6/4E6/4T6/11/11/10C r - - 0 1`
- Candidate action: `e4 -> e7`
- Classify the result.

### 5. Legal combine

- FEN: `9c1/11/11/11/11/11/11/4I6/4T6/11/11/10C r - - 0 1`
- Candidate action: `e5 -> e4`
- Classify the result.

### 6. Illegal combine

- FEN: `9c1/11/11/11/11/11/11/2T8/11/11/11/N9C r - - 0 1`
- Candidate action: `a1 -> c5`
- Classify the result.

### 7. Legal deploy

- FEN: `9c1/11/11/11/11/11/11/11/4(FTI)6/11/11/10C r - - 0 1`
- Candidate action: `I>f4`
- Classify the result.

### 8. Illegal deploy

- FEN: `9c1/11/11/11/11/11/11/11/4(FTI)6/11/11/10C r - - 0 1`
- Candidate action: `F>b4`
- Classify the result.

### 9. Check

- FEN: `6c4/11/11/11/11/11/11/11/11/5t5/11/5C5 r - - 0 1`
- Candidate state label: `check`
- Classify the result.

### 10. Commander danger without check

- FEN: `5c5/11/11/11/11/11/11/11/11/11/11/5C5 r - - 0 1`
- Candidate state label: `commander danger without check`
- Classify the result.

## Answer Key

### 1. `c5 -> d5`

- Classification: legal move
- Reason: Infantry moves 1 square orthogonally, and `d5` is a legal land
  destination.

### 2. `c5 -> c7`

- Classification: illegal move
- Reason: Base Infantry does not move 2 squares.

### 3. `f3 -> f1`

- Classification: legal capture
- Reason: Tank has 2-square orthogonal capture range, so it may capture the
  Commander on `f1`.

### 4. `e4 -> e7`

- Classification: illegal capture
- Reason: The Infantry on `e5` blocks the Tank's line, and Tanks do not capture
  through blockers in current core behavior.

### 5. `e5 -> e4`

- Classification: legal combine
- Reason: The Infantry can move 1 square onto the friendly Tank and form a
  valid stack.

### 6. `a1 -> c5`

- Classification: illegal combine
- Reason: Combination still requires a legal move onto the friendly piece's
  square, and `a1` to `c5` is not a single legal Navy ray.

### 7. `I>f4`

- Classification: legal deploy
- Reason: The Infantry can be deployed 1 square orthogonally out of the stack
  on `e4`.

### 8. `F>b4`

- Classification: illegal deploy
- Reason: Air Force can cross restricted terrain while flying, but it still
  cannot finish on the pure navy square `b4`.

### 9. `check`

- Classification: correct
- Reason: The Tank on `f3` directly attacks the Commander on `f1`.

### 10. `commander danger without check`

- Classification: correct
- Reason: The commanders face each other on an open file, which is danger by
  exposure, but not direct check.
