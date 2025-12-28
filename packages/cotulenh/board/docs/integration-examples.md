# Integration Examples

Real-world examples of integrating Cotulenh Board into different frameworks and applications.

## React Integration

### Basic React Component

```typescript
import React, { useEffect, useRef, useState } from 'react';
import { CotulenhBoard } from '@repo/cotulenh-board';
import type { Api, Config, OrigMove, DestMove, Piece } from '@repo/cotulenh-board';

interface ChessBoardProps {
  position?: string;
  orientation?: 'red' | 'blue';
  onMove?: (orig: OrigMove, dest: DestMove, captured?: Piece) => void;
  onPositionChange?: (fen: string) => void;
  validMoves?: Map<string, any>;
  disabled?: boolean;
}

const ChessBoard: React.FC<ChessBoardProps> = ({
  position,
  orientation = 'red',
  onMove,
  onPositionChange,
  validMoves,
  disabled = false
}) => {
  const boardRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<Api>();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (boardRef.current && !apiRef.current) {
      const config: Config = {
        orientation,
        fen: position,
        movable: {
          color: disabled ? undefined : orientation,
          dests: validMoves,
          events: {
            after: (orig, dest, metadata) => {
              onMove?.(orig, dest, metadata.captured?.[0]);
            }
          }
        },
        events: {
          change: () => {
            if (apiRef.current) {
              onPositionChange?.(apiRef.current.getFen());
            }
          }
        }
      };

      apiRef.current = CotulenhBoard(boardRef.current, config);
      setIsReady(true);
    }

    return () => {
      apiRef.current?.destroy();
      apiRef.current = undefined;
      setIsReady(false);
    };
  }, []);

  // Update position
  useEffect(() => {
    if (apiRef.current && position) {
      apiRef.current.set({ fen: position });
    }
  }, [position]);

  // Update orientation
  useEffect(() => {
    if (apiRef.current && isReady) {
      apiRef.current.set({ orientation });
    }
  }, [orientation, isReady]);

  // Update valid moves
  useEffect(() => {
    if (apiRef.current && isReady) {
      apiRef.current.set({
        movable: {
          dests: validMoves,
          color: disabled ? undefined : orientation
        }
      });
    }
  }, [validMoves, disabled, orientation, isReady]);

  return (
    <div
      ref={boardRef}
      className="chess-board"
      style={{ width: '100%', height: '100%' }}
    />
  );
};

export default ChessBoard;
```

### React Game Component

```typescript
import React, { useState, useCallback } from 'react';
import ChessBoard from './ChessBoard';
import type { OrigMove, DestMove, Piece } from '@repo/cotulenh-board';

interface GameState {
  position: string;
  turn: 'red' | 'blue';
  history: string[];
  validMoves: Map<string, any>;
}

const ChessGame: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    position: 'starting-fen-here',
    turn: 'red',
    history: [],
    validMoves: new Map()
  });

  const handleMove = useCallback((orig: OrigMove, dest: DestMove, captured?: Piece) => {
    // Validate move with game engine
    const isValid = validateMove(orig, dest, gameState.position);

    if (isValid) {
      // Update game state
      const newPosition = makeMove(gameState.position, orig, dest);
      const newValidMoves = calculateValidMoves(newPosition);

      setGameState(prev => ({
        ...prev,
        position: newPosition,
        turn: prev.turn === 'red' ? 'blue' : 'red',
        history: [...prev.history, prev.position],
        validMoves: newValidMoves
      }));
    }
  }, [gameState.position]);

  const handleUndo = useCallback(() => {
    if (gameState.history.length > 0) {
      const previousPosition = gameState.history[gameState.history.length - 1];
      setGameState(prev => ({
        ...prev,
        position: previousPosition,
        turn: prev.turn === 'red' ? 'blue' : 'red',
        history: prev.history.slice(0, -1),
        validMoves: calculateValidMoves(previousPosition)
      }));
    }
  }, [gameState.history]);

  return (
    <div className="game-container">
      <div className="board-section">
        <ChessBoard
          position={gameState.position}
          orientation="red"
          onMove={handleMove}
          validMoves={gameState.validMoves}
        />
      </div>

      <div className="game-controls">
        <button onClick={handleUndo} disabled={gameState.history.length === 0}>
          Undo
        </button>
        <div className="turn-indicator">
          Turn: {gameState.turn}
        </div>
      </div>
    </div>
  );
};

// Helper functions (implement based on your game engine)
function validateMove(orig: OrigMove, dest: DestMove, position: string): boolean {
  // Your move validation logic
  return true;
}

function makeMove(position: string, orig: OrigMove, dest: DestMove): string {
  // Your move execution logic
  return position;
}

function calculateValidMoves(position: string): Map<string, any> {
  // Your valid moves calculation
  return new Map();
}

export default ChessGame;
```

