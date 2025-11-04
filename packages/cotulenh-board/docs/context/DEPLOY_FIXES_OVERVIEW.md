# Deploy Session Fixes Overview

Summary of the fixes that make deploy sessions display and behave correctly across core, app, and board packages.

## 1. Core FEN Accuracy (cotulenh-core)

- **Change:** `CoTuLenh.fen()` now calls `DeploySession.toExtendedFEN(baseFEN)` instead of passing `startFEN`.
- **Why it matters:** The extended FEN now reflects the _current_ board state during an in-progress deploy sequence, so downstream consumers render accurate stacks.
- **Key file:** `packages/cotulenh-core/src/cotulenh.ts` (line ~367).
- **Regression target:** Board previously showed stale stacks because FEN reported the original pre-deploy layout.

## 2. UI Deploy Move Routing (cotulenh-app)

- **Change:** `makeCoreMove` inspects `game.getDeployState()` and sets `deploy: true` when a session is active.
- **Why it matters:** Prevents "No matching legal move" errors by ensuring multi-step deploy sequences send the correct move flag automatically.
- **Key file:** `apps/cotulenh-app/src/lib/utils.ts` (lines ~175-183).

## 3. Board Deploy-State Consumption (cotulenh-board)

- **FEN parsing:** `readWithDeployState()` extracts deploy metadata (origin square, deployed moves, completion flag).
- **State shape:** `state.deploySession` stores parsed data so rendering and controls can stay stateless.
- **Rendering:** `computeSquareClasses()` adds `deploy-origin`, `deploy-dest`, and `deploy-incomplete` classes; CSS gives origin gold pulse and destinations blue highlights.
- **CSS location:** `packages/cotulenh-board/assets/commander-chess.base.css`.

## 4. Stack Destination Highlighting (cotulenh-app)

- **Problem:** Clicking a stack without picking a piece showed combined destinations.
- **Fix:** `mapPossibleMovesToDests` now adds a `square.undefined` entry for carrier moves so direct stack clicks highlight only the carrier's legal squares. Popup selection still uses `square.role`. Deploy mode continues to expose every carried piece.
- **Reference:** documented in `docs/api-reference.md` (Stack selection keys subsection).

## Verification Checklist

- Deploying from a stack updates FEN and renders split stacks immediately.
- Subsequent moves within the deploy session succeed without manual flag toggling.
- Board highlights origin + deployed squares via CSS.
- Clicking stacks shows only the carrier’s destinations unless the user selects a specific piece or deploy mode is active.

## Related Detailed Notes

- **Deploy pipeline implementation details:** `DEPLOY_STATE_IMPLEMENTATION.md`
- **Extended FEN data flow:** `DEPLOY_DATA_FLOW_ANALYSIS.md`
- **Stack highlight specifics:** `STACK_SELECTION_FIX_FINAL.md`
