# Migration Plan: Old CombinePieceFactory → New PieceStacker

## Current System Analysis

### Old API (from index.test.ts):

```typescript
// Old system used CombinePieceFactory class
const factory = new CombinePieceFactory<T>(getRoleFn);
const result = factory.formStack(piece1, piece2);

// Required:
- GenericPiece interface with id, carrying properties
- getRoleFn: (piece: T) => string function
- Factory instance creation
- formStack method for combining 2 pieces
```

### New API (current implementation):

```typescript
// New system uses static methods
const result = PieceStacker.combine([piece1, piece2, ...]);
const remaining = PieceStacker.remove(stackPiece, 'ROLE_NAME');

// Required:
- Piece interface with color, role, heroic, carrying properties
- Static methods only
- combine method takes array of pieces
- remove method for removing by role name
```

## Key Differences

| Aspect              | Old System                  | New System                         |
| ------------------- | --------------------------- | ---------------------------------- |
| **API Style**       | Instance-based factory      | Static methods                     |
| **Combine Method**  | `formStack(piece1, piece2)` | `combine([piece1, piece2, ...])`   |
| **Role Access**     | Custom `getRoleFn`          | Direct `piece.role` property       |
| **Piece Interface** | `GenericPiece` with `id`    | `Piece` with `color, role, heroic` |
| **Remove Method**   | Not shown in tests          | `remove(stack, roleName)`          |

## Migration Steps

### 1. Interface Mapping

```typescript
// Old GenericPiece → New Piece
interface OldGenericPiece {
  id: string;
  carrying?: OldGenericPiece[];
  // + custom properties (role via getRoleFn)
}

interface NewPiece {
  color: string;
  role: string;
  heroic: boolean;
  carrying?: NewPiece[];
}
```

### 2. Method Mapping

```typescript
// Old: factory.formStack(piece1, piece2)
// New: PieceStacker.combine([piece1, piece2])

// Migration wrapper:
function migrateFormStack<T>(piece1: T, piece2: T): T | null {
  // Convert T to Piece format
  // Call PieceStacker.combine([piece1, piece2])
  // Convert result back to T format
}
```

### 3. Test Migration Strategy

#### Phase 1: Skip Old Tests

- Mark existing tests as `it.skip()`
- Keep them as reference

#### Phase 2: Create New Test File

- `__tests__/new-implementation.test.ts`
- Migrate test cases to new API
- Use same test scenarios but new interface

#### Phase 3: Adapter Layer (Optional)

- Create compatibility wrapper if needed
- `CombinePieceFactory` → `PieceStacker` adapter

## Test Case Mapping

### Old Test Pattern:

```typescript
const factory = new CombinePieceFactory<T>(getRoleFn);
const result = factory.formStack(tank1, infantry1);
expect(result).toEqual(
  expect.objectContaining({
    ...tank1,
    carrying: [infantry1]
  })
);
```

### New Test Pattern:

```typescript
const result = PieceStacker.combine([tank1, infantry1]);
expect(result).toEqual({
  color: tank1.color,
  role: tank1.role,
  heroic: tank1.heroic,
  carrying: [
    {
      color: infantry1.color,
      role: infantry1.role,
      heroic: infantry1.heroic
    }
  ]
});
```

## Implementation Plan

1. **Skip existing tests** - Mark as `it.skip()` for reference
2. **Create new test file** - Migrate scenarios to new API
3. **Create piece adapters** - Convert between old/new formats
4. **Run new tests** - Verify new implementation works
5. **Create compatibility layer** (if needed for other packages)

## Piece Type Conversions

### BoardPieceDefinition → Piece:

```typescript
function boardToNewPiece(board: BoardPieceDefinition): Piece {
  return {
    color: board.color,
    role: board.role.toUpperCase(),
    heroic: board.promoted || false,
    carrying: board.carrying?.map(boardToNewPiece)
  };
}
```

### CorePieceDefinition → Piece:

```typescript
function coreToNewPiece(core: CorePieceDefinition): Piece {
  return {
    color: core.color === 'r' ? 'red' : 'blue',
    role: coreSymbolToRoleMap[core.type].toUpperCase(),
    heroic: core.heroic || false,
    carrying: core.carrying?.map(coreToNewPiece)
  };
}
```

This plan allows for systematic migration while keeping the old tests as reference and ensuring the new implementation handles all the same scenarios.
