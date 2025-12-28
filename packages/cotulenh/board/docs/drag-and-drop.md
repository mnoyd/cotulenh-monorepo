# Drag & Drop System

Complete guide to the drag and drop implementation in Cotulenh Board, covering events, rendering, piece handling, and editor functionality.

## Overview

The drag & drop system handles:

- **Piece dragging** from board squares
- **New piece dragging** from external sources (piece palettes)
- **Stack piece selection** and movement
- **Combined piece interactions** via popups
- **Visual feedback** during drag operations
- **Touch and mouse support**

## Drag Events Lifecycle

### 1. Drag Start (`start`)

Triggered by mouse/touch down on a piece or board square.

**Event Flow:**

```
User Input → Position Detection → Piece Validation → Drag Initialization → Visual Setup
```

**Key Checks:**

- Event trust validation (`e.isTrusted` or `trustAllEvents`)
- Button validation (left/right click, single touch)
- Position bounds checking
- Piece ownership validation
- Popup interaction handling

```typescript
// Internal drag start logic
function start(s: State, e: MouchEvent): void {
  // Trust and input validation
  if (!(s.trustAllEvents || e.isTrusted)) return;
  if (e.buttons !== undefined && e.buttons > 2) return;
  if (e.touches && e.touches.length > 1) return;

  const position = eventPosition(e);
  const keyAtPosition = getKeyAtDomPos(position, redPov(s), bounds);
  const piece = s.pieces.get(keyAtPosition);

  // Handle popup interactions first
  if (handlePopupInteraction(s, e, position)) return;

  // Initialize drag state
  s.draggable.current = {
    orig: keyAtPosition,
    piece,
    origPos: position,
    pos: position,
    started: false,
    element: pieceElementByKey(s, keyAtPosition),
    // ... other properties
  };
}
```

### 2. Drag Move (`move`)

Continuously updates drag position during movement.

```typescript
function move(s: State, e: MouchEvent): void {
  if (s.draggable.current && (!e.touches || e.touches.length < 2)) {
    s.draggable.current.pos = eventPosition(e);
  }
}
```

### 3. Drag Processing (`processDrag`)

Handles visual updates and drag state management using `requestAnimationFrame`.

**Visual Updates:**

- Piece element positioning
- Ghost piece display
- Drag state classes
- Animation cancellation

```typescript
function processDrag(s: State): void {
  requestAnimationFrame(() => {
    const cur = s.draggable.current;
    if (!cur) return;

    // Cancel conflicting animations
    if (s.animation.current?.plan.anims.has(cur.orig)) {
      s.animation.current = undefined;
    }

    // Check if drag should start (distance threshold)
    if (!cur.started && distanceSq(cur.pos, cur.origPos) >= Math.pow(s.draggable.distance, 2)) {
      cur.started = true;
    }

    if (cur.started) {
      // Update piece position
      const bounds = s.dom.bounds();
      const fileWidth = bounds.width / 12;
      const rankHeight = bounds.height / 13;

      translate(cur.element, [
        cur.pos[0] - bounds.left - fileWidth / 2,
        cur.pos[1] - bounds.top - rankHeight / 2,
      ]);
    }

    processDrag(s); // Continue processing
  });
}
```

### 4. Drag End (`end`)

Handles drop logic and cleanup.

**Drop Scenarios:**

- **Valid move**: Execute move and animate
- **Invalid drop**: Return piece to origin
- **Off-board drop**: Delete piece (if enabled) or return
- **New piece drop**: Place piece on board

```typescript
function end(s: State, e: MouchEvent): void {
  const cur = s.draggable.current;
  if (!cur) return;

  const eventPos = eventPosition(e) || cur.pos;
  const keyAtCurrentPosition = getKeyAtDomPos(eventPos, redPov(s), bounds);

  if (keyAtCurrentPosition && cur.started && cur.orig !== keyAtCurrentPosition) {
    handlePieceMove(s, cur, keyAtCurrentPosition);
  } else if (!keyAtCurrentPosition && !cur.newPiece) {
    handlePieceReturn(s, cur);
  }

  finalizeDrag(s);
}
```

