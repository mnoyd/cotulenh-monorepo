# Board Editor Guide

Complete guide to building chess board editors using Cotulenh Board - perfect for creating positions, analyzing games, and setting up custom scenarios.

## Overview

A board editor allows users to:

- **Drag pieces from a palette** onto the board
- **Move pieces around freely** without game rule constraints
- **Delete pieces** by dragging them off the board
- **Set up custom positions** for analysis or gameplay
- **Save and load positions** as FEN strings
- **Undo/redo operations** for easy editing

## Basic Editor Setup

### Minimal Editor Implementation

```typescript
import { CotulenhBoard } from '@repo/cotulenh-board';
import type { Api, Config } from '@repo/cotulenh-board';

class BasicBoardEditor {
  private board: Api;

  constructor(boardElement: HTMLElement) {
    const config: Config = {
      orientation: 'red',
      movable: {
        free: true, // Allow any move
        color: 'both', // Allow moving both colors
        showDests: false, // Don't show move destinations
      },
      draggable: {
        enabled: true,
        deleteOnDropOff: true, // Delete pieces dragged off board
      },
      events: {
        change: () => {
          console.log('Position changed:', this.board.getFen());
        },
      },
    };

    this.board = CotulenhBoard(boardElement, config);
  }

  // Get current position
  getPosition(): string {
    return this.board.getFen();
  }

  // Set position from FEN
  setPosition(fen: string): void {
    this.board.set({ fen });
  }

  // Clear the board
  clear(): void {
    this.board.setPieces(new Map());
  }
}
```

## Piece Palette Implementation

### HTML Structure

```html
<div class="editor-container">
  <div class="piece-palette">
    <div class="palette-section" data-color="red">
      <h3>Red Pieces</h3>
      <div class="pieces">
        <!-- Pieces will be added here -->
      </div>
    </div>
    <div class="palette-section" data-color="blue">
      <h3>Blue Pieces</h3>
      <div class="pieces">
        <!-- Pieces will be added here -->
      </div>
    </div>
  </div>
  <div class="board-container">
    <div id="board"></div>
  </div>
  <div class="editor-controls">
    <button id="clear-board">Clear Board</button>
    <button id="flip-board">Flip Board</button>
    <button id="undo">Undo</button>
    <button id="redo">Redo</button>
  </div>
</div>
```

### CSS Styling

```css
.editor-container {
  display: flex;
  gap: 20px;
  height: 600px;
}

.piece-palette {
  width: 200px;
  background: #f5f5f5;
  padding: 15px;
  border-radius: 8px;
  overflow-y: auto;
}

.palette-section {
  margin-bottom: 20px;
}

.palette-section h3 {
  margin: 0 0 10px 0;
  font-size: 14px;
  font-weight: bold;
}

.pieces {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.palette-piece {
  width: 50px;
  height: 50px;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  border: 2px solid transparent;
  border-radius: 4px;
  cursor: grab;
  transition: all 0.2s;
}

.palette-piece:hover {
  border-color: #007bff;
  transform: scale(1.05);
}

.palette-piece:active {
  cursor: grabbing;
}

.board-container {
  flex: 1;
  position: relative;
}

.editor-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 120px;
}

.editor-controls button {
  padding: 8px 12px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
}

.editor-controls button:hover {
  background: #f0f0f0;
}
```

### Complete Palette Implementation

```typescript
class PiecePalette {
  private board: Api;
  private paletteElement: HTMLElement;

  constructor(board: Api, paletteElement: HTMLElement) {
    this.board = board;
    this.paletteElement = paletteElement;
    this.createPalette();
  }

  private createPalette(): void {
    const pieces = [
      'commander',
      'infantry',
      'tank',
      'militia',
      'engineer',
      'artillery',
      'anti_air',
      'missile',
      'air_force',
      'navy',
      'headquarter',
    ];

    const colors = ['red', 'blue'];

    colors.forEach(color => {
      const section = this.paletteElement.querySelector(`[data-color="${color}"]`);
      const piecesContainer = section?.querySelector('.pieces');

      if (!piecesContainer) return;

      pieces.forEach(role => {
        const piece = { role: role as Role, color: color as Color };
        const pieceElement = this.createPalettepiece(piece);
        piecesContainer.appendChild(pieceElement);
      });
    });
  }

  private createPalettepiece(piece: Piece): HTMLElement {
    const element = document.createElement('div');
    element.className = `palette-piece ${piece.color} ${piece.role}`;
    element.title = `${piece.color} ${piece.role}`;

    // Add drag event listeners
    element.addEventListener('mousedown', e => {
      this.startDrag(piece, e);
    });

    element.addEventListener('touchstart', e => {
      this.startDrag(piece, e);
    });

    return element;
  }

  private startDrag(piece: Piece, event: MouseEvent | TouchEvent): void {
    // Prevent default to avoid text selection
    event.preventDefault();

    // Start dragging the piece
    this.board.dragNewPiece(piece, event, true); // force=true allows replacing
  }
}
```

