# Command Pattern: Complete Examples

## Example 1: Normal Capture with Heroic Promotion

```typescript
// Setup
const state = GameState.fromFEN('...')

// Tank captures Infantry near enemy commander
const move: CaptureMove = {
  type: 'capture',
  from: 'e5',
  to: 'e6',
  piece: { type: TANK, color: 'r' },
  capturedPiece: { type: INFANTRY, color: 'b' },
}

// Execute
state.makeMove(move)

// Internal execution:
// 1. Factory creates CaptureMoveCommand
// 2. Command.buildActions():
//    actions = [
//      RemovePieceAction('e5'),           // Remove tank from e5
//      RemovePieceAction('e6'),           // Remove captured infantry
//      PlacePieceAction('e6', tank),      // Place tank at e6
//      PromotePieceAction('e6'),          // Tank → Heroic!
//      SwitchTurnAction()                 // Red → Blue
//    ]
// 3. Execute each action in order
// 4. Command saved to history

// Result:
// - Tank now at e6 (heroic)
// - Infantry captured
// - Blue's turn

// Undo
state.undoMove()

// Internal undo:
// 1. Pop command from history
// 2. command.undo():
//    for i = 4 down to 0:
//      actions[4].undo()  // Turn: Blue → Red
//      actions[3].undo()  // Tank no longer heroic
//      actions[2].undo()  // Remove tank from e6
//      actions[1].undo()  // Restore infantry at e6
//      actions[0].undo()  // Restore tank at e5

// Result: Perfect rollback!
// - Tank back at e5 (not heroic)
// - Infantry back at e6
// - Red's turn
```

---

## Example 2: Complete Deploy Session

```typescript
// Initial: e5: Navy + [Air Force, Tank]

// Step 1: Start deploy
state.makeMove({
  type: 'deploy-start',
  square: 'e5',
})

// Actions: [
//   UpdateDeploySessionAction({
//     originalSquare: 'e5',
//     originalStack: [Navy, AirForce, Tank],
//     remaining: [Navy, AirForce, Tank],
//     deployed: []
//   })
// ]
// Turn: Still Red

console.log(state.deploySession.active) // true
console.log(state.turn) // 'r'

//━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Step 2: Navy moves to e7
state.makeMove({
  type: 'deploy-step',
  piece: { type: NAVY, color: 'r' },
  from: 'e5',
  to: 'e7',
})

// Actions: [
//   UpdateStackAction('e5', [AirForce, Tank]),  // Stack shrinks
//   PlacePieceAction('e7', navy),               // Navy deployed
//   UpdateDeploySessionAction({
//     remaining: [AirForce, Tank],
//     deployed: [{ piece: Navy, destination: 'e7' }]
//   })
// ]
// Turn: Still Red (deploy not complete)

console.log(state.board.get('e5')) // Stack: AirForce + [Tank]
console.log(state.board.get('e7')) // Navy
console.log(state.turn) // 'r'

//━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Step 3: Tank recombines with Navy at e7
state.makeMove({
  type: 'deploy-recombine',
  piece: { type: TANK, color: 'r' },
  from: 'e5',
  to: 'e7',
})

// Actions: [
//   UpdateStackAction('e5', [AirForce]),     // Only AF left
//   RemovePieceAction('e7'),                 // Remove Navy
//   PlacePieceAction('e7', Navy+[Tank]),     // Place combined stack
//   UpdateDeploySessionAction({
//     remaining: [AirForce],
//     deployed: [{ piece: Navy+[Tank], destination: 'e7' }]
//   })
// ]
// Turn: Still Red

console.log(state.board.get('e5')) // Air Force (alone)
console.log(state.board.get('e7')) // Navy + [Tank]
console.log(state.turn) // 'r'

//━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Step 4: Air Force moves to d7 (COMPLETE!)
state.makeMove({
  type: 'deploy-step',
  piece: { type: AIR_FORCE, color: 'r' },
  from: 'e5',
  to: 'd7',
})

// Actions: [
//   UpdateStackAction('e5', []),              // Stack empty
//   PlacePieceAction('d7', airForce),        // AF deployed
//   UpdateDeploySessionAction(null),          // ✅ Clear session
//   SwitchTurnAction()                        // ✅ Turn switches!
// ]

console.log(state.board.get('e5')) // null (empty)
console.log(state.board.get('d7')) // Air Force
console.log(state.board.get('e7')) // Navy + [Tank]
console.log(state.deploySession) // null
console.log(state.turn) // 'b' ✅

//━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Undo entire sequence
state.undoMove() // Undo Step 4 (AF deploy complete)
// - Remove AF from d7
// - Restore AF to e5
// - Restore deploy session
// - Switch turn back to red

console.log(state.board.get('e5')) // Air Force
console.log(state.board.get('d7')) // null
console.log(state.deploySession.remaining) // [AirForce]
console.log(state.turn) // 'r'

state.undoMove() // Undo Step 3 (Tank recombine)
// - Remove Navy+Tank from e7
// - Place Navy at e7
// - Add Tank to e5 stack
// - Restore deploy session

console.log(state.board.get('e5')) // Air Force + [Tank]
console.log(state.board.get('e7')) // Navy (alone)

state.undoMove() // Undo Step 2 (Navy deploy)
// - Remove Navy from e7
// - Add Navy to e5 stack
// - Restore deploy session

console.log(state.board.get('e5')) // Navy + [Air Force, Tank]
console.log(state.board.get('e7')) // null

state.undoMove() // Undo Step 1 (Deploy start)
// - Clear deploy session

console.log(state.deploySession) // null
console.log(state.board.get('e5')) // Navy + [Air Force, Tank]

// Perfect rollback to initial state!
```