## Vue.js Integration

### Vue 3 Composition API

```vue
<template>
  <div ref="boardElement" class="chess-board"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { CotulenhBoard } from '@repo/cotulenh-board';
import type { Api, Config, OrigMove, DestMove } from '@repo/cotulenh-board';

interface Props {
  position?: string;
  orientation?: 'red' | 'blue';
  validMoves?: Map<string, any>;
}

interface Emits {
  (e: 'move', orig: OrigMove, dest: DestMove): void;
  (e: 'positionChange', fen: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  orientation: 'red',
});

const emit = defineEmits<Emits>();

const boardElement = ref<HTMLElement>();
let boardApi: Api | null = null;

onMounted(() => {
  if (boardElement.value) {
    const config: Config = {
      orientation: props.orientation,
      fen: props.position,
      movable: {
        color: props.orientation,
        dests: props.validMoves,
        events: {
          after: (orig, dest) => {
            emit('move', orig, dest);
          },
        },
      },
      events: {
        change: () => {
          if (boardApi) {
            emit('positionChange', boardApi.getFen());
          }
        },
      },
    };

    boardApi = CotulenhBoard(boardElement.value, config);
  }
});

onUnmounted(() => {
  boardApi?.destroy();
});

// Watch for prop changes
watch(
  () => props.position,
  newPosition => {
    if (boardApi && newPosition) {
      boardApi.set({ fen: newPosition });
    }
  },
);

watch(
  () => props.orientation,
  newOrientation => {
    if (boardApi) {
      boardApi.set({ orientation: newOrientation });
    }
  },
);

watch(
  () => props.validMoves,
  newValidMoves => {
    if (boardApi) {
      boardApi.set({ movable: { dests: newValidMoves } });
    }
  },
);
</script>

<style scoped>
.chess-board {
  width: 100%;
  height: 100%;
}
</style>
```

## Angular Integration

### Angular Component

```typescript
import {
  Component,
  ElementRef,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CotulenhBoard } from '@repo/cotulenh-board';
import type { Api, Config, OrigMove, DestMove } from '@repo/cotulenh-board';

@Component({
  selector: 'app-chess-board',
  template: ` <div #boardElement class="chess-board"></div> `,
  styleUrls: ['./chess-board.component.css'],
})
export class ChessBoardComponent implements OnInit, OnDestroy, OnChanges {
  @ViewChild('boardElement', { static: true }) boardElement!: ElementRef<HTMLElement>;

  @Input() position?: string;
  @Input() orientation: 'red' | 'blue' = 'red';
  @Input() validMoves?: Map<string, any>;
  @Input() disabled = false;

  @Output() move = new EventEmitter<{ orig: OrigMove; dest: DestMove }>();
  @Output() positionChange = new EventEmitter<string>();

  private boardApi?: Api;

  ngOnInit(): void {
    this.initializeBoard();
  }

  ngOnDestroy(): void {
    this.boardApi?.destroy();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.boardApi) return;

    if (changes['position'] && changes['position'].currentValue) {
      this.boardApi.set({ fen: changes['position'].currentValue });
    }