## Advanced Editor Features

### History Management (Undo/Redo)

```typescript
interface HistoryState {
  fen: string;
  timestamp: number;
}

class EditorHistory {
  private history: HistoryState[] = [];
  private currentIndex = -1;
  private maxHistory = 50;

  saveState(fen: string): void {
    // Remove any future states if we're not at the end
    this.history = this.history.slice(0, this.currentIndex + 1);

    // Add new state
    const state: HistoryState = {
      fen,
      timestamp: Date.now(),
    };

    this.history.push(state);
    this.currentIndex++;

    // Limit history size
    if (this.history.length > this.maxHistory) {
      this.history.shift();
      this.currentIndex--;
    }
  }

  canUndo(): boolean {
    return this.currentIndex > 0;
  }

  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  undo(): string | null {
    if (this.canUndo()) {
      this.currentIndex--;
      return this.history[this.currentIndex].fen;
    }
    return null;
  }

  redo(): string | null {
    if (this.canRedo()) {
      this.currentIndex++;
      return this.history[this.currentIndex].fen;
    }
    return null;
  }

  clear(): void {
    this.history = [];
    this.currentIndex = -1;
  }
}
```

### Complete Editor with History

```typescript
class AdvancedBoardEditor {
  private board: Api;
  private palette: PiecePalette;
  private history: EditorHistory;
  private changeTimeout?: number;

  constructor(boardElement: HTMLElement, paletteElement: HTMLElement) {
    this.history = new EditorHistory();

    const config: Config = {
      orientation: 'red',
      movable: {
        free: true,
        color: 'both',
        showDests: false,
      },
      draggable: {
        enabled: true,
        deleteOnDropOff: true,
      },
      events: {
        change: () => {
          this.debouncedSaveState();
        },
        dropNewPiece: (piece, key) => {
          console.log(`Added ${piece.color} ${piece.role} to ${key}`);
        },
      },
    };

    this.board = CotulenhBoard(boardElement, config);
    this.palette = new PiecePalette(this.board, paletteElement);

    // Save initial empty state
    this.saveCurrentState();

    this.setupControls();
  }

  private debouncedSaveState(): void {
    // Debounce rapid changes
    if (this.changeTimeout) {
      clearTimeout(this.changeTimeout);
    }

    this.changeTimeout = window.setTimeout(() => {
      this.saveCurrentState();
    }, 500);
  }

  private saveCurrentState(): void {
    const fen = this.board.getFen();
    this.history.saveState(fen);
    this.updateControlStates();
  }

  private setupControls(): void {
    // Clear board
    document.getElementById('clear-board')?.addEventListener('click', () => {
      this.clearBoard();
    });

    // Flip board
    document.getElementById('flip-board')?.addEventListener('click', () => {
      this.board.toggleOrientation();
    });

    // Undo
    document.getElementById('undo')?.addEventListener('click', () => {
      this.undo();
    });

    // Redo
    document.getElementById('redo')?.addEventListener('click', () => {
      this.redo();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              this.redo();
            } else {
              this.undo();
            }
            break;
          case 'y':
            e.preventDefault();
            this.redo();
            break;
        }
      }
    });
  }

  private updateControlStates(): void {
    const undoBtn = document.getElementById('undo') as HTMLButtonElement;
    const redoBtn = document.getElementById('redo') as HTMLButtonElement;

    if (undoBtn) undoBtn.disabled = !this.history.canUndo();
    if (redoBtn) redoBtn.disabled = !this.history.canRedo();
  }

  clearBoard(): void {
    this.board.setPieces(new Map());
  }

  undo(): void {
    const previousFen = this.history.undo();
    if (previousFen) {
      this.board.set({ fen: previousFen });
      this.updateControlStates();
    }
  }

  redo(): void {
    const nextFen = this.history.redo();
    if (nextFen) {
      this.board.set({ fen: nextFen });
      this.updateControlStates();
    }
  }

  // Public API methods
  getPosition(): string {
    return this.board.getFen();
  }

  setPosition(fen: string): void {
    this.board.set({ fen });
    this.saveCurrentState();
  }

  exportPosition(): string {
    return this.board.getFen();
  }

  importPosition(fen: string): boolean {
    try {
      this.setPosition(fen);
      return true;
    } catch (error) {
      console.error('Invalid FEN:', error);
      return false;
    }
  }
}
```

## Position Management

### FEN Import/Export

