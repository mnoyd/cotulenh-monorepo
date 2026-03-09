# API Contracts

## Overview

This document defines the interface contracts between packages in the CoTuLenh system. These contracts ensure proper separation of concerns and enable independent development of each package.

## Core Engine API Contract

### Public Interface: `CoTuLenh` Class

```typescript
interface CoTuLenhAPI {
  // Game State Queries
  fen(): string; // Current position as FEN string
  turn(): Color; // Current player ('r' | 'b')
  moves(options?: MoveOptions): Move[]; // Legal moves
  isCheck(): boolean; // Is current player in check?
  isCheckmate(): boolean; // Is current player checkmated?
  isStalemate(): boolean; // Is current player stalemated?
  isGameOver(): boolean; // Is game finished?

  // Move Execution
  move(moveRequest: MoveRequest): Move | null; // Make a move
  deployMove(deployRequest: DeployRequest): DeployMove | null; // Deploy move

  // State Management
  undo(): boolean; // Undo last move
  redo(): boolean; // Redo next move
  reset(): void; // Reset to initial position
  load(fen: string): void; // Load position from FEN

  // Deploy Session
  getDeployState(): DeployState | null; // Current deploy session

  // Piece Information
  get(square: Square): Piece | null; // Get piece at square
  put(piece: PieceRequest, square: Square): boolean; // Place piece
  remove(square: Square): Piece | null; // Remove piece

  // Air Defense
  getAirDefense(): AirDefenseData; // Air defense zones
  getAirDefenseInfluence(): AirDefenseInfluence; // Influence zones
}
```

### Move Request Formats

```typescript
interface MoveRequest {
  from: Square; // Source square (e.g., 'e2')
  to: Square; // Destination square (e.g., 'e4')
  piece?: PieceSymbol; // Piece type (for disambiguation)
  stay?: boolean; // Stay capture flag
  deploy?: boolean; // Deploy move flag
}

interface DeployRequest {
  from: Square; // Stack square
  moves: Array<{
    // Individual piece moves
    piece: Piece;
    to: Square;
  }>;
  stay?: Piece; // Pieces staying at original square
}

interface MoveOptions {
  verbose?: boolean; // Return Move objects vs SAN strings
  square?: Square; // Filter moves from specific square
  pieceType?: PieceSymbol; // Filter moves for specific piece type
}
```

### Return Types

```typescript
interface Move {
  readonly type: 'normal' | 'capture' | 'stay-capture' | 'suicide-capture' | 'combine';
  readonly from: Square;
  readonly to: Square;
  readonly piece: Piece;
  readonly color: Color;

  // Type-specific properties
  readonly captured?: Piece; // For capture moves
  readonly combined?: Piece; // For combination moves

  // Utility methods
  isCapture(): boolean;
  isStayCapture(): boolean;
  isSuicideCapture(): boolean;
  isCombination(): boolean;
}

interface DeployMove {
  readonly type: 'deploy-step' | 'deploy-complete';
  readonly from: Square;
  readonly to: Map<Square, Piece>; // Destination squares and pieces
  readonly color: Color;
  readonly remaining?: Piece[]; // Pieces still to deploy
}

interface DeployState {
  readonly stackSquare: Square; // Original stack position
  readonly turn: Color; // Player deploying
  readonly isComplete: boolean; // Is deploy session finished
}
```

## Board UI API Contract

### Board Configuration Interface

```typescript
interface BoardConfig {
  // Visual State
  fen?: string; // Board position
  orientation?: 'red' | 'blue'; // Board perspective
  turnColor?: 'red' | 'blue'; // Current player
  check?: 'red' | 'blue'; // King in check
  lastMove?: Key[]; // Highlight last move

  // Interaction
  movable?: {
    free?: boolean; // Allow any move (for setup)
    color?: 'red' | 'blue' | 'both'; // Who can move pieces
    dests?: Dests; // Legal move destinations
    events?: {
      after?: (orig: OrigMove, dest: DestMove, metadata: MoveMetadata) => void;
      afterStackMove?: (stackMove: StackMove, metadata: MoveMetadata) => void;
    };
  };

  // Visual Features
  selectable?: {
    enabled?: boolean; // Allow piece selection
  };

  draggable?: {
    enabled?: boolean; // Allow drag and drop
    showGhost?: boolean; // Show ghost piece while dragging
  };

  // Air Defense
  airDefense?: {
    influenceZone?: {
      red: Map<Key, Key[]>; // Red air defense coverage
      blue: Map<Key, Key[]>; // Blue air defense coverage
    };
    showInfluenceZone?: 'red' | 'blue'; // Which zones to show
  };
}
```

