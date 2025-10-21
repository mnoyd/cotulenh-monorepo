# Cotulenh Combine Piece

High-performance piece stacking system for the Cotulenh game using bitboard optimization.

## Overview

This package provides a fast, reliable system for combining game pieces according to predefined rules. It uses pre-calculated bitboard lookups for O(1) performance and human-readable YAML configuration for easy rule management.

## API

### Main Interface

```typescript
import { PieceStacker, ROLE_FLAGS } from '@repo/cotulenh-combine-piece';

// Combine pieces into a stack
const stack = PieceStacker.combine([navyPiece, airForcePiece, commanderPiece]);

// Remove a piece from a stack
const remaining = PieceStacker.remove(stack, 'AIR_FORCE');
```

### Piece Interface

```typescript
interface Piece {
  color: string; // 'red', 'blue', etc.
  role: string; // 'NAVY', 'TANK', 'COMMANDER', etc.
  heroic: boolean; // Special piece property
  carrying?: Piece[]; // Nested pieces (auto-managed)
}
```

## How It Works

### 1. Blueprint System

The stacking rules are defined in `blueprints.yaml`:

```yaml
blueprints:
  NAVY:
    - [AIR_FORCE] # Slot 1: Air Force only
    - [COMMANDER, INFANTRY, MILITIA, TANK] # Slot 2: Humanlike or Tank

  TANK:
    - [COMMANDER, INFANTRY, MILITIA] # Slot 1: Humanlike only
```

### 2. Pre-calculation Process

1. **YAML → Numbers**: Blueprint parser converts role names to bit flags
2. **Generate Combinations**: Algorithm creates all valid piece combinations
3. **Bitboard Encoding**: Each combination encoded as a 64-bit number
4. **TypeScript Output**: Generated as `src/predefined-stacks.ts`

### 3. Runtime Performance

- **O(1) Lookup**: Role mask → pre-calculated state
- **Bitboard Operations**: Fast slot assignments and queries
- **Zero Validation**: All invalid combinations pre-filtered

## Editing Rules

### ⚠️ IMPORTANT: Only Edit `blueprints.yaml`

**DO NOT EDIT:**

- `src/predefined-stacks.ts` (auto-generated)
- `helpers/generate-stacks.ts` (core algorithm)

**ONLY EDIT:**

- `blueprints.yaml` (stacking rules)

### Making Changes

1. **Edit blueprints.yaml**

   ```yaml
   blueprints:
     TANK:
       - [COMMANDER, INFANTRY] # Remove MILITIA from tank
   ```

2. **Regenerate stacks**

   ```bash
   pnpm build:stacks
   ```

3. **Build the package**

   ```bash
   pnpm build
   ```

4. **Test your changes**
   ```bash
   pnpm test
   ```

## Build System

### Commands

```bash
# Build everything (auto-generates stacks first)
pnpm build

# Manually regenerate stacks from YAML
pnpm build:stacks

# Force regenerate (even if YAML unchanged)
pnpm build:stacks --force

# Development mode (watch for changes)
pnpm dev

# Run tests
pnpm test
```

### Build Process

```
blueprints.yaml
     ↓ (parse role names → numbers)
helpers/build-stacks.ts
     ↓ (generate all combinations)
helpers/generate-stacks.ts
     ↓ (encode as bitboards)
src/predefined-stacks.ts
     ↓ (import into main code)
src/index.ts
     ↓ (compile with Vite)
dist/index.js + dist/index.cjs
```

### Auto-Generation

The build system automatically:

- **Detects changes**: Compares YAML vs generated file timestamps
- **Regenerates when needed**: Only rebuilds if YAML is newer
- **Validates output**: Ensures all combinations are valid
- **Optimizes for size**: Sorts and compresses the output

## Role Definitions

Roles are defined in `src/index.ts` as bit flags:

```typescript
export const ROLE_FLAGS = {
  COMMANDER: 1, // 0000000001
  INFANTRY: 2, // 0000000010
  MILITIA: 4, // 0000000100
  ARTILLERY: 8, // 0000001000
  ANTI_AIR: 16, // 0000010000
  MISSILE: 32, // 0000100000
  TANK: 64, // 0001000000
  AIR_FORCE: 128, // 0010000000
  ENGINEER: 256, // 0100000000
  NAVY: 512, // 1000000000
  HEADQUARTER: 1024 // 10000000000
} as const;
```

**Note**: These values are fixed and should not be changed as they would break existing save files and game state.

## Blueprint Rules

### Slot System

Each carrier has numbered slots that determine stacking order:

- **Slot 0**: Always the carrier piece
- **Slot 1**: First carried piece
- **Slot 2**: Second carried piece
- **Slot 3**: Third carried piece

### Rule Format

```yaml
CARRIER_NAME:
  - [ALLOWED_ROLES_FOR_SLOT_1]
  - [ALLOWED_ROLES_FOR_SLOT_2]
  - [ALLOWED_ROLES_FOR_SLOT_3]
```

### Examples

```yaml
# Navy can carry air force in slot 1, humanlike/tank in slot 2
NAVY:
  - [AIR_FORCE]
  - [COMMANDER, INFANTRY, MILITIA, TANK]

# Tank can only carry humanlike in slot 1
TANK:
  - [COMMANDER, INFANTRY, MILITIA]

# Engineer can only carry heavy equipment in slot 1
ENGINEER:
  - [ARTILLERY, ANTI_AIR, MISSILE]
```

## Troubleshooting

### Build Errors

**"Blueprint YAML file not found"**

- Ensure `blueprints.yaml` exists in the root directory

**"Unknown carrier role: X"**

- Check that the carrier name matches a role in `ROLE_FLAGS`
- Role names are case-sensitive

**"Unknown role: Y"**

- Check that all role names in the blueprint exist in `ROLE_FLAGS`

### Test Failures

**"Invalid combination"**

- The blueprint rules may be too restrictive
- Check that the test pieces match the YAML rules

**"Wrong slot assignment"**

- Pieces fill slots in order based on blueprint definition
- First available compatible slot is used

### Performance Issues

**Slow startup**

- Run `pnpm build:stacks` to ensure pre-calculated stacks are up to date
- Check that `src/predefined-stacks.ts` exists and is recent

## Development

### Adding New Rules

1. Edit `blueprints.yaml` with new stacking rules
2. Run `pnpm build:stacks` to regenerate
3. **Update integration tests** in `__tests__/integration.test.ts` to match new rules
4. Run `pnpm test` to verify

### Debugging

Use the debug utilities:

```typescript
import { DebugUtils } from '@repo/cotulenh-combine-piece';

// Convert role mask to readable string
DebugUtils.roleMaskToString(mask);

// Visualize blueprint
DebugUtils.visualizeBlueprint(ROLE_FLAGS.NAVY);

// Detailed validation
DebugUtils.validateStackDetailed(carrier, carried);
```

## Test Structure

### Test Organization

- **`__tests__/core.test.ts`**: Tests the StackEngine core logic with numbers only
- **`__tests__/wrapper.test.ts`**: Tests the PieceStacker wrapper functionality
- **`__tests__/integration.test.ts`**: Full system tests using current blueprint configuration
- **`__tests__/generate-stacks.test.ts`**: Tests the stack generation system

### Important: Blueprint Dependencies

⚠️ **When `blueprints.yaml` is edited, `__tests__/integration.test.ts` must be updated accordingly.**

The integration tests verify that the system works with the current blueprint rules. If you change stacking rules in the YAML, you must update the corresponding test expectations.

## Migration from Legacy System

See `MIGRATION_PLAN.md` for detailed migration instructions from the old `CombinePieceFactory` system to the new `PieceStacker` API.

## Performance

- **Lookup Speed**: O(1) constant time for all operations
- **Memory Usage**: ~96% reduction vs object-based system
- **Build Time**: Sub-second regeneration of all combinations
- **Bundle Size**: Minimal impact on final bundle

## License

Part of the Cotulenh game system.
