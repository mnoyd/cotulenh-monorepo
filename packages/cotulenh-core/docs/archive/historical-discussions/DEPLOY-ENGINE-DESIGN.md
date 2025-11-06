# CoTuLenh Move Engine: Final Design

## Principles

- Real moves always mutate state via command pattern.
- Deploy is a session-managed sequence, not a single move.
- Cancel = undo all session commands; Commit = single history entry + destroy
  session + switch turn.
- Evaluation (validation/SAN/FEN preview) must not touch history/session.
- No `autoCommit` flag; engine derives behavior from context.

## Real Execution

- Normal move: build command → execute → push to history → switch turn.
- Deploy step: ensure DeploySession → execute → append to session (no history,
  no turn switch).
- Commit: wrap all session commands as one compound history entry → clear
  session → switch turn.
- Cancel: undo all session commands → clear session → keep turn.

## Evaluation (Temporary Execution)

Use `_executeTemporarily(move)`:

- Build command → execute → read state (checks/moves/FEN) → `undo()` → continue.
- Never writes to history or deploy session.

## SAN/LAN

- Temporarily execute move.
- Check opponent (turn hasn’t switched yet):
  - `isCheck = _isCommanderAttacked(them)`
  - `isMate = isCheck && opponent has 0 legal moves`
- Undo; add `^` for check, `#` for mate.

## Invariants

- Commands must fully undo without relying on history layout.
- Deploy session is the only owner of deploy-step commands until commit.
- History contains either single normal commands or one compound deploy command
  per session.
- Validation never corrupts board, history, or session.

## Implemented Changes

- Removed `autoCommit` usage from callers; `_makeMove` no longer accepts it.
- Added `_executeTemporarily(move)` and used it in:
  - `_filterLegalMoves`
  - `_moveToSanLan`
  - Move constructor FEN preview
- Fixed SAN check/mate detection (evaluate against opponent).