---

## Example 3: Multiple Heroic Promotions

```typescript
// Setup: Artillery about to capture piece that blocks commander
// This will expose commander to 3 different pieces

Initial position:
  d7: Tank (Red)
  e6: Artillery (Red) ← about to capture
  e7: Infantry (Blue) ← blocking blue commander
  f7: Militia (Red)
  e4: Infantry (Red)
  e8: Commander (Blue) ← will be exposed!

// Execute capture
state.makeMove({
  type: 'capture',
  from: 'e6',
  to: 'e7',
  piece: artillery,
  capturedPiece: infantry
})

// Factory detects: "This might cause multiple promotions"
// Creates: MultiplePromotionsCommand

// Internal execution:
// 1. Build base capture actions:
//    - RemovePieceAction('e6')
//    - RemovePieceAction('e7')  // Captured
//    - PlacePieceAction('e7', artillery)
//    - PromotePieceAction('e7')  // Artillery promoted

// 2. Simulate move in temp state
//    - Execute all actions in temp state

// 3. Find all pieces attacking blue commander at e8:
//    - Artillery at e7 (orthogonal, range 3)
//    - Tank at d7 (diagonal not valid... wait)
//    Actually let me fix this:

// Better example:
Initial position:
  e5: Artillery (Red)
  e6: Infantry (Blue) ← blocking
  e7: Navy (Red)
  d7: Tank (Red)
  e8: Commander (Blue)

// Artillery captures Infantry at e6
state.makeMove({
  type: 'capture',
  from: 'e5',
  to: 'e6',
  piece: artillery
})

// After capture, commander at e8 is attacked by:
// - Artillery at e6 (orthogonal, 2 squares)
// - Navy at e7 (orthogonal, 1 square)

// Actions built:
// [
//   RemovePieceAction('e5'),
//   RemovePieceAction('e6'),
//   PlacePieceAction('e6', artillery),
//   PromotePieceAction('e6'),      // Artillery → Heroic
//   PromotePieceAction('e7'),      // Navy → Heroic
//   SwitchTurnAction()
// ]

// Result: 2 pieces promoted in one move!

console.log(state.board.get('e6').heroic)  // true
console.log(state.board.get('e7').heroic)  // true

// Undo
state.undoMove()

// Actions undone in reverse:
// - Turn switches back
// - Navy loses heroic status
// - Artillery loses heroic status
// - Artillery removed from e6
// - Infantry restored at e6
// - Artillery restored at e5

console.log(state.board.get('e6').heroic)  // undefined (Infantry)
console.log(state.board.get('e7').heroic)  // false
console.log(state.board.get('e5'))         // Artillery
```

---

## Example 4: Deploy with Capture and Promotion

```typescript
// Complex scenario: Deploy with capture that promotes

Initial:
  e5: Navy + [Air Force, Tank]
  e7: Infantry (Blue) near blue commander at e8

// Start deploy
state.makeMove({ type: 'deploy-start', square: 'e5' })

// Navy captures Infantry at e7 (attacks commander!)
state.makeMove({
  type: 'deploy-step',
  piece: navy,
  from: 'e5',
  to: 'e7',
  capturedPiece: infantry
})

// Actions: [
//   UpdateStackAction('e5', [AirForce, Tank]),
//   RemovePieceAction('e7'),          // Captured
//   PlacePieceAction('e7', navy),
//   PromotePieceAction('e7'),         // ✅ Navy → Heroic!
//   UpdateDeploySessionAction({
//     remaining: [AirForce, Tank],
//     deployed: [{ piece: Navy(heroic), destination: 'e7' }]
//   })
// ]

console.log(state.board.get('e7').heroic)  // true
console.log(state.turn)                    // 'r' (still red)

// Air Force recombines with Heroic Navy
state.makeMove({
  type: 'deploy-recombine',
  piece: airForce,
  from: 'e5',
  to: 'e7'
})

// Actions: [
//   UpdateStackAction('e5', [Tank]),
//   RemovePieceAction('e7'),                    // Heroic Navy
//   PlacePieceAction('e7', Navy(heroic)+[AF]), // Stack keeps heroic!
//   UpdateDeploySessionAction(...)
// ]

console.log(state.board.get('e7'))  // Navy(heroic) + [Air Force]

// Tank completes deploy
state.makeMove({
  type: 'deploy-step',
  piece: tank,
  from: 'e5',
  to: 'd5'
})

// Deploy complete, turn switches

console.log(state.turn)  // 'b'

// Undo entire sequence
state.undoMove()  // Tank deploy
state.undoMove()  // AF recombine
state.undoMove()  // Navy capture (loses heroic!)
state.undoMove()  // Deploy start

// Back to initial state:
console.log(state.board.get('e5'))   // Navy + [Air Force, Tank]
console.log(state.board.get('e7'))   // Infantry (Blue)
console.log(state.board.get('e5').heroic)  // false
```