    if (changes['orientation']) {
      this.boardApi.set({ orientation: changes['orientation'].currentValue });
    }

    if (changes['validMoves'] || changes['disabled']) {
      this.boardApi.set({
        movable: {
          dests: this.validMoves,
          color: this.disabled ? undefined : this.orientation,
        },
      });
    }
  }

  private initializeBoard(): void {
    const config: Config = {
      orientation: this.orientation,
      fen: this.position,
      movable: {
        color: this.disabled ? undefined : this.orientation,
        dests: this.validMoves,
        events: {
          after: (orig, dest) => {
            this.move.emit({ orig, dest });
          },
        },
      },
      events: {
        change: () => {
          if (this.boardApi) {
            this.positionChange.emit(this.boardApi.getFen());
          }
        },
      },
    };

    this.boardApi = CotulenhBoard(this.boardElement.nativeElement, config);
  }

  // Public methods
  public setPosition(fen: string): void {
    this.boardApi?.set({ fen });
  }

  public getPosition(): string {
    return this.boardApi?.getFen() || '';
  }

  public flipBoard(): void {
    this.boardApi?.toggleOrientation();
  }
}
```

### Angular Service for Game Logic

```typescript
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import type { OrigMove, DestMove } from '@repo/cotulenh-board';

interface GameState {
  position: string;
  turn: 'red' | 'blue';
  validMoves: Map<string, any>;
  history: string[];
  gameStatus: 'playing' | 'checkmate' | 'draw';
}

@Injectable({
  providedIn: 'root',
})
export class ChessGameService {
  private gameStateSubject = new BehaviorSubject<GameState>({
    position: 'starting-position-fen',
    turn: 'red',
    validMoves: new Map(),
    history: [],
    gameStatus: 'playing',
  });

  public gameState$: Observable<GameState> = this.gameStateSubject.asObservable();

  makeMove(orig: OrigMove, dest: DestMove): boolean {
    const currentState = this.gameStateSubject.value;

    // Validate move
    if (!this.isValidMove(orig, dest, currentState)) {
      return false;
    }

    // Execute move
    const newPosition = this.executeMove(currentState.position, orig, dest);
    const newValidMoves = this.calculateValidMoves(newPosition);
    const newTurn = currentState.turn === 'red' ? 'blue' : 'red';
    const gameStatus = this.checkGameStatus(newPosition, newTurn);

    const newState: GameState = {
      position: newPosition,
      turn: newTurn,
      validMoves: newValidMoves,
      history: [...currentState.history, currentState.position],
      gameStatus,
    };

    this.gameStateSubject.next(newState);
    return true;
  }

  undoMove(): boolean {
    const currentState = this.gameStateSubject.value;

    if (currentState.history.length === 0) {
      return false;
    }

    const previousPosition = currentState.history[currentState.history.length - 1];
    const newValidMoves = this.calculateValidMoves(previousPosition);
    const newTurn = currentState.turn === 'red' ? 'blue' : 'red';

    const newState: GameState = {
      position: previousPosition,
      turn: newTurn,
      validMoves: newValidMoves,
      history: currentState.history.slice(0, -1),
      gameStatus: 'playing',
    };

    this.gameStateSubject.next(newState);
    return true;
  }

  resetGame(): void {
    const initialState: GameState = {
      position: 'starting-position-fen',
      turn: 'red',
      validMoves: this.calculateValidMoves('starting-position-fen'),
      history: [],
      gameStatus: 'playing',
    };

    this.gameStateSubject.next(initialState);
  }

  private isValidMove(orig: OrigMove, dest: DestMove, state: GameState): boolean {
    // Implement move validation logic
    return true;
  }

  private executeMove(position: string, orig: OrigMove, dest: DestMove): string {
    // Implement move execution logic
    return position;
  }

  private calculateValidMoves(position: string): Map<string, any> {
    // Implement valid moves calculation
    return new Map();
  }

