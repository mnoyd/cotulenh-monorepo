# Piece Rendering System

Complete guide to how pieces are rendered, displayed, and visually managed in Cotulenh Board.

## Overview

The rendering system handles:

- **Single piece rendering** with role and color
- **Combined piece stacking** with visual offsets
- **Ambiguous piece popups** for selection
- **Animation states** (dragging, fading, animating)
- **Z-index management** for proper layering
- **Performance optimization** through efficient DOM updates

## Piece Element Types

### Base Piece Node Interface

```typescript
interface PieceNode extends KeyedNode {
  tagName: 'PIECE';
  cgPiece: string; // "red commander", "blue tank", etc.
  cgAnimating?: boolean; // Currently in animation
  cgFading?: boolean; // Fading out (captured)
  cgDragging?: boolean; // Being dragged
  cgScale?: number; // Scale factor for animations
}
```

### Specialized Node Types

```typescript
interface AmbigousStackNode extends KeyedNode {
  tagName: 'AMBIGOUS-STACK'; // For piece selection popups
}

interface AttackNode extends KeyedNode {
  tagName: 'PIECE-ATTACK'; // For attack indicators
}
```

## Single Piece Rendering

### `createSinglePieceElement(piece: Piece): PieceNode`

Creates a DOM element for a single piece:

```typescript
function createSinglePieceElement(piece: Piece): PieceNode {
  const pieceName = pieceNameOf(piece); // "red commander"
  const pieceNode = createEl('piece', pieceName) as PieceNode;

  // Add promotion indicator
  if (piece.promoted) {
    const pieceStar = createEl('cg-piece-star') as HTMLElement;
    pieceNode.appendChild(pieceStar);
    pieceStar.style.zIndex = '3';
  }

  pieceNode.cgPiece = pieceName;
  return pieceNode;
}
```

### CSS Classes Applied

```css
/* Base piece styling */
piece {
  position: absolute;
  width: 8.33%; /* 1/12 of board width */
  height: 7.69%; /* 1/13 of board height */
  background-size: contain;
  background-repeat: no-repeat;
}

/* Color and role specific */
piece.red.commander {
  background-image: url('red-commander.svg');
}
piece.blue.tank {
  background-image: url('blue-tank.svg');
}

/* State classes */
piece.dragging {
  z-index: 999;
  pointer-events: none;
}
piece.fading {
  opacity: 0;
  transition: opacity 200ms;
}
piece.animating {
  transition: transform 200ms ease-out;
}
```

## Combined Piece Rendering

### Stack Visualization

Combined pieces (pieces with `carrying` array) are rendered as stacked elements:

```typescript
function createCombinedPieceElement(piece: Piece): PieceNode {
  const container = createEl('piece', 'combined-stack') as PieceNode;
  container.classList.add('piece');

  // Flatten all pieces in the stack
  const allPiecesInStack: Piece[] = flattenPiece(piece);
  createPiecesStackElement(container, allPiecesInStack);

  container.cgPiece = pieceNameOf(piece); // Base piece name
  return container;
}
```

### Stack Offset Calculation

```typescript
const COMBINED_PIECE_OFFSET_BASE = 50;

function createPiecesStackElement(stackContainer: HTMLElement, pieces: Piece[]): HTMLElement {
  const basePiece = pieces[0];
  const basePieceNode = createSinglePieceElement(basePiece);
  stackContainer.appendChild(basePieceNode);

  // Calculate offsets for stacked pieces
  const offsetStepX = 0.1 * COMBINED_PIECE_OFFSET_BASE; // 5px right
  const offsetStepY = -0.2 * COMBINED_PIECE_OFFSET_BASE; // 10px up
  let zIndex = parseInt(basePieceNode.style.zIndex || '1', 10) + 1;

  // Add carried pieces with offsets
  for (let i = 1; i < pieces.length; i++) {
    const carriedPiece = pieces[i];
    const carriedPieceNode = createSinglePieceElement(carriedPiece);

    const offsetX = offsetStepX * i;
    const offsetY = offsetStepY * i;

    translate(carriedPieceNode, [offsetX, offsetY]);
    carriedPieceNode.style.zIndex = `${zIndex++}`;
    stackContainer.appendChild(carriedPieceNode);
  }

  return stackContainer;
}
```