## Drag State Interface

### `DragCurrent` Interface

Complete drag state tracking:

```typescript
interface DragCurrent {
  orig: Key; // Origin square
  piece: Piece; // Piece being dragged
  origPos: NumberPair; // Initial mouse/touch position
  pos: NumberPair; // Current mouse/touch position
  started: boolean; // Has drag distance threshold been met?
  element: PieceNode | (() => PieceNode | undefined); // DOM element
  newPiece?: boolean; // Is this from external source?
  force?: boolean; // Can replace existing pieces?
  previouslySelected?: Key; // Previously selected square
  originTarget: EventTarget | null; // Original event target
  keyHasChanged: boolean; // Has piece left origin square?
  temporaryPos?: Key; // Potential drop position
  fromStack?: boolean; // Is this from a piece stack?
}
```

## New Piece Dragging (Editor Mode)

### `dragNewPiece` API

For dragging pieces from external sources (piece palettes, toolbars):

```typescript
// API method
dragNewPiece(piece: Piece, event: MouchEvent, force?: boolean): void

// Usage example
function onPaletteClick(piece: Piece, event: MouseEvent) {
  board.dragNewPiece(piece, event, true); // force=true allows replacing pieces
}
```

### Implementation Details

```typescript
function dragNewPiece(s: State, piece: Piece, e: MouchEvent, force?: boolean): void {
  const key: Key = 'a0'; // Temporary key for new pieces
  s.pieces.set(key, piece);
  s.dom.redraw();

  const position = eventPosition(e);

  s.draggable.current = {
    orig: key,
    piece,
    origPos: position,
    pos: position,
    started: true, // Start immediately
    element: () => pieceElementByKey(s, key),
    originTarget: e.target,
    newPiece: true,
    force: !!force,
    keyHasChanged: false,
  };

  processDrag(s);
}
```

## Piece Rendering During Drag

### Visual States

Pieces have different visual states during drag operations:

```typescript
interface PieceNode extends KeyedNode {
  tagName: 'PIECE';
  cgPiece: string;
  cgAnimating?: boolean; // Currently animating
  cgFading?: boolean; // Fading out
  cgDragging?: boolean; // Being dragged
  cgScale?: number; // Scale factor
}
```

### CSS Classes Applied

```css
/* Applied during drag */
.dragging {
  z-index: 999;
  pointer-events: none;
}

/* Ghost piece (shows original position) */
.ghost {
  opacity: 0.3;
  pointer-events: none;
}
```

### Rendering Process

1. **Drag Start**: Add `dragging` class, show ghost
2. **Drag Move**: Update piece position via `transform`
3. **Drag End**: Remove classes, hide ghost, animate to final position

```typescript
// Visual setup during drag start
element.cgDragging = true;
element.classList.add('dragging');

// Ghost piece positioning
const ghost = s.dom.elements.ghost;
if (ghost) {
  ghost.className = `ghost ${piece.color} ${piece.role}`;
  translate(ghost, posToTranslate(bounds)(key2pos(keyAtPosition), redPov(s)));
  setVisible(ghost, true);
}
```

## Stack Piece Handling

### Combined Piece Popups

When dragging pieces with `carrying` array or from stack moves:

```typescript
// Right-click or touch on combined piece shows popup
if (
  piece &&
  ((piece.carrying && piece.carrying.length > 0) ||
    (s.stackPieceMoves && s.stackPieceMoves.key === keyAtPosition)) &&
  isRightClick
) {
  combinedPiecePopup.setPopup(s, prepareCombinedPopup(s, flattenPiece(piece), keyAtPosition), keyAtPosition);
  return;
}
```

### Stack Move Execution

```typescript
function handlePieceMove(s: State, cur: DragCurrent, dest: Key): void {
  if (s.selected) {
    // Handle stack piece movement
    userMove(s, s.selected, { square: dest });
    s.pieces.delete(TEMP_KEY); // Clean up temporary piece
    s.stats.dragged = true;
  } else if (cur.newPiece) {
    // Handle new piece placement
    dropNewPiece(s, cur.orig, dest, cur.force);
  }
}
```