### Board Types

```typescript
// Board-specific types (different from core types)
type Key = string;                 // Square identifier (e.g., 'e4')
type Role = 'commander' | 'infantry' | 'tank' | /* ... */; // Piece roles
type Color = 'red' | 'blue';      // Player colors

interface OrigMove {
  square: Key;                     // Source square
  type?: Role;                     // Piece type (for stacks)
  stackMove?: boolean;             // Is this a stack move
}

interface DestMove {
  square: Key;                     // Destination square
  stay?: boolean;                  // Stay capture flag
}

interface StackMove {
  orig: Key;                       // Original stack square
  moves: Array<{                   // Individual piece moves
    piece: Piece;
    dest: Key;
  }>;
  stay?: Piece;                    // Pieces staying
}

type Dests = Map<OrigMoveKey, DestMove[]>; // Legal destinations per piece
```

### Board API Methods

```typescript
interface BoardAPI {
  // State Management
  set(config: Partial<BoardConfig>): void; // Update board configuration
  getFen(): string; // Get current FEN

  // Piece Management
  setPieces(pieces: Pieces): void; // Set all pieces

  // Interaction
  selectSquare(square: Key, force?: boolean): void; // Select square
  cancelMove(): void; // Cancel current move

  // Visual
  setOrientation(color: 'red' | 'blue'): void; // Flip board

  // Cleanup
  destroy(): void; // Clean up resources
}
```

## Application Layer Contracts

### Game Store Interface

```typescript
interface GameStore {
  // State
  subscribe(callback: (state: GameState) => void): () => void;

  // Actions
  initialize(game: CoTuLenh): void;
  applyMove(game: CoTuLenh, move: Move): void;
  applyDeployMove(game: CoTuLenh, move: DeployMove): void;
  reset(): void;
}

interface GameState {
  fen: string; // Current board position
  turn: Color | null; // Current player
  history: (Move | DeployMove)[]; // Move history
  possibleMoves: Move[]; // Legal moves
  lastMove?: Square[]; // Last move squares
  status: GameStatus; // Game status
  check: boolean; // Is current player in check
  deployState: DeployState | null; // Deploy session state
}

type GameStatus = 'playing' | 'checkmate' | 'stalemate' | 'draw';
```

### Type Conversion Interface

```typescript
interface TypeConverter {
  // Core ↔ Board conversions
  coreToBoardColor(color: Color): 'red' | 'blue';
  boardToCoreColor(color: 'red' | 'blue'): Color;

  coreToBoardPiece(piece: CorePiece): BoardPiece;
  boardToCorePiece(piece: BoardPiece): CorePiece;

  getRoleFromCoreType(type: PieceSymbol): Role;
  getCoreTypeFromRole(role: Role): PieceSymbol;

  // Move conversions
  mapPossibleMovesToDests(moves: Move[]): Dests;
  convertBoardMoveToCore(orig: OrigMove, dest: DestMove): MoveRequest;
}
```

## Contract Validation

### Core Engine Contracts

```typescript
// Test that core engine fulfills its contract
describe('Core Engine API Contract', () => {
  let game: CoTuLenh;

  beforeEach(() => {
    game = new CoTuLenh();
  });

  test('provides required state query methods', () => {
    expect(typeof game.fen).toBe('function');
    expect(typeof game.turn).toBe('function');
    expect(typeof game.moves).toBe('function');
    expect(typeof game.isCheck).toBe('function');
    // ... test all required methods exist
  });

  test('move method returns correct types', () => {
    const move = game.move({ from: 'a2', to: 'a3' });

    if (move) {
      expect(move).toHaveProperty('type');
      expect(move).toHaveProperty('from');
      expect(move).toHaveProperty('to');
      expect(move).toHaveProperty('piece');
      expect(move).toHaveProperty('color');
    }
  });

  test('FEN string format is valid', () => {
    const fen = game.fen();
    const parts = fen.split(' ');

    expect(parts.length).toBeGreaterThanOrEqual(5);
    expect(['r', 'b']).toContain(parts[1]); // Turn
    expect(parts[3]).toMatch(/^\d+$/); // Move number
    expect(parts[4]).toMatch(/^\d+$/); // Half moves
  });
});
```

### Board UI Contracts

```typescript
describe('Board UI API Contract', () => {
  let boardApi: BoardAPI;
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    boardApi = CotulenhBoard(container, {});
  });

  afterEach(() => {
    boardApi.destroy();
  });

  test('provides required API methods', () => {
    expect(typeof boardApi.set).toBe('function');
    expect(typeof boardApi.getFen).toBe('function');
    expect(typeof boardApi.selectSquare).toBe('function');
    expect(typeof boardApi.destroy).toBe('function');
  });

  test('accepts valid configuration', () => {
    expect(() => {
      boardApi.set({
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR r e1,e12 1 0',
        turnColor: 'red',
        movable: {
          color: 'red',
          dests: new Map()
        }
      });
    }).not.toThrow();
  });
});
```

