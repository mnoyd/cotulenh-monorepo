# Action-Based Deploy Architecture – Gap Analysis

**Created**: October 22, 2025  
**Status**: Needs Resolution  
**Scope**: Documents outstanding gaps, ambiguities, and risks identified while
reviewing the action-based deploy architecture documentation under
`docs/deploy-action-based-architecture/`.

---

## Summary

- **Purpose**: Capture missing documentation, conflicting guidance, and
  unanswered questions before implementation begins.
- **Context**: Based on cross-reading `00-OVERVIEW.md`, `01-FEN-HANDLING.md`,
  `02-MOVE-GENERATION.md`, and `COMPLETE-IMPLEMENTATION-GUIDE.md`.
- **Outcome**: Prioritized actions that unblock implementation, clarify game
  rules, and align documentation.

---

## ✅ STATUS UPDATE

**ALL CRITICAL ISSUES RESOLVED** - See `FINAL-STATUS.md` for complete resolution
report.

**Important**: `CRITICAL-RISKS.md` is now OUTDATED. It was written before
discovering that:

- Move reversal already implemented via `_undoMove()` command pattern
- No cloning used - system is already action-based
- All validation exists in `_filterLegalMoves` and `PieceStacker`

This document (GAP-ANALYSIS.md) remains for historical reference. For current
status:

- **Read**: `FINAL-STATUS.md` - Complete resolution status
- **Read**: `RESOLVED-GAPS.md` - How each gap was resolved
- **Read**: `SAN-PARSER-SPEC.md` - Parser specification (ready to implement)

---

## Missing Documentation

- **`03-VALIDATION.md`**  
  **Status**: Referenced in `00-OVERVIEW.md` but absent.  
  **Needed**: Terrain validation flow, commander attack checks, validation
  timing.  
  **Action**: Draft validation guide or adjust references.

- **`04-HISTORY.md`**  
  **Status**: Referenced but absent.  
  **Needed**: Undo/redo strategy, transaction boundaries, move number
  handling.  
  **Action**: Author history management spec or consolidate within existing
  files.

- **`05-RECOMBINE.md`**  
  **Status**: Referenced but absent.  
  **Needed**: Detailed recombine move rules, validation, SAN examples.  
  **Action**: Create dedicated recombine reference or integrate into
  `COMPLETE-IMPLEMENTATION-GUIDE.md`.

- **`06-IMPLEMENTATION-PLAN.md`**  
  **Status**: Referenced but absent.  
  **Needed**: Phase-by-phase checklist, sequencing, dependencies.  
  **Action**: Produce migration roadmap or remove placeholder.

- **`07-COMPARISON.md`**  
  **Status**: Referenced but absent.  
  **Needed**: Comparative analysis vs. virtual overlay approach.  
  **Action**: Prepare comparison doc or revise overview.

---

## Critical Gaps

### Gap 1: Action Type Inconsistency

- **Summary**: `00-OVERVIEW.md` introduces a bespoke `DeployAction` with
  `execute()/undo()`, while `COMPLETE-IMPLEMENTATION-GUIDE.md` states
  `actions: InternalMove[]`. No reconciliation of responsibilities.
- **Open Questions**:
  - Should `DeploySession.actions` store custom action objects, `InternalMove`s,
    or both?
  - Where are undo semantics implemented if using `InternalMove`?
- **Recommended Actions**: Align documentation on action representation,
  document undo mechanics, and update examples accordingly.
- **Related Files**: `docs/deploy-action-based-architecture/00-OVERVIEW.md`,
  `docs/deploy-action-based-architecture/COMPLETE-IMPLEMENTATION-GUIDE.md`.

### Gap 2: Duplicate Piece Handling

- **Summary**: `02-MOVE-GENERATION.md` flags ambiguity when stacks contain
  duplicate piece types but offers no specification.
- **Open Questions**:
  - How are pieces uniquely identified (index, ID, reference equality)?
  - Does UI expose selection for identical pieces?
- **Recommended Actions**: Define piece identity strategy and propagate to move
  generation, SAN encoding, and UI expectations.
- **Related Files**:
  `docs/deploy-action-based-architecture/02-MOVE-GENERATION.md`.

### Gap 3: Commander Attack Rules During Deploy

- **Summary**: Edge case listed in `COMPLETE-IMPLEMENTATION-GUIDE.md` but no
  rules.
- **Open Questions**:
  - Can a deploy move leave the commander in check?
  - Must deploy resolve existing checks immediately?
- **Recommended Actions**: Document commander attack handling in validation
  guide and ensure move filters enforce it.
- **Related Files**:
  `docs/deploy-action-based-architecture/COMPLETE-IMPLEMENTATION-GUIDE.md` (Edge
  Cases checklist).

### Gap 4: Check/Checkmate Handling

- **Summary**: No clarification on applying chess-like legality rules
  mid-deploy.