## Touch Support

### Touch Event Handling

```typescript
// Touch-specific considerations
if (e.touches && e.touches.length > 1) return; // Single touch only

// Prevent scroll during drag
if (e.cancelable !== false && (!e.touches || s.blockTouchScroll || piece || previouslySelected)) {
  e.preventDefault();
}

// Handle touchend without position
const eventPos = eventPosition(e) || cur.pos; // Use last known position
```

### Touch vs Mouse Differences

- **Touch events** don't have position on `touchend`
- **Scroll prevention** is more aggressive on touch
- **Distance threshold** may be different for touch
- **Right-click equivalent** is long press or double tap

## Configuration Options

### Draggable Configuration

```typescript
interface DraggableConfig {
  enabled: boolean; // Enable/disable dragging
  distance: number; // Minimum distance to start drag (pixels)
  autoDistance: boolean; // Auto-adjust distance based on usage
  showGhost: boolean; // Show ghost piece at origin
  deleteOnDropOff: boolean; // Delete pieces dropped off board
}

// Usage
const board = CotulenhBoard(element, {
  draggable: {
    enabled: true,
    distance: 3, // 3px minimum drag distance
    autoDistance: true, // Reduce to 0 after first drag
    showGhost: true,
    deleteOnDropOff: false, // Don't delete pieces dropped off board
  },
});
```

## Editor-Specific Features

### Force Placement

```typescript
// Allow replacing existing pieces
board.dragNewPiece(piece, event, true); // force=true
```

### Free Movement Mode

```typescript
// Allow any move (no validation)
board.set({
  movable: {
    free: true, // Disable move validation
    color: 'both', // Allow moving both colors
  },
});
```

### Piece Palette Integration

```typescript
class PiecePalette {
  constructor(board: Api) {
    this.setupPalette(board);
  }

  private setupPalette(board: Api) {
    const palette = document.getElementById('piece-palette');

    // Add pieces to palette
    const pieces = [
      { role: 'commander', color: 'red' },
      { role: 'infantry', color: 'red' },
      { role: 'tank', color: 'red' },
      // ... more pieces
    ];

    pieces.forEach(piece => {
      const pieceEl = this.createPieceElement(piece);

      pieceEl.addEventListener('mousedown', e => {
        board.dragNewPiece(piece, e, true);
      });

      pieceEl.addEventListener('touchstart', e => {
        board.dragNewPiece(piece, e, true);
      });

      palette.appendChild(pieceEl);
    });
  }
}
```

## Performance Considerations

### Efficient Drag Processing

- Uses `requestAnimationFrame` for smooth updates
- Cancels conflicting animations during drag
- Lazy element resolution for better performance
- Minimal DOM queries during drag

### Memory Management

```typescript
function finalizeDrag(s: State): void {
  removeDragElements(s);
  s.draggable.current = undefined; // Clear drag state
  s.dom.redraw();
}

function removeDragElements(s: State): void {
  const ghost = s.dom.elements.ghost;
  if (ghost) setVisible(ghost, false);
}
```

## Error Handling

### Drag Cancellation

```typescript
function cancel(s: State): void {
  const cur = s.draggable.current;
  if (cur) {
    if (cur.newPiece) s.pieces.delete(cur.orig);
    unselect(s);
    finalizeDrag(s);
  }
}
```

### Invalid Drop Handling

```typescript
function handlePieceReturn(s: State, cur: DragCurrent): void {
  if (cur.fromStack) {
    s.pieces.delete(TEMP_KEY);
  }

  // Animate back to original position
  const origPos = posToTranslate(s.dom.bounds())(key2pos(cur.orig), redPov(s));
  translate(cur.element, origPos);
}
```

## Best Practices

1. **Always handle both mouse and touch events**
2. **Use force=true for editor modes**
3. **Implement proper cleanup in drag end handlers**
4. **Consider touch-specific UX (larger touch targets, different gestures)**
5. **Test drag performance on mobile devices**
6. **Provide visual feedback during drag operations**
7. **Handle edge cases (off-board drops, invalid moves)**