---

## Example 5: Stay-Capture from Stack

```typescript
// Deploy with stay-capture

Initial:
  e5: Artillery + [Tank, Infantry]
  e8: Infantry (Blue) near blue commander

// Start deploy
state.makeMove({ type: 'deploy-start', square: 'e5' })

// Artillery does stay-capture (stays on stack, shoots enemy)
state.makeMove({
  type: 'deploy-stay-capture',
  attacker: 'e5',
  target: 'e8',
  piece: artillery,
  capturedPiece: enemyInfantry
})

// Actions: [
//   RemovePieceAction('e8'),          // Captured
//   PromotePieceAction('e5'),         // ✅ Artillery → Heroic (on stack!)
//   UpdateDeploySessionAction({
//     staying: [Artillery(heroic)],
//     remaining: [Tank, Infantry]     // Still need to move these
//   })
// ]

// Stack now: Artillery(heroic) + [Tank, Infantry]
console.log(state.board.get('e5').heroic)  // true
console.log(state.board.get('e8'))         // null
console.log(state.turn)                    // 'r' (still deploying)

// Tank moves
state.makeMove({
  type: 'deploy-step',
  piece: tank,
  from: 'e5',
  to: 'd5'
})

// Stack now: Artillery(heroic) + [Infantry]

// Infantry moves (complete!)
state.makeMove({
  type: 'deploy-step',
  piece: infantry,
  from: 'e5',
  to: 'e6'
})

// Actions include:
//   UpdateStackAction('e5', [Artillery(heroic)])  // Artillery stays!
//   PlacePieceAction('e6', infantry),
//   UpdateDeploySessionAction(null),               // Complete
//   SwitchTurnAction()

console.log(state.board.get('e5'))   // Artillery (heroic, alone)
console.log(state.board.get('d5'))   // Tank
console.log(state.board.get('e6'))   // Infantry
console.log(state.turn)              // 'b'
```

---

## Benefits Summary

### 1. **Composability**

Each action is independent. Build complex moves from simple actions.

### 2. **Perfect Undo**

```typescript
undo() {
  for (let i = actions.length - 1; i >= 0; i--) {
    actions[i].undo(state)
  }
}
```

Guaranteed perfect rollback!

### 3. **Debugging**

```typescript
console.log(command.describe())
// "Remove e5 → Remove e7 → Place e7 → Promote e7 → Switch turn"
```

### 4. **Testability**

Test each action independently:

```typescript
test('RemovePieceAction', () => {
  const state = ...
  const action = new RemovePieceAction('e5')

  action.execute(state)
  expect(state.board.get('e5')).toBeNull()

  action.undo(state)
  expect(state.board.get('e5')).toEqual(originalPiece)
})
```

### 5. **Extensibility**

New move type? Just create new command:

```typescript
class CustomMoveCommand extends MoveCommand {
  buildActions(state, move) {
    // Use existing actions or create new ones
  }
}
```

---

## Implementation Checklist

### Week 1: Atomic Actions

- [ ] Implement all 8 atomic actions
- [ ] Test each action (execute + undo)
- [ ] Ensure perfect rollback

### Week 2: Base Commands

- [ ] Abstract MoveCommand class
- [ ] NormalMoveCommand
- [ ] CaptureMoveCommand
- [ ] Test with simple scenarios

### Week 3: Deploy Commands

- [ ] DeployStartCommand
- [ ] DeployStepCommand
- [ ] DeployRecombineCommand
- [ ] Test deploy sequences

### Week 4: Advanced

- [ ] MultiplePromotionsCommand
- [ ] MoveCommandFactory
- [ ] Integration with GameState
- [ ] 100+ tests

This architecture makes CoTuLenh's complexity manageable! 🎯