- **Open Questions**:
  - Are checks evaluated after each deploy step?
  - Can a session commit if the final board is illegal?
- **Recommended Actions**: Specify legality checks in forthcoming validation
  document and illustrate with examples.
- **Related Files**: `docs/deploy-action-based-architecture/00-OVERVIEW.md`,
  `docs/deploy-action-based-architecture/COMPLETE-IMPLEMENTATION-GUIDE.md`.

### Gap 5: Extended FEN "Stay" Syntax

- **Summary**: `COMPLETE-IMPLEMENTATION-GUIDE.md` introduces `T<Nc5,Fd4...` with
  no formal definition.
- **Open Questions**:
  - Grammar for `DEPLOY` suffix, especially staying pieces and captures?
  - Parser expectations and backward compatibility?
- **Recommended Actions**: Publish formal grammar, parsing rules, and round-trip
  examples in FEN documentation.
- **Related Files**: `docs/deploy-action-based-architecture/01-FEN-HANDLING.md`,
  `docs/deploy-action-based-architecture/COMPLETE-IMPLEMENTATION-GUIDE.md`.

---

## Unclear Areas

### Gap 6: Terrain Validation Timing

- **Summary**: Documentation proposes validation during move generation, move
  application, and post-move try/catch without clear sequence.
- **Open Questions**:
  - Which layer rejects illegal terrain states first?
  - How are error messages surfaced to UI?
- **Recommended Actions**: Define single authoritative validation pipeline,
  augment `03-VALIDATION.md`, and ensure examples align.
- **Related Files**:
  `docs/deploy-action-based-architecture/02-MOVE-GENERATION.md`,
  `docs/deploy-action-based-architecture/COMPLETE-IMPLEMENTATION-GUIDE.md`.

### Gap 7: Partial Deploy Commit Rules

- **Summary**: `DeployConfig.allowPartialCommit` introduced without semantics.
- **Open Questions**:
  - What constitutes a valid partial commit?
  - How does turn progression work?
- **Recommended Actions**: Document use cases, constraints, and history behavior
  before implementation.
- **Related Files**:
  `docs/deploy-action-based-architecture/COMPLETE-IMPLEMENTATION-GUIDE.md`.

### Gap 8: Recombine Validation Coverage

- **Summary**: Generation logic is detailed, validation is not.
- **Open Questions**:
  - Do recombine moves obey terrain, carrying limits, and commander safety?
  - How are illegal recombine attempts reported?
- **Recommended Actions**: Extend recombine spec to include validation flow and
  examples.
- **Related Files**:
  `docs/deploy-action-based-architecture/02-MOVE-GENERATION.md`,
  `docs/deploy-action-based-architecture/COMPLETE-IMPLEMENTATION-GUIDE.md`.

### Gap 9: Error Recovery & Rollback Strategy

- **Summary**: Try/catch validation relies on `game.clone()` without documenting
  cost or failure modes.
- **Open Questions**:
  - Is cloning performant and deterministic during deploy?
  - What fallback exists if clone fails?
- **Recommended Actions**: Describe rollback strategy, performance expectations,
  and alternative validation options.
- **Related Files**:
  `docs/deploy-action-based-architecture/COMPLETE-IMPLEMENTATION-GUIDE.md`.

### Gap 10: Deploy Session Cancellation

- **Summary**: No guidance on aborting an in-progress session.
- **Open Questions**:
  - How to revert board state and history when cancelling?
  - Is cancellation exposed in UI?
- **Recommended Actions**: Specify cancellation workflow, state restoration, and
  user feedback.
- **Related Files**: `docs/deploy-action-based-architecture/00-OVERVIEW.md`,
  `docs/deploy-action-based-architecture/COMPLETE-IMPLEMENTATION-GUIDE.md`.

---

## Design Concerns

### Gap 11: Remaining Piece Calculation Performance

- **Summary**: Remaining pieces derived on-the-fly each move; potential
  duplication across layers.
- **Questions**: Should results be cached? When are caches invalidated?
- **Actions**: Benchmark calculation cost and document caching strategy if
  required.
- **References**: `docs/deploy-action-based-architecture/02-MOVE-GENERATION.md`,
  `docs/deploy-action-based-architecture/COMPLETE-IMPLEMENTATION-GUIDE.md`.

### Gap 12: FEN Round-Trip Complexity

- **Summary**: Loading extended FEN requires SAN parsing not yet specified.
- **Questions**: How to disambiguate SAN, apply captures, and maintain
  chronology?
- **Actions**: Produce round-trip procedure with parser contract and tests.
- **References**: `docs/deploy-action-based-architecture/01-FEN-HANDLING.md`,
  `docs/deploy-action-based-architecture/COMPLETE-IMPLEMENTATION-GUIDE.md`.

### Gap 13: Move Reversal Details