  private checkGameStatus(position: string, turn: 'red' | 'blue'): 'playing' | 'checkmate' | 'draw' {
    // Implement game status checking
    return 'playing';
  }
}
```

## Vanilla JavaScript Integration

### Simple Game Implementation

```javascript
class SimpleChessGame {
  constructor(boardElementId) {
    this.boardElement = document.getElementById(boardElementId);
    this.gameState = {
      position: 'starting-position-fen',
      turn: 'red',
      history: [],
    };

    this.initializeBoard();
    this.setupControls();
  }

  initializeBoard() {
    const config = {
      orientation: 'red',
      fen: this.gameState.position,
      movable: {
        color: this.gameState.turn,
        events: {
          after: (orig, dest, metadata) => {
            this.handleMove(orig, dest, metadata);
          },
        },
      },
      events: {
        change: () => {
          this.onPositionChange();
        },
      },
    };

    this.board = CotulenhBoard(this.boardElement, config);
  }

  handleMove(orig, dest, metadata) {
    // Validate move
    if (this.isValidMove(orig, dest)) {
      // Update game state
      this.gameState.history.push(this.gameState.position);
      this.gameState.position = this.makeMove(this.gameState.position, orig, dest);
      this.gameState.turn = this.gameState.turn === 'red' ? 'blue' : 'red';

      // Update board
      this.updateBoard();

      // Check for game end
      this.checkGameEnd();
    } else {
      // Invalid move - revert
      this.board.set({ fen: this.gameState.position });
    }
  }

  updateBoard() {
    const validMoves = this.calculateValidMoves(this.gameState.position, this.gameState.turn);

    this.board.set({
      movable: {
        color: this.gameState.turn,
        dests: validMoves,
      },
    });
  }

  setupControls() {
    // Undo button
    document.getElementById('undo-btn')?.addEventListener('click', () => {
      this.undoMove();
    });

    // Reset button
    document.getElementById('reset-btn')?.addEventListener('click', () => {
      this.resetGame();
    });

    // Flip board button
    document.getElementById('flip-btn')?.addEventListener('click', () => {
      this.board.toggleOrientation();
    });
  }

  undoMove() {
    if (this.gameState.history.length > 0) {
      this.gameState.position = this.gameState.history.pop();
      this.gameState.turn = this.gameState.turn === 'red' ? 'blue' : 'red';

      this.board.set({ fen: this.gameState.position });
      this.updateBoard();
    }
  }

  resetGame() {
    this.gameState = {
      position: 'starting-position-fen',
      turn: 'red',
      history: [],
    };

    this.board.set({ fen: this.gameState.position });
    this.updateBoard();
  }

  // Implement these methods based on your game engine
  isValidMove(orig, dest) {
    return true;
  }
  makeMove(position, orig, dest) {
    return position;
  }
  calculateValidMoves(position, turn) {
    return new Map();
  }
  checkGameEnd() {
    /* Check for checkmate/draw */
  }
  onPositionChange() {
    /* Handle position changes */
  }
}

// Initialize the game
const game = new SimpleChessGame('chess-board');
```

## WebSocket Integration for Multiplayer

### Real-time Multiplayer Board

```typescript
class MultiplayerChessBoard {
  private board: Api;
  private socket: WebSocket;
  private gameId: string;
  private playerId: string;
  private playerColor: 'red' | 'blue';

  constructor(boardElement: HTMLElement, gameId: string, playerId: string, playerColor: 'red' | 'blue') {
    this.gameId = gameId;
    this.playerId = playerId;
    this.playerColor = playerColor;

    this.initializeSocket();
    this.initializeBoard(boardElement);
  }