### Integration Contracts

```typescript
describe('Package Integration Contracts', () => {
  test('board events trigger app layer correctly', () => {
    const mockHandler = jest.fn();

    const boardApi = CotulenhBoard(container, {
      movable: {
        events: { after: mockHandler }
      }
    });

    // Simulate user move
    boardApi.selectSquare('e2');
    boardApi.selectSquare('e4');

    expect(mockHandler).toHaveBeenCalledWith(
      expect.objectContaining({ square: 'e2' }),
      expect.objectContaining({ square: 'e4' })
    );
  });

  test('core state updates propagate to board', () => {
    const game = new CoTuLenh();
    const gameStore = createGameStore();

    gameStore.initialize(game);

    const move = game.move({ from: 'a2', to: 'a3' });
    gameStore.applyMove(game, move!);

    // Verify store state matches core state
    const storeState = get(gameStore);
    expect(storeState.fen).toBe(game.fen());
    expect(storeState.turn).toBe(game.turn());
  });
});
```

## Breaking Change Management

### Versioning Strategy

```typescript
// Core engine version compatibility
interface CoreEngineVersion {
  major: number; // Breaking API changes
  minor: number; // New features, backward compatible
  patch: number; // Bug fixes
}

// Board UI version compatibility
interface BoardUIVersion {
  major: number; // Breaking config changes
  minor: number; // New features, backward compatible
  patch: number; // Bug fixes
}
```

### Deprecation Process

```typescript
// Example: Deprecating a method
class CoTuLenh {
  /**
   * @deprecated Use moves() instead. Will be removed in v2.0.0
   */
  getLegalMoves(): Move[] {
    console.warn('getLegalMoves() is deprecated. Use moves() instead.');
    return this.moves();
  }

  moves(options?: MoveOptions): Move[] {
    // New implementation
  }
}
```

### Migration Guides

When breaking changes are necessary, provide migration guides:

```typescript
// v1.x → v2.x Migration
// OLD:
const moves = game.getLegalMoves();

// NEW:
const moves = game.moves();

// OLD:
boardApi.setPosition(fen);

// NEW:
boardApi.set({ fen });
```

## Contract Testing Tools

### Automated Contract Validation

```typescript
// Contract test runner
function validateContracts() {
  const results = {
    coreEngine: validateCoreEngineContract(),
    boardUI: validateBoardUIContract(),
    integration: validateIntegrationContract()
  };

  return results;
}

// Run contract tests in CI/CD
if (process.env.NODE_ENV === 'test') {
  const contractResults = validateContracts();

  if (!contractResults.coreEngine.valid) {
    throw new Error('Core engine contract violation');
  }

  if (!contractResults.boardUI.valid) {
    throw new Error('Board UI contract violation');
  }
}
```

### Runtime Contract Checking

```typescript
// Development-time contract validation
function createContractValidator<T>(contract: T): T {
  return new Proxy(contract, {
    get(target, prop) {
      const value = target[prop];

      if (typeof value === 'function') {
        return function (...args: any[]) {
          // Validate input parameters
          validateInputs(prop, args);

          const result = value.apply(target, args);

          // Validate return value
          validateOutput(prop, result);

          return result;
        };
      }

      return value;
    }
  });
}

// Use in development
const game = createContractValidator(new CoTuLenh());
```

## Documentation Standards

### API Documentation Format

````typescript
/**
 * Makes a move on the board
 *
 * @param moveRequest - The move to make
 * @param moveRequest.from - Source square (e.g., 'e2')
 * @param moveRequest.to - Destination square (e.g., 'e4')
 * @param moveRequest.piece - Optional piece type for disambiguation
 * @param moveRequest.stay - Optional stay capture flag
 *
 * @returns The executed move object, or null if the move is illegal
 *
 * @throws {Error} If the move format is invalid
 *
 * @example
 * ```typescript
 * const move = game.move({ from: 'e2', to: 'e4' });
 * if (move) {
 *   console.log('Move successful:', move);
 * } else {
 *   console.log('Illegal move');
 * }
 * ```
 */
move(moveRequest: MoveRequest): Move | null;
````

This contract system ensures that:

1. Each package has clear responsibilities
2. Interfaces are well-defined and stable
3. Breaking changes are managed properly
4. Integration points are tested
5. Documentation stays current
