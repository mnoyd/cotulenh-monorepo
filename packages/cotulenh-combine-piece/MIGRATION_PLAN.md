# PieceStacker Integration Guide

Complete guide for integrating the `PieceStacker` system into your CoTuLenh package.

## Overview

The `PieceStacker` provides a generic, type-safe way to combine and manipulate piece stacks using pre-calculated stack configurations. It works with any piece type through a role flag extraction function.

## Core Concepts

### 1. Role Flags

All piece roles are mapped to numeric flags (bit flags):

```typescript
export const ROLE_FLAGS = {
  COMMANDER: 1,
  INFANTRY: 2,
  MILITIA: 4,
  ARTILLERY: 8,
  ANTI_AIR: 16,
  MISSILE: 32,
  TANK: 64,
  AIR_FORCE: 128,
  ENGINEER: 256,
  NAVY: 512,
  HEADQUARTER: 1024
};
```

### 2. Generic Type Support

`PieceStacker<T>` works with any piece type `T` as long as you provide a function to extract role flags:

```typescript
const stacker = new PieceStacker<YourPieceType>((piece) => getRoleFlagFromPiece(piece));
```

## Integration Steps

### Step 1: Import Required Components

```typescript
import { PieceStacker, ROLE_FLAGS } from '@repo/cotulenh-combine-piece';
```

### Step 2: Create Role Mapping

Map your piece role names to `ROLE_FLAGS`:

```typescript
const roleToFlagMap: Record<string, number> = {
  commander: ROLE_FLAGS.COMMANDER,
  infantry: ROLE_FLAGS.INFANTRY,
  tank: ROLE_FLAGS.TANK,
  militia: ROLE_FLAGS.MILITIA,
  engineer: ROLE_FLAGS.ENGINEER,
  artillery: ROLE_FLAGS.ARTILLERY,
  anti_air: ROLE_FLAGS.ANTI_AIR,
  missile: ROLE_FLAGS.MISSILE,
  air_force: ROLE_FLAGS.AIR_FORCE,
  navy: ROLE_FLAGS.NAVY,
  headquarter: ROLE_FLAGS.HEADQUARTER
};
```

### Step 3: Create PieceStacker Instance

Create a stacker instance with your piece type and role extractor:

```typescript
// For pieces with direct role property
const pieceStacker = new PieceStacker<YourPieceType>((piece) => roleToFlagMap[piece.role] || 0);

// For pieces with role in different format
const pieceStacker = new PieceStacker<YourPieceType>(
  (piece) => roleToFlagMap[extractRole(piece)] || 0
);
```

### Step 4: Use the API

```typescript
// Combine pieces
const combined = pieceStacker.combine([piece1, piece2, piece3]);

// Remove piece from stack
const remaining = pieceStacker.remove(stackPiece, 'infantry');
```

## Real-World Integration Examples

### Example 1: CoTuLenh Core Package

**Piece Type:**

```typescript
type Piece = {
  color: 'r' | 'b';
  type: PieceSymbol; // 'c', 'i', 't', etc.
  carrying?: Piece[];
  heroic?: boolean;
};
```

**Integration:**

```typescript
import { PieceStacker, ROLE_FLAGS } from '@repo/cotulenh-combine-piece';

// Map core symbols to role names
const symbolToRoleMap: Record<PieceSymbol, string> = {
  c: 'commander',
  i: 'infantry',
  t: 'tank'
  // ... etc
};

// Create role-to-flag mapping
const roleToFlagMap: Record<string, number> = {
  commander: ROLE_FLAGS.COMMANDER,
  infantry: ROLE_FLAGS.INFANTRY,
  tank: ROLE_FLAGS.TANK
  // ... etc
};

// Create stacker instance
const pieceStacker = new PieceStacker<Piece>(
  (piece) => roleToFlagMap[symbolToRoleMap[piece.type]] || 0
);

// Export utility functions
export function createCombinedPiece(pieceFrom: Piece, pieceTo: Piece): Piece | null {
  return pieceStacker.combine([pieceFrom, pieceTo]);
}

export function removePieceFromStack(stackPiece: Piece, roleToRemove: string): Piece | null {
  return pieceStacker.remove(stackPiece, roleToRemove);
}
```

### Example 2: CoTuLenh Board Package

**Piece Type:**

```typescript
interface Piece {
  role: Role; // 'commander', 'infantry', 'tank', etc.
  color: Color; // 'red' | 'blue'
  promoted?: boolean;
  carrying?: Piece[];
}
```

**Integration:**

