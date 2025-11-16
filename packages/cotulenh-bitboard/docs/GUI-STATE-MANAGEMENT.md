# GUI State Management: Where Should History Live?

## The Question

En Croissant uses chessops (immutable engine). Do we need history management inside the bitboard package, or should it live in the application layer?

## Typical Chess GUI Architecture

### Pattern 1: Engine Manages History (chess.js style)

```
┌─────────────────────────────────────┐
│           GUI Layer                 │
│  (React/Vue/Svelte)                 │
│                                     │
│  - Renders board                    │
│  - Handles user input               │
│  - Calls engine methods             │
└──────────────┬──────────────────────┘
               │
               │ game.move()
               │ game.undo()
               │
┌──────────────▼──────────────────────┐
│         Engine Layer                │
│  (chess.js, cotulenh-core)          │
│                                     │
│  - Manages history internally       │
│  - Provides undo/redo               │
│  - Single source of truth           │
└─────────────────────────────────────┘
```

**Pros:**

- Simple for GUI developers
- Engine is single source of truth
- Built-in undo/redo

**Cons:**

- Engine is more complex
- Less flexible for GUI
- Can't have multiple views of same game

### Pattern 2: GUI Manages History (chessops + En Croissant style)

```
┌─────────────────────────────────────┐
│           GUI Layer                 │
│  (React/Vue/Svelte)                 │
│                                     │
│  - Manages game state               │
│  - Keeps position history           │
│  - Handles undo/redo                │
│  - Renders board                    │
└──────────────┬──────────────────────┘
               │
               │ position.play(move)
               │ (returns new position)
               │
┌──────────────▼──────────────────────┐
│         Engine Layer                │
│  (chessops - immutable)             │
│                                     │
│  - Pure functions                   │
│  - No internal state                │
│  - Just validates & computes        │
└─────────────────────────────────────┘
```

**Pros:**

- Engine is simpler (stateless)
- GUI has full control
- Can have multiple views
- Easy to implement time travel

**Cons:**

- GUI must manage history
- More work for GUI developers
- Need to understand engine internals

## How En Croissant Uses chessops

### Typical Implementation (React/Svelte)

```typescript
// GUI manages state
function ChessGame() {
  // State: array of positions (history)
  const [positions, setPositions] = useState<Position[]>([
    Chess.default()  // Starting position
  ]);

  // Current position index (for undo/redo)
  const [currentIndex, setCurrentIndex] = useState(0);

  // Current position
  const currentPosition = positions[currentIndex];

  // Make move
  function makeMove(move: Move) {
    // chessops returns NEW position (immutable)
    const newPosition = currentPosition.play(move);

    // GUI adds to history
    setPositions([...positions.slice(0, currentIndex + 1), newPosition]);
    setCurrentIndex(currentIndex + 1);
  }

  // Undo
  function undo() {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }

  // Redo
  function redo() {
    if (currentIndex < positions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }

  // Get legal moves (engine computes, doesn't store)
  const legalMoves = currentPosition.legalMoves();

  return (
    <Board
      position={currentPosition}
      legalMoves={legalMoves}
      onMove={makeMove}
    />
  );
}
```

**Key insight:** GUI keeps `positions[]` array, engine is stateless!

## What About cotulenh-core?

### Current Pattern (Engine Manages History)

```typescript
// cotulenh-core has internal history
const game = new CoTuLenh();

game.move('e4');  // Internally: history.push(state)
game.move('e5');  // Internally: history.push(state)

game.undo();      // Internally: restore from history
game.redo();      // Internally: replay from history

// GUI just calls methods
function ChessGame() {
  const [game] = useState(new CoTuLenh());
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  function makeMove(from, to) {
    game.move(from, to);
    forceUpdate();  // Re-render
  }

  function undo() {
    game.undo();
    forceUpdate();
  }

  return <Board position={game.board()} />;
}
```

**Pattern:** Engine manages history, GUI just calls methods

## The Decision: Where Should History Live?

### Option A: Keep History in Engine (Current Plan)

```typescript
// bitboard package
class CoTuLenh {
  private history: HistoryEntry[] = [];

  move(from, to) {
    this.history.push(this.captureState());
    this.applyMove(from, to);
  }

  undo() {
    this.restoreState(this.history.pop());
  }
}

// GUI usage (simple)
const game = new CoTuLenh();
game.move(42, 43);
game.undo();
```

**Pros:**

- ✅ Matches cotulenh-core API (backward compatible)
- ✅ Simple for GUI developers
- ✅ Single source of truth
- ✅ Built-in undo/redo

**Cons:**

- ❌ Engine is more complex
- ❌ Less flexible for advanced GUIs
- ❌ Can't easily have multiple views

### Option B: Move History to GUI (Like chessops)

```typescript
// bitboard package (stateless)
class BitboardPosition {
  // No history!
  play(move: Move): BitboardPosition {
    const newPos = this.clone();
    newPos.applyMove(move);
    return newPos;
  }
}

// GUI manages history
function ChessGame() {
  const [positions, setPositions] = useState([new BitboardPosition()]);
  const [index, setIndex] = useState(0);

  function makeMove(move) {
    const newPos = positions[index].play(move);
    setPositions([...positions.slice(0, index + 1), newPos]);
    setIndex(index + 1);
  }

  function undo() {
    setIndex(index - 1);
  }
}
```

**Pros:**

- ✅ Engine is simpler (stateless)
- ✅ GUI has full control
- ✅ Can have multiple views
- ✅ Easy time travel debugging

