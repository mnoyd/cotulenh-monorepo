# Cotulenh Board Documentation

Welcome to the Cotulenh Board documentation. This library provides a complete interactive board for Commander Chess (Cờ Tư Lệnh) with advanced features like piece stacking, combining, and air defense systems.

## Documentation Structure

- **[API Reference](./api-reference.md)** - Complete exported API documentation
- **[Callback System](./callback-system.md)** - Event handling and callback mechanisms
- **[Drag & Drop](./drag-and-drop.md)** - Comprehensive drag & drop implementation
- **[Piece Rendering](./piece-rendering.md)** - How pieces are rendered and displayed
- **[Board Editor Guide](./board-editor.md)** - Building chess board editors
- **[Integration Examples](./integration-examples.md)** - Real-world usage examples

## Quick Start

```typescript
import { CotulenhBoard } from '@repo/cotulenh-board';

const board = CotulenhBoard(document.getElementById('board'), {
  orientation: 'red',
  movable: {
    color: 'red',
    events: {
      after: (orig, dest, metadata) => {
        console.log('Move completed:', orig, dest);
      },
    },
  },
});
```

## Key Features

- 🎯 **Interactive Board** - Click-to-move and drag-and-drop
- 📚 **Piece Stacking** - Multiple pieces per square
- 🔗 **Piece Combination** - Automatic piece merging
- 🛡️ **Air Defense** - Influence zone visualization
- 🎨 **Customizable** - Flexible styling and theming
- ⚡ **Performance** - Optimized rendering system
- 🎮 **Events** - Comprehensive callback system

## What's Next?

If you're building a **chess board editor**, start with the [Board Editor Guide](./board-editor.md) which covers everything you need to create a drag-and-drop piece editor for setting up game positions.