```typescript
import { PieceStacker, ROLE_FLAGS } from '@repo/cotulenh-combine-piece';

// Direct role-to-flag mapping (roles already match)
const boardRoleToFlagMap: Record<string, number> = {
  commander: ROLE_FLAGS.COMMANDER,
  infantry: ROLE_FLAGS.INFANTRY,
  tank: ROLE_FLAGS.TANK,
  militia: ROLE_FLAGS.MILITIA,
  engineer: ROLE_FLAGS.ENGINEER,
  artillery: ROLE_FLAGS.ARTILLERY,
  anti_air: ROLE_FLAGS.ANTI_AIR,
  missile: ROLE_FLAGS.MISSILE,
  air_force: ROLE_FLAGS.AIR_FORCE,
  navy: ROLE_FLAGS.NAVY,
  headquarter: ROLE_FLAGS.HEADQUARTER
};

// Create stacker instance
const pieceStacker = new PieceStacker<Piece>((piece) => boardRoleToFlagMap[piece.role] || 0);

// Export utility functions
export function tryCombinePieces(origPiece: Piece, destPiece: Piece): Piece | undefined {
  try {
    const combined = pieceStacker.combine([origPiece, destPiece]);
    return combined ?? undefined;
  } catch (error) {
    console.error('Error combining pieces:', error);
    return undefined;
  }
}

export function removePieceFromStack(stackPiece: Piece, roleToRemove: Role): Piece | null {
  return pieceStacker.remove(stackPiece, roleToRemove);
}
```

### Example 3: Custom Piece Format

**Piece Type:**

```typescript
interface CustomPiece {
  id: string;
  pieceRole: string; // Different property name
  team: 'A' | 'B';
  stack?: CustomPiece[]; // Different property name
}
```

**Integration:**

```typescript
import { PieceStacker, ROLE_FLAGS } from '@repo/cotulenh-combine-piece';

const roleToFlagMap: Record<string, number> = {
  commander: ROLE_FLAGS.COMMANDER,
  infantry: ROLE_FLAGS.INFANTRY
  // ... etc
};

// Adapter to handle different property names
const pieceStacker = new PieceStacker<CustomPiece>(
  (piece) => roleToFlagMap[piece.pieceRole.toLowerCase()] || 0
);

// Wrapper to handle different carrying property name
export function combineCustomPieces(pieces: CustomPiece[]): CustomPiece | null {
  // Convert stack to carrying for internal processing
  const normalized = pieces.map((p) => ({
    ...p,
    carrying: p.stack,
    stack: undefined
  }));

  const result = pieceStacker.combine(normalized);

  // Convert back to custom format
  if (result) {
    return {
      ...result,
      stack: result.carrying,
      carrying: undefined
    } as any;
  }

  return null;
}
```

## Advanced Usage

### Using RoleMapping (Alternative Approach)

If you want to use string-based role mapping instead of direct flag extraction:

```typescript
import { PieceStacker, type RoleMapping, DEFAULT_ROLE_MAPPING } from '@repo/cotulenh-combine-piece';

// Define custom role mapping
const customRoleMapping: RoleMapping = {
  LEADER: 'COMMANDER', // Map 'LEADER' to internal 'COMMANDER'
  SOLDIER: 'INFANTRY', // Map 'SOLDIER' to internal 'INFANTRY'
  VEHICLE: 'TANK' // Map 'VEHICLE' to internal 'TANK'
  // ... etc
};

// Create stacker with role mapping
const pieceStacker = PieceStacker.withRoleMapping<YourPieceType>(
  (piece) => piece.customRoleName, // Extract role string
  customRoleMapping // Map to internal roles
);
```

### Handling Multiple Piece Types

If you need to work with multiple piece formats in the same package:

```typescript
// Create separate stackers for each type
const coreStacker = new PieceStacker<CorePiece>(
  (piece) => coreRoleToFlagMap[symbolToRoleMap[piece.type]] || 0
)

const boardStacker = new PieceStacker<BoardPiece>(
  (piece) => boardRoleToFlagMap[piece.role] || 0
)

// Use appropriate stacker for each context
export function combineCoreP pieces(pieces: CorePiece[]): CorePiece | null {
  return coreStacker.combine(pieces)
}

export function combineBoardPieces(pieces: BoardPiece[]): BoardPiece | null {
  return boardStacker.combine(pieces)
}
```

## API Reference

### PieceStacker Constructor

```typescript
new PieceStacker<T>(getRoleFlagFn: (piece: T) => number)
```

**Parameters:**

- `getRoleFlagFn`: Function that extracts role flag (number) from your piece type

**Returns:** PieceStacker instance

### combine()

```typescript
combine(pieces: T[]): T | null
```

**Parameters:**

- `pieces`: Array of pieces to combine (any number, typically 2-4)

**Returns:**

- Combined piece with `carrying` array, or
- `null` if combination is not valid

**Notes:**

- All pieces must be same color (not validated by PieceStacker)
- Pieces must form a valid stack combination
- Carrier piece is determined by stack rules
- Carried pieces are ordered by stack slot rules

### remove()

```typescript
remove(stackPiece: T, roleToRemove: string): T | null
```

**Parameters:**

