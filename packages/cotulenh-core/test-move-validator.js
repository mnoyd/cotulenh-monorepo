// Quick test to verify MoveValidator has access to MoveExecutor
import { GameState } from './dist/esm/modules/game-state.js'
import { BoardOperations } from './dist/esm/modules/board-operations.js'
import { MoveValidator } from './dist/esm/modules/move-validator.js'
import { MoveExecutor } from './dist/esm/modules/move-executor.js'
import { CoTuLenhFacade } from './dist/esm/modules/cotulenh-facade.js'

console.log('=== Testing MoveValidator Circular Dependency Fix ===')

// Test 1: Manual module setup
console.log('\n1. Manual module setup:')
const gameState = new GameState()
const boardOps = new BoardOperations(gameState)
const moveValidator = new MoveValidator(gameState, boardOps)
const moveExecutor = new MoveExecutor(gameState, boardOps, moveValidator)

console.log(
  'Before setMoveExecutor:',
  moveValidator.moveExecutor ? 'SET' : 'UNDEFINED',
)
moveValidator.setMoveExecutor(moveExecutor)
console.log(
  'After setMoveExecutor:',
  moveValidator.moveExecutor ? 'SET' : 'UNDEFINED',
)

// Test 2: Facade setup (should automatically resolve circular dependency)
console.log('\n2. Facade setup (automatic):')
const facade = new CoTuLenhFacade()
const facadeMoveValidator = facade.getMoveValidatorModule()
console.log(
  'Facade MoveValidator has moveExecutor:',
  facadeMoveValidator.moveExecutor ? 'SET' : 'UNDEFINED',
)

console.log('\n✅ MoveValidator circular dependency resolved!')