**Cons:**

- ❌ Breaks cotulenh-core API
- ❌ More work for GUI developers
- ❌ Need to manage cloning

### Option C: Hybrid - Both Patterns

```typescript
// bitboard package - provide BOTH
class CoTuLenh {
  // Pattern 1: Mutable with history (for simple GUIs)
  private history: HistoryEntry[] = [];

  move(from, to) {
    this.history.push(this.captureState());
    this.applyMove(from, to);
  }

  undo() {
    this.restoreState(this.history.pop());
  }
}

class BitboardPosition {
  // Pattern 2: Immutable (for advanced GUIs)
  play(move: Move): BitboardPosition {
    const newPos = this.clone();
    newPos.applyMove(move);
    return newPos;
  }
}

// Export both
export { CoTuLenh, BitboardPosition };
```

**Pros:**

- ✅ Backward compatible (CoTuLenh)
- ✅ Flexible for advanced use (BitboardPosition)
- ✅ Users choose what they need

**Cons:**

- ❌ More code to maintain
- ❌ Two APIs to document
- ❌ Potential confusion

## Recommendation

### For cotulenh-bitboard: Option A (Keep History in Engine)

**Why:**

1. **API Compatibility**

   - cotulenh-core has `undo()` method
   - Users expect this API
   - Breaking change would be painful

2. **User Expectations**

   - Most users want simple API
   - Advanced users can use bridge layer
   - Matches chess.js pattern (popular)

3. **Implementation Reality**

   - We already planned history (Task 10)
   - Removing it doesn't save much complexity
   - Bridge layer already provides flexibility

4. **Use Case Analysis**
   - Most GUIs are simple (just need undo/redo)
   - Advanced GUIs can use bridge layer
   - Power users can access BitboardPosition directly

### Architecture

```
┌─────────────────────────────────────────────────┐
│              Simple GUI                         │
│  Uses: CoTuLenh class                          │
│  Pattern: Engine manages history               │
│  Code: game.move(), game.undo()               │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│              Advanced GUI                       │
│  Uses: Bridge layer                            │
│  Pattern: GUI manages state                    │
│  Code: bridge.makeMove(), positions[]          │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│              Power User                         │
│  Uses: BitboardPosition directly               │
│  Pattern: Custom state management              │
│  Code: position.play(), custom history         │
└─────────────────────────────────────────────────┘
```

## Implementation Strategy

### Phase 1: Core API (with history)

```typescript
// CoTuLenh class - matches cotulenh-core
class CoTuLenh {
  private position: BitboardPosition;
  private history: HistoryEntry[] = [];

  move(from, to) {
    this.history.push(this.captureState());
    this.position.makeMove(from, to);
  }

  undo() {
    const state = this.history.pop();
    if (state) this.restoreState(state);
  }
}
```

### Phase 2: Bridge Layer (for advanced GUIs)

```typescript
// Bridge provides stateless interface
class BitboardGameBridge {
  getPosition(): Map<number, UIPiece> { ... }
  makeMove(from, to): UIMove { ... }
  // No undo - GUI manages history
}
```

### Phase 3: Direct Access (for power users)

```typescript
// Export BitboardPosition for custom use
export { BitboardPosition };

// Power users can do:
const pos1 = new BitboardPosition();
const pos2 = pos1.clone();
pos2.makeMove(move);
// Manage their own history
```

## Comparison with En Croissant

### En Croissant (chessops)

```typescript
// GUI manages everything
const [positions, setPositions] = useState([Chess.default()]);
const [index, setIndex] = useState(0);

// Engine is stateless
const newPos = positions[index].play(move);
```

**Why this works for them:**

- chessops has no legacy API to maintain
- Built from scratch with immutability
- Target audience: advanced users

### cotulenh-bitboard (us)

```typescript
// Engine manages history (primary API)
const game = new CoTuLenh();
game.move(from, to);
game.undo();

// Bridge for advanced GUIs (optional)
const bridge = new BitboardGameBridge(position);
const move = bridge.makeMove(from, to);
```

**Why this works for us:**

- Must maintain cotulenh-core API
- Existing users expect undo()
- Can still provide flexibility via bridge

## Conclusion

### Answer: YES, keep history in bitboard package

**Reasons:**

1. **API Compatibility:** cotulenh-core has `undo()`, users expect it
2. **User Convenience:** Most users want simple API
3. **Flexibility:** Bridge layer provides stateless option
4. **Implementation:** Already planned, not much extra complexity

### But Also Provide Options

- **Simple users:** Use `CoTuLenh` class (with history)
- **Advanced users:** Use bridge layer (stateless)
- **Power users:** Use `BitboardPosition` directly (custom)

### Key Insight

**En Croissant can use stateless engine because:**

- chessops was designed immutable from start
- No legacy API to maintain
- Target audience: advanced users

**We should keep history because:**

- cotulenh-core has mutable API
- Existing users expect undo()
- Can still provide flexibility

**Best of both worlds:** Primary API with history + optional stateless bridge!

## Action Items

### Keep as Planned:

- ✅ Implement history in CoTuLenh class (Task 10)
- ✅ Provide undo/redo methods
- ✅ Match cotulenh-core API

### Also Provide:

- ✅ Bridge layer for stateless use
- ✅ Export BitboardPosition for custom use
- ✅ Document both patterns

### Don't Do:

- ❌ Remove history (breaks API)
- ❌ Force immutability (breaks compatibility)
- ❌ Make users manage history (too complex)