- `stackPiece`: The stack to remove from
- `roleToRemove`: Role name to remove (lowercase, e.g., 'infantry')

**Returns:**

- Remaining piece/stack after removal, or
- `null` if no pieces remain

**Notes:**

- Automatically recombines remaining pieces if possible
- Returns single piece if only one remains
- Role name is case-insensitive

## Best Practices

### 1. Create Singleton Instances

Create one stacker instance per piece type and reuse it:

```typescript
// ✅ Good - singleton instance
const pieceStacker = new PieceStacker<Piece>(getRoleFlag);

export function combine(pieces: Piece[]) {
  return pieceStacker.combine(pieces);
}

// ❌ Bad - creating new instance each time
export function combine(pieces: Piece[]) {
  const stacker = new PieceStacker<Piece>(getRoleFlag);
  return stacker.combine(pieces);
}
```

### 2. Validate Color Consistency

PieceStacker doesn't validate piece colors - do this in your wrapper:

```typescript
export function createCombinedPiece(piece1: Piece, piece2: Piece): Piece | null {
  // Validate same color
  if (piece1.color !== piece2.color) {
    throw new Error('Cannot combine pieces of different colors');
  }

  return pieceStacker.combine([piece1, piece2]);
}
```

### 3. Handle Errors Gracefully

```typescript
export function tryCombinePieces(orig: Piece, dest: Piece): Piece | undefined {
  try {
    const combined = pieceStacker.combine([orig, dest]);
    return combined ?? undefined;
  } catch (error) {
    console.error('Error combining pieces:', error);
    return undefined;
  }
}
```

### 4. Export Utility Functions

Wrap PieceStacker methods in domain-specific utility functions:

```typescript
// Export high-level API, hide implementation details
export function createCombinedPiece(from: Piece, to: Piece): Piece | null;
export function removePieceFromStack(stack: Piece, role: string): Piece | null;
export function createCombineStackFromPieces(pieces: Piece[]): {
  combined?: Piece;
  uncombined?: Piece[];
};
```

## Troubleshooting

### Issue: combine() returns null

**Causes:**

1. Invalid piece combination (not in predefined stacks)
2. Duplicate pieces in array
3. More than 4 pieces
4. Role flag extraction returning 0 or wrong values

**Solutions:**

- Check role mapping is correct
- Verify pieces form valid stack (Tank+Infantry, etc.)
- Ensure no duplicate roles in array
- Test role flag extraction function

### Issue: remove() not working

**Causes:**

1. Role name doesn't match piece role
2. Case sensitivity issues
3. Piece not in stack

**Solutions:**

- Use exact role names (lowercase: 'infantry', 'tank')
- Check piece.role or piece.type matches roleToRemove
- Verify stack contains the piece to remove

### Issue: TypeScript errors

**Causes:**

1. Piece type doesn't have `carrying` property
2. Role extraction function type mismatch

**Solutions:**

- Ensure piece type has `carrying?: T[]` property
- Match function signature: `(piece: T) => number`
- Use type assertions if needed for custom formats

## Testing Your Integration

### Unit Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { createCombinedPiece, removePieceFromStack } from './your-utils';

describe('PieceStacker Integration', () => {
  it('should combine two pieces', () => {
    const tank = { color: 'r', type: 't' };
    const infantry = { color: 'r', type: 'i' };

    const result = createCombinedPiece(tank, infantry);

    expect(result).toBeDefined();
    expect(result?.type).toBe('t'); // Tank is carrier
    expect(result?.carrying).toHaveLength(1);
    expect(result?.carrying?.[0].type).toBe('i');
  });

  it('should remove piece from stack', () => {
    const stack = {
      color: 'r',
      type: 't',
      carrying: [{ color: 'r', type: 'i' }]
    };

    const result = removePieceFromStack(stack, 'infantry');

    expect(result).toBeDefined();
    expect(result?.type).toBe('t');
    expect(result?.carrying).toBeUndefined();
  });

  it('should return null for invalid combination', () => {
    const commander = { color: 'r', type: 'c' };
    const infantry = { color: 'r', type: 'i' };

    const result = createCombinedPiece(commander, infantry);

    expect(result).toBeNull();
  });
});
```

## Migration Checklist

- [ ] Import `PieceStacker` and `ROLE_FLAGS`
- [ ] Create role-to-flag mapping for your piece type
- [ ] Create PieceStacker instance with role extractor
- [ ] Wrap combine() in utility function
- [ ] Wrap remove() in utility function
- [ ] Add color validation if needed
- [ ] Add error handling
- [ ] Write unit tests
- [ ] Update existing code to use new utilities
- [ ] Verify all tests pass
- [ ] Update documentation

## Support

For issues or questions:

1. Check predefined stacks in `src/predefined-stacks.ts`
2. Review test files in `__tests__/` for examples
3. Verify role mapping matches `ROLE_FLAGS`
4. Ensure piece type has `carrying?: T[]` property