- **Summary**: Recombine handling references `reverseMove` without
  implementation notes.
- **Questions**: How are captures, carrying stacks, and terrain restored?
- **Actions**: Document reversal primitives and state invariants.
- **References**:
  `docs/deploy-action-based-architecture/COMPLETE-IMPLEMENTATION-GUIDE.md`.

### Gap 14: Castling & En Passant During Deploy

- **Summary**: Extended FEN discussion omits special rights interaction.
- **Questions**: Do castling rights freeze? Can en passant targets exist
  mid-deploy?
- **Actions**: Clarify behavior and update FEN generator/parser requirements.
- **References**: `docs/deploy-action-based-architecture/01-FEN-HANDLING.md`.

### Gap 15: Move Number Consistency

- **Summary**: Examples suggest move number stays constant during deploy, but
  history model is undecided.
- **Questions**: When do halfmove/fullmove counters advance?
- **Actions**: Document move counter policy and align with history commit rules.
- **References**: `docs/deploy-action-based-architecture/00-OVERVIEW.md`,
  `docs/deploy-action-based-architecture/COMPLETE-IMPLEMENTATION-GUIDE.md`.

---

## Implementation Ambiguities

### Gap 16: Single Session Constraints

- **Summary**: Documentation implies but does not state that only one deploy
  session can exist.
- **Actions**: Explicitly define concurrency rules and guard conditions.
- **References**: `docs/deploy-action-based-architecture/00-OVERVIEW.md`.

### Gap 17: UI Integration Expectations

- **Summary**: Extended FEN should inform UI, yet no requirements are given.
- **Actions**: Draft UI contract covering highlights, recombine prompts, and
  cancellation controls.
- **References**:
  `docs/deploy-action-based-architecture/COMPLETE-IMPLEMENTATION-GUIDE.md`.

### Gap 18: SAN Notation Grammar

- **Summary**: Multiple SAN forms shown without grammar or disambiguation rules.
- **Actions**: Publish SAN grammar, capture syntax, and recombine notation, plus
  parsing guidance.
- **References**:
  `docs/deploy-action-based-architecture/COMPLETE-IMPLEMENTATION-GUIDE.md`.

### Gap 19: Action Order Dependencies

- **Summary**: Recombine section notes dependency preservation but lacks
  examples beyond simple case.
- **Actions**: Document dependency scenarios, ordering constraints, and undo
  impacts.
- **References**:
  `docs/deploy-action-based-architecture/COMPLETE-IMPLEMENTATION-GUIDE.md`.

### Gap 20: Validation Error Messaging

- **Summary**: Errors (terrain, commander attack) referenced without messaging
  strategy.
- **Actions**: Define error taxonomy, message format, and localization
  considerations.
- **References**:
  `docs/deploy-action-based-architecture/COMPLETE-IMPLEMENTATION-GUIDE.md`.

---

## Testing Gaps

- **Stress & Edge Coverage**: Need scenarios for large stacks, illegal
  recombines, commander attacks, check handling, and cancellation flow.
- **Round-Trip Tests**: Ensure extended FEN serialization/deserialization across
  complex sessions.
- **Concurrency & Recovery**: Verify cloning, rollback, and concurrent load
  behaviors.
- **Action Order Regression**: Validate recombine order preservation with
  history-sensitive sequences.
- **References**: `docs/deploy-action-based-architecture/02-MOVE-GENERATION.md`,
  `docs/deploy-action-based-architecture/COMPLETE-IMPLEMENTATION-GUIDE.md`.

---

## Consolidated Recommendations

- **Clarify Action Representation**: Unify `DeploySession.actions` contract and
  undo semantics.
- **Fill Missing Docs**: Author the five referenced documents or prune unused
  references.
- **Codify Game Rules**: Document commander attack, check, and partial commit
  behavior.
- **Formalize Extended FEN & SAN**: Provide grammar, parsing rules, and
  round-trip procedures.
- **Detail Validation Pipeline**: Specify timing, error handling, and rollback
  strategy.
- **Define Recombine Validation**: Include terrain, commander safety, and stack
  limits.
- **Address Performance**: Benchmark remaining-piece calculation and cloning
  costs.
- **Document Cancellation**: Provide workflow and UI expectations for aborting
  deploy.
- **Set History Policy**: Decide on transaction boundaries, counters, and undo
  rules.
- **Expand Testing Plan**: Enumerate required suites covering new edge cases.

---

## Next Steps

1. Prioritize high-risk gaps (action model, commander rules, FEN grammar) for
   immediate clarification.
2. Assign owners to missing documentation and integrate this analysis into
   `COMPLETE-IMPLEMENTATION-GUIDE.md` checklist.
3. Update `00-OVERVIEW.md` to reference this gap analysis and track resolution
   status.
4. Revisit implementation plan once gap resolutions are documented.                                                                                                                                                                                     