### Visual Result

```
[Tank]     <- Top piece (highest z-index)
  [Engineer] <- Middle piece
    [Infantry] <- Base piece
```

## Ambiguous Piece Popups

### Popup Stack Rendering

For piece selection popups (right-click on combined pieces):

```typescript
function createAmbigousPiecesStackElement(pieces: Piece[]): KeyedNode {
  const stackElement = createEl('piece-ambigous-stack') as KeyedNode;
  stackElement.classList.add('piece-ambigous-stack');

  // Dynamic offset based on piece count
  const offsetFactor = Math.max(5, 20 - pieces.length * 2);
  const baseOffsetY = -offsetFactor;

  let zIndex = 1;

  pieces.forEach((piece, index) => {
    let pieceNode: PieceNode;

    // Handle combined pieces within popup
    if (piece.carrying && piece.carrying.length > 0) {
      pieceNode = createCombinedPieceElement(piece);
    } else {
      pieceNode = createSinglePieceElement(piece);
    }

    // Vertical stacking
    if (index > 0) {
      const offsetY = baseOffsetY * index;
      translate(pieceNode, [0, offsetY]);
    }

    pieceNode.style.zIndex = `${zIndex++}`;
    stackElement.appendChild(pieceNode);
  });

  return stackElement;
}
```

## Z-Index Management

### Position-Based Z-Index

```typescript
function posZIndex(pos: Pos, asRed: boolean): number {
  const [file, rank] = pos;

  // Higher ranks and files get higher z-index
  // Ensures proper piece layering
  return asRed ? (12 - rank) * 12 + (11 - file) : rank * 12 + file;
}
```

### Animation Z-Index

```typescript
// During animations, pieces get elevated z-index
if (piece.cgAnimating) {
  pieceNode.style.zIndex = '999';
}

// Dragging pieces get highest z-index
if (piece.cgDragging) {
  pieceNode.style.zIndex = '1000';
}
```

## Animation States

### Piece State Classes

```typescript
// Applied during different states
pieceNode.cgAnimating = true; // → adds 'animating' class
pieceNode.cgFading = true; // → adds 'fading' class
pieceNode.cgDragging = true; // → adds 'dragging' class
```

### CSS Transitions

```css
/* Smooth movement animations */
piece.animating {
  transition: transform 200ms ease-out;
}

/* Fade out captured pieces */
piece.fading {
  opacity: 0;
  transition: opacity 200ms ease-in;
}

/* Dragging state */
piece.dragging {
  z-index: 1000;
  pointer-events: none;
  transition: none; /* Disable transitions during drag */
}
```

## Rendering Pipeline

### Main Render Function

```typescript
function render(s: State): void {
  const asRed = orientRed(s);
  const posToTranslate = posToTranslateFromBounds(s.dom.bounds());
  const pieces = s.pieces;
  const boardEl = s.dom.elements.board;

  // Process each square
  for (const [key, piece] of pieces) {
    const pos = key2pos(key);

    // Create or update piece element
    let pieceElement = findExistingPieceElement(boardEl, key);

    if (!pieceElement) {
      // Create new piece element
      if (piece.carrying && piece.carrying.length > 0) {
        pieceElement = createCombinedPieceElement(piece);
      } else {
        pieceElement = createSinglePieceElement(piece);
      }

      pieceElement.cgKey = key;
      boardEl.appendChild(pieceElement);
    }

    // Position the piece
    const translation = posToTranslate(pos, asRed);
    translate(pieceElement, translation);

    // Set z-index
    pieceElement.style.zIndex = `${posZIndex(pos, asRed)}`;
  }

  // Remove pieces no longer on board
  cleanupRemovedPieces(boardEl, pieces);
}
```

### Efficient DOM Updates

