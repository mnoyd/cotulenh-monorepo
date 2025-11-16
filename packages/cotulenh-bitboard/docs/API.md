# API Reference

> 🚧 **Under Development** - This API documentation will be completed as the implementation progresses.

## Overview

`@repo/cotulenh-bitboard` provides the same API as `@repo/cotulenh-core` for drop-in compatibility.

For complete API documentation, see:

- [CoTuLenh Core API](../../cotulenh-core/docs/current/API-REFERENCE.md)

## Quick Reference

```typescript
import { CoTuLenh } from '@repo/cotulenh-bitboard';

const game = new CoTuLenh();
```

### Constructor

```typescript
new CoTuLenh(fen?: string)
```

### Methods

- `load(fen: string): void` - Load position from FEN
- `fen(): string` - Get current position as FEN
- `get(square: Square): Piece | undefined` - Get piece at square
- `put(piece: Piece, square: Square): boolean` - Place piece on square
- `remove(square: Square): Piece | undefined` - Remove piece from square
- `moves(options?): Move[] | string[]` - Generate legal moves
- `move(request): Move` - Execute a move
- `undo(): void` - Undo last move
- `turn(): Color` - Get current turn
- `history(options?): Move[] | string[]` - Get move history

### Types

```typescript
type Color = 'r' | 'b'
type PieceSymbol = 'c' | 'i' | 't' | 'm' | 'e' | 'a' | 'g' | 's' | 'f' | 'n' | 'h'
type Square = 'a1' | 'a2' | ... | 'k12'

interface Piece {
  type: PieceSymbol
  color: Color
  heroic?: boolean
  carrying?: Piece[]
}
```

## Implementation Status

API methods will be implemented in phases. See [IMPLEMENTATION-GUIDE.md](./IMPLEMENTATION-GUIDE.md) for details.

## Differences from cotulenh-core

None - the API is 100% compatible.

Internal implementation uses bitboards instead of 0x88, but this is transparent to users.