```typescript
class PositionManager {
  private editor: AdvancedBoardEditor;

  constructor(editor: AdvancedBoardEditor) {
    this.editor = editor;
    this.setupImportExport();
  }

  private setupImportExport(): void {
    // Export button
    document.getElementById('export-fen')?.addEventListener('click', () => {
      const fen = this.editor.getPosition();
      this.copyToClipboard(fen);
      this.showNotification('Position copied to clipboard!');
    });

    // Import button
    document.getElementById('import-fen')?.addEventListener('click', () => {
      this.showImportDialog();
    });
  }

  private async copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  }

  private showImportDialog(): void {
    const fen = prompt('Enter FEN string:');
    if (fen) {
      if (this.editor.importPosition(fen)) {
        this.showNotification('Position imported successfully!');
      } else {
        this.showNotification('Invalid FEN string!', 'error');
      }
    }
  }

  private showNotification(message: string, type: 'success' | 'error' = 'success'): void {
    // Simple notification implementation
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 10px 20px;
      border-radius: 4px;
      color: white;
      background: ${type === 'success' ? '#28a745' : '#dc3545'};
      z-index: 1000;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}
```

## Starting Game from Editor

### Game Transition

```typescript
class EditorToGame {
  private editor: AdvancedBoardEditor;

  constructor(editor: AdvancedBoardEditor) {
    this.editor = editor;
    this.setupGameStart();
  }

  private setupGameStart(): void {
    document.getElementById('start-game')?.addEventListener('click', () => {
      this.startGameFromPosition();
    });
  }

  private startGameFromPosition(): void {
    const position = this.editor.getPosition();

    // Validate position has required pieces
    if (!this.isValidGamePosition(position)) {
      alert('Position must have both commanders to start a game!');
      return;
    }

    // Switch to game mode
    this.transitionToGameMode(position);
  }

  private isValidGamePosition(fen: string): boolean {
    // Check if position has both commanders
    const redCommander = fen.includes('red commander');
    const blueCommander = fen.includes('blue commander');
    return redCommander && blueCommander;
  }

  private transitionToGameMode(fen: string): void {
    // Reconfigure board for gameplay
    this.editor.board.set({
      movable: {
        free: false, // Enable move validation
        color: 'red', // Start with red to move
        showDests: true, // Show valid moves
      },
      draggable: {
        deleteOnDropOff: false, // Don't delete pieces in game mode
      },
      events: {
        move: (orig, dest, captured) => {
          console.log('Game move:', orig, dest, captured);
          // Handle game logic
        },
      },
    });

    // Hide editor controls, show game controls
    this.toggleUIMode('game');
  }

  private toggleUIMode(mode: 'editor' | 'game'): void {
    const editorControls = document.querySelector('.editor-controls');
    const gameControls = document.querySelector('.game-controls');
    const palette = document.querySelector('.piece-palette');

    if (mode === 'game') {
      editorControls?.classList.add('hidden');
      palette?.classList.add('hidden');
      gameControls?.classList.remove('hidden');
    } else {
      editorControls?.classList.remove('hidden');
      palette?.classList.remove('hidden');
      gameControls?.classList.add('hidden');
    }
  }
}
```

## Mobile Optimization

### Touch-Friendly Editor

```typescript
class MobileBoardEditor extends AdvancedBoardEditor {
  constructor(boardElement: HTMLElement, paletteElement: HTMLElement) {
    super(boardElement, paletteElement);
    this.optimizeForMobile();
  }

  private optimizeForMobile(): void {
    // Increase drag distance for touch
    this.board.set({
      draggable: {
        distance: 10, // Larger distance for touch
        autoDistance: false,
      },
    });

    // Add touch-specific CSS
    this.addMobileStyles();

    // Handle device orientation
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.board.redrawAll();
      }, 100);
    });
  }

  private addMobileStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      @media (max-width: 768px) {
        .editor-container {
          flex-direction: column;
          height: auto;
        }
        
        .piece-palette {
          width: 100%;
          height: 120px;
          order: 2;
        }
        
        .pieces {
          grid-template-columns: repeat(6, 1fr);
        }
        
        .palette-piece {
          width: 40px;
          height: 40px;
        }
        
        .board-container {
          order: 1;
          height: 400px;
        }
        
        .editor-controls {
          order: 3;
          flex-direction: row;
          width: 100%;
          justify-content: space-around;
        }
      }
    `;
    document.head.appendChild(style);
  }
}
```

## Complete Usage Example

```typescript
// Initialize the editor
const boardElement = document.getElementById('board')!;
const paletteElement = document.querySelector('.piece-palette')!;

const editor = new AdvancedBoardEditor(boardElement, paletteElement);
const positionManager = new PositionManager(editor);
const gameTransition = new EditorToGame(editor);

// Set up a starting position
editor.setPosition('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');

// Export current position
console.log('Current position:', editor.getPosition());
```

## Best Practices

1. **Always use `free: true`** in movable config for editors
2. **Enable `deleteOnDropOff`** for easy piece removal
3. **Implement undo/redo** for better user experience
4. **Debounce state saves** to avoid performance issues
5. **Validate positions** before starting games
6. **Optimize for mobile** with appropriate touch targets
7. **Provide visual feedback** for all user actions
8. **Handle edge cases** like invalid FEN strings
9. **Save editor state** to localStorage for persistence
10. **Test with various screen sizes** and input methods
