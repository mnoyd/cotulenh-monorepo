# Implementation Plan

- [x] 1. Add DeploySessionResult interface and helper methods

  - Add `DeploySessionResult` interface to `deploy-session.ts` with
    `isComplete`, `deployMove`, and `session` fields
  - Add `DeploySession.processMove()` static method that handles incremental
    deploy moves
  - Add private `shouldAutoCommit()` method to check if all pieces are deployed
  - Add private `createInternalDeployMove()` method to build the batch move from
    session state
  - _Requirements: 1.1, 1.3, 1.4, 1.5, 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 2. Implement DeploySession.processMove() logic

  - [x] 2.1 Implement session initialization when no active session exists

    - Check if `game._deploySession` is null
    - Create new `DeploySession` with stack square, turn, original piece, and
      start FEN
    - Store session in `game._deploySession`
    - _Requirements: 1.2, 5.1_

  - [x] 2.2 Implement command execution and session state update

    - Execute the move command
    - Add command to session using `session.addCommand()`
    - Do NOT add to game history
    - Do NOT switch turn
    - Do NOT increment move count
    - _Requirements: 1.2, 4.2_

  - [x] 2.3 Implement auto-commit detection and InternalDeployMove creation

    - Call `shouldAutoCommit()` to check if all pieces deployed
    - If complete, apply recombine instructions using `applyRecombines()`
    - Extract moves from session using `getActions()`
    - Get remaining pieces using `getRemainingPieces()`
    - Create `InternalDeployMove` with from, moves, and stay fields
    - Clear `game._deploySession` and `game._deployState`
    - Return `DeploySessionResult` with `isComplete: true` and the
      `InternalDeployMove`
    - _Requirements: 1.4, 1.5, 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 2.4 Implement incomplete session handling

    - If not complete, return `DeploySessionResult` with `isComplete: false` and
      the active session
    - _Requirements: 3.4_

  - [x] 2.5 Implement error handling for auto-commit failures
    - Wrap auto-commit logic in try-catch
    - On error, log to console, clear session state, force turn switch
    - Return incomplete result to allow recovery
    - _Requirements: 5.5_

- [x] 3. Update CoTuLenh.move() to delegate deploy moves

  - [x] 3.1 Add DEPLOY flag detection after move validation

    - Check if `internalMove.flags & BITS.DEPLOY`
    - _Requirements: 4.1_

  - [x] 3.2 Delegate to DeploySession.processMove() for deploy moves

    - Call `DeploySession.processMove(this, internalMove, moveCommand)`
    - Store the returned `DeploySessionResult`
    - _Requirements: 4.2_

  - [x] 3.3 Handle complete deployment result

    - Check if `result.isComplete && result.deployMove`
    - If true, call `this._makeMove(result.deployMove)`
    - Return `new Move(this, result.deployMove)`
    - _Requirements: 4.4_

  - [x] 3.4 Handle incomplete deployment result
    - If `result.isComplete` is false, return `new Move(this, internalMove)`
    - Do NOT call `_makeMove()`
    - _Requirements: 4.3_

- [x] 4. Simplify CoTuLenh.\_makeMove() to remove deploy flag handling

  - [x] 4.1 Remove DeploySession.handleDeployMove() call

    - Remove the conditional check for `isIncrementalDeploy`
    - Remove the call to `DeploySession.handleDeployMove()`
    - Remove the `_handleNormalMove()` wrapper
    - _Requirements: 2.5_

  - [x] 4.2 Consolidate move processing logic
    - Create command using `isInternalDeployMove()` check
    - Execute command
    - Add to history
    - Switch turn
    - Increment move count if turn was BLUE
    - Clear moves cache
    - Update position counts
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [-] 5. Update and consolidate tests

  - [x] 5.1 Add tests for DeploySession.processMove()

    - Test session initialization on first deploy move
    - Test command execution without history addition
    - Test incomplete session returns
    - Test auto-commit detection
    - Test InternalDeployMove creation
    - Test recombine instruction application during commit
    - _Requirements: 7.1_

  - [x] 5.2 Add tests for auto-commit behavior

    - Test that deploying all pieces triggers auto-commit
    - Test that InternalDeployMove is created correctly
    - Test that session is cleared after auto-commit
    - Test that turn switches after auto-commit
    - _Requirements: 7.2_

  - [x] 5.3 Update existing deploy session tests

    - Update tests that call `DeploySession.handleDeployMove()` to use
      `processMove()`
    - Update tests that check internal session state
    - Verify backward compatibility with existing behavior
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 5.4 Add integration tests for full deploy sequences

    - Test incremental deployment without history entries
    - Test single history entry after completion
    - Test turn switching only after completion
    - Test deploy with recombine instructions
    - Test deploy undo during session
    - _Requirements: 7.3, 7.4_

  - [x] 5.5 Remove redundant tests
    - Identify tests that duplicate coverage
    - Remove or consolidate redundant test cases
    - _Requirements: 7.5_

- [ ] 6. Update documentation and comments
  - Update JSDoc comments for `DeploySession.processMove()`
  - Update JSDoc comments for `CoTuLenh.move()`
  - Update JSDoc comments for `CoTuLenh._makeMove()`
  - Add code comments explaining the deploy delegation flow
  - Update inline comments for auto-commit logic
  - _Requirements: 6.1_
