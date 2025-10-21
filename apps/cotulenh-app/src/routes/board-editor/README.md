# CoTuLenh Board Editor

A comprehensive board editor for setting up custom CoTuLenh positions.

## Features

### 🎨 Piece Palette

- **22 draggable pieces** (11 roles × 2 colors)
- Drag pieces from palette to board
- Pieces remain in palette (copy, not move)
- Visual hover effects and feedback

### 🎯 Board Editing

- **Free movement mode** - move pieces without game rules
- **Drag to reposition** - move pieces around the board
- **Drag off to delete** - remove pieces by dragging off board
- **Both colors movable** - edit red and blue pieces freely

### 📝 Position Management

- **Live FEN sync** - automatically updates as you edit
- **FEN input** - paste FEN to load positions
- **Copy FEN** - one-click copy to clipboard
- **Validation** - alerts for invalid FEN strings

### 🎮 Controls

- **Starting Position** - Load the initial game setup
- **Clear Board** - Remove all pieces
- **Flip Board** - Toggle orientation (red/blue perspective)
- **Screenshot** - Capture board as PNG image

## Usage

### Basic Workflow

1. **Navigate to `/board-editor`** in your app
2. **Drag pieces from palette** onto the board
3. **Arrange pieces** by dragging on the board
4. **Delete pieces** by dragging off the board
5. **Copy FEN** when you're satisfied with the position

### Loading Positions

**From FEN:**

```
1. Paste FEN string into the input box
2. Click "Apply"
```

**Preset Positions:**

```
Click "Starting Position" to load the initial setup
```

### Exporting Positions

**Copy FEN:**

```
Click "Copy FEN" to copy the current position
```

**Screenshot:**

```
Click "Screenshot" to download a PNG image
(Requires html2canvas - see dependencies below)
```

## Technical Details

### Dependencies

**Required:**

- `@repo/cotulenh-board` - Board rendering and interaction
- `svelte` - Component framework

**Optional:**

- `html2canvas` - For screenshot functionality
  ```bash
  npm install html2canvas
  ```

### Board Configuration

The editor uses these key configurations:

```typescript
{
  movable: {
    free: true,        // No move validation
    color: 'both',     // Both colors can move
    showDests: false   // No destination hints
  },
  draggable: {
    enabled: true,
    deleteOnDropOff: true  // Drag off = delete
  }
}
```

### How Drag & Drop Works

1. **User clicks palette piece**

   - Calls `board.dragNewPiece(piece, event, force=true)`
   - Creates temporary piece at `TEMP_KEY = 'a0'`

2. **User drags over board**

   - Board tracks mouse/touch position
   - Highlights destination square

3. **User releases on square**

   - Calls `board.dropNewPiece(tempKey, destKey)`
   - Triggers `afterNewPiece` callback
   - Updates FEN automatically

4. **Piece placed**
   - Board state updates
   - DOM re-renders
   - FEN textbox syncs

### API Methods Used

From `@repo/cotulenh-board`:

- `dragNewPiece(piece, event, force)` - Start dragging new piece
- `setPieces(map)` - Batch update pieces
- `getFen()` - Get current position as FEN
- `set({ fen })` - Load position from FEN
- `toggleOrientation()` - Flip board view
- `destroy()` - Cleanup on unmount

## File Structure

```
board-editor/
├── +page.svelte          # Main editor page
├── PiecePalette.svelte   # Draggable piece palette component
└── README.md             # This file
```

## Mobile Support

The editor is fully responsive:

- **Desktop** - 3-column layout (palette | board | controls)
- **Tablet** - Single column, stacked layout
- **Mobile** - Optimized touch targets, compact grid

## Related Documentation

- [Board Editor Guide](/packages/cotulenh-board/docs/board-editor.md)
- [Simple Board Editor Example](/packages/cotulenh-board/simple-board-editor.html)
- [CoTuLenh Board Package](/packages/cotulenh-board/)

## License

Part of the CoTuLenh monorepo.