```typescript
// Only update changed pieces
const samePieces: Set<Key> = new Set();
const movedPieces: Map<PieceName, PieceNode[]> = new Map();

// Compare current state with previous render
for (const [key, piece] of pieces) {
  const existingElement = findExistingPieceElement(boardEl, key);

  if (existingElement && existingElement.cgPiece === pieceNameOf(piece)) {
    samePieces.add(key); // No change needed
  } else {
    // Piece changed or moved
    updatePieceElement(existingElement, piece, key);
  }
}
```

## Performance Optimizations

### Lazy Element Creation

```typescript
// Elements created only when needed
const element = typeof cur.element === 'function' ? cur.element() : cur.element;
```

### Batch DOM Updates

```typescript
// Group DOM operations
requestAnimationFrame(() => {
  // All DOM updates happen in single frame
  updatePiecePositions();
  updatePieceClasses();
  updateZIndices();
});
```

### Element Reuse

```typescript
// Reuse existing DOM elements when possible
const movedPieces: Map<PieceName, PieceNode[]> = new Map();

// Move existing elements instead of creating new ones
if (existingElement && canReuse(existingElement, newPiece)) {
  translate(existingElement, newPosition);
} else {
  createElement(newPiece);
}
```

## Coordinate System

### Board Layout

```
Files: a b c d e f g h i j k (11 files)
Ranks: 1 2 3 4 5 6 7 8 9 10 11 12 (12 ranks)

Board dimensions: 11×12 grid
```

### Position Translation

```typescript
function posToTranslate(bounds: DOMRectReadOnly) {
  return (pos: Pos, asRed: boolean): NumberPair => {
    const fileWidth = bounds.width / 12; // 11 files + 1 for coordinates
    const rankHeight = bounds.height / 13; // 12 ranks + 1 for coordinates

    const [file, rank] = asRed ? pos : [10 - pos[0], 11 - pos[1]];

    return [file * fileWidth, (11 - rank) * rankHeight];
  };
}
```

## CSS Integration

### Required CSS Structure

```css
/* Board container */
.cg-wrap {
  position: relative;
  display: block;
}

/* Board element */
.cg-board {
  position: relative;
  width: 100%;
  height: 100%;
}

/* Piece elements */
piece {
  position: absolute;
  width: 8.33%; /* 100% / 12 files */
  height: 7.69%; /* 100% / 13 ranks */
  background-size: contain;
  background-repeat: no-repeat;
  cursor: pointer;
}

/* Combined piece stacks */
piece.combined-stack {
  /* Container for stacked pieces */
}

/* Popup stacks */
.piece-ambigous-stack {
  position: absolute;
  pointer-events: auto;
}
```

### Piece Sprites

```css
/* Individual piece styling */
piece.red.commander {
  background-image: url('pieces/red-commander.svg');
}
piece.red.infantry {
  background-image: url('pieces/red-infantry.svg');
}
piece.red.tank {
  background-image: url('pieces/red-tank.svg');
}
piece.blue.commander {
  background-image: url('pieces/blue-commander.svg');
}
/* ... etc for all piece types */
```

## Debugging and Development

### Visual Debugging

```typescript
// Add debug information to pieces
if (DEBUG) {
  pieceElement.title = `${piece.color} ${piece.role} at ${key}`;
  pieceElement.dataset.key = key;
  pieceElement.dataset.piece = pieceNameOf(piece);
}
```

### Performance Monitoring

```typescript
// Track rendering performance
const renderStart = performance.now();
render(state);
const renderTime = performance.now() - renderStart;
console.log(`Render took ${renderTime}ms`);
```

## Best Practices

1. **Minimize DOM operations** - Batch updates and reuse elements
2. **Use CSS for visual effects** - Leverage hardware acceleration
3. **Proper z-index management** - Ensure correct piece layering
4. **Handle edge cases** - Empty squares, invalid positions
5. **Optimize for mobile** - Consider touch targets and performance
6. **Test with many pieces** - Ensure performance with full boards
7. **Use semantic HTML** - Proper element types and attributes