  private initializeSocket(): void {
    this.socket = new WebSocket(`ws://localhost:8080/game/${this.gameId}`);

    this.socket.onopen = () => {
      console.log('Connected to game server');
      this.socket.send(
        JSON.stringify({
          type: 'join',
          gameId: this.gameId,
          playerId: this.playerId,
        }),
      );
    };

    this.socket.onmessage = event => {
      const message = JSON.parse(event.data);
      this.handleServerMessage(message);
    };

    this.socket.onclose = () => {
      console.log('Disconnected from game server');
    };

    this.socket.onerror = error => {
      console.error('WebSocket error:', error);
    };
  }

  private initializeBoard(boardElement: HTMLElement): void {
    const config: Config = {
      orientation: this.playerColor,
      movable: {
        color: this.playerColor,
        events: {
          after: (orig, dest, metadata) => {
            this.sendMove(orig, dest, metadata);
          },
        },
      },
    };

    this.board = CotulenhBoard(boardElement, config);
  }

  private sendMove(orig: OrigMove, dest: DestMove, metadata: any): void {
    const moveData = {
      type: 'move',
      gameId: this.gameId,
      playerId: this.playerId,
      move: { orig, dest, metadata },
      timestamp: Date.now(),
    };

    this.socket.send(JSON.stringify(moveData));
  }

  private handleServerMessage(message: any): void {
    switch (message.type) {
      case 'gameState':
        this.updateGameState(message.data);
        break;

      case 'move':
        this.applyOpponentMove(message.data);
        break;

      case 'gameEnd':
        this.handleGameEnd(message.data);
        break;

      case 'playerJoined':
        console.log('Player joined:', message.data.playerId);
        break;

      case 'playerLeft':
        console.log('Player left:', message.data.playerId);
        break;

      case 'error':
        console.error('Server error:', message.data);
        break;
    }
  }

  private updateGameState(gameState: any): void {
    this.board.set({
      fen: gameState.position,
      movable: {
        color: gameState.turn === this.playerColor ? this.playerColor : undefined,
        dests: gameState.validMoves,
      },
    });
  }

  private applyOpponentMove(moveData: any): void {
    // Apply the move to the board
    this.board.move(moveData.orig, moveData.dest);

    // Update turn and valid moves
    this.board.set({
      movable: {
        color: this.playerColor,
        dests: moveData.validMoves,
      },
    });
  }

  private handleGameEnd(gameEndData: any): void {
    console.log('Game ended:', gameEndData);

    // Disable further moves
    this.board.set({
      movable: { color: undefined },
    });

    // Show game result
    this.showGameResult(gameEndData.result, gameEndData.winner);
  }

  private showGameResult(result: string, winner?: string): void {
    const message = winner ? `Game Over! ${winner} wins by ${result}` : `Game Over! Draw by ${result}`;

    alert(message);
  }

  public disconnect(): void {
    this.socket.close();
    this.board.destroy();
  }
}

// Usage
const multiplayerBoard = new MultiplayerChessBoard(
  document.getElementById('board')!,
  'game-123',
  'player-456',
  'red',
);
```

## Best Practices for Integration

### 1. Proper Cleanup

```typescript
// Always clean up resources
useEffect(() => {
  return () => {
    boardApi?.destroy();
  };
}, []);
```

### 2. Error Handling

```typescript
try {
  const board = CotulenhBoard(element, config);
} catch (error) {
  console.error('Failed to initialize board:', error);
  // Show fallback UI
}
```

### 3. Performance Optimization

```typescript
// Debounce rapid updates
const debouncedUpdate = useMemo(
  () =>
    debounce((config: Config) => {
      boardApi?.set(config);
    }, 100),
  [boardApi],
);
```

### 4. Responsive Design

```typescript
// Handle window resize
useEffect(() => {
  const handleResize = () => {
    boardApi?.redrawAll();
  };

  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, [boardApi]);
```

### 5. Accessibility

```typescript
// Add ARIA labels and keyboard support
const config: Config = {
  // ... other config
  events: {
    insert: elements => {
      elements.board.setAttribute('role', 'grid');
      elements.board.setAttribute('aria-label', 'Chess board');
    },
  },
};
```
