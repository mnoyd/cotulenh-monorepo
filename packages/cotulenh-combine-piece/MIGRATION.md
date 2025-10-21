# Migration Guide: Role Mapping System

This guide helps you migrate from the old PieceStacker constructor to the new flexible role mapping system.

## What Changed

We've added a flexible role mapping system that allows you to use custom role names while maintaining backward compatibility.

## Migration Options

### Option 1: Keep Existing Code (Backward Compatible)

Your existing code continues to work unchanged:

```typescript
// OLD WAY - Still works!
const stacker = new PieceStacker<TestPiece>((piece: TestPiece) => {
  const roleKey = piece.role.toUpperCase() as keyof typeof ROLE_FLAGS;
  return ROLE_FLAGS[roleKey] || 0;
});
```

### Option 2: Migrate to New Role Mapping System

#### For Standard Role Names (TANK, INFANTRY, etc.)

```typescript
// OLD WAY
const stacker = new PieceStacker<TestPiece>((piece: TestPiece) => {
  const roleKey = piece.role.toUpperCase() as keyof typeof ROLE_FLAGS;
  return ROLE_FLAGS[roleKey] || 0;
});

// NEW WAY - Cleaner
import { DEFAULT_ROLE_MAPPING } from './src/index.js';

const stacker = PieceStacker.withRoleMapping<TestPiece>(
  (piece: TestPiece) => piece.role,
  DEFAULT_ROLE_MAPPING
);
```

#### For Custom Role Names

```typescript
// Your custom piece type
interface MyPiece {
  role: string; // "t", "i", "n", etc.
  color: string;
  heroic: boolean;
  carrying?: MyPiece[];
}

// Define your custom role mapping
const myRoleMapping = {
  t: 'TANK', // Your "t" maps to our TANK
  i: 'INFANTRY', // Your "i" maps to our INFANTRY
  n: 'NAVY', // Your "n" maps to our NAVY
  a: 'AIR_FORCE', // Your "a" maps to our AIR_FORCE
  c: 'COMMANDER', // Your "c" maps to our COMMANDER
  e: 'ENGINEER', // Your "e" maps to our ENGINEER
  m: 'MILITIA', // Your "m" maps to our MILITIA
  art: 'ARTILLERY', // Your "art" maps to our ARTILLERY
  aa: 'ANTI_AIR', // Your "aa" maps to our ANTI_AIR
  mis: 'MISSILE', // Your "mis" maps to our MISSILE
  hq: 'HEADQUARTER' // Your "hq" maps to our HEADQUARTER
} as const; // Add 'as const' for TypeScript type safety

// Create stacker with custom mapping
const stacker = PieceStacker.withRoleMapping<MyPiece>(
  (piece: MyPiece) => piece.role, // Extract role string from your piece
  myRoleMapping // Your role mapping
);

// Use with your custom pieces
const tank: MyPiece = { role: 't', color: 'r', heroic: false };
const infantry: MyPiece = { role: 'i', color: 'r', heroic: false };

const result = stacker.combine([tank, infantry]);
// Result keeps your original role names: { role: "t", carrying: [{ role: "i" }] }
```

## Benefits of Migration

1. **Cleaner Code**: Less boilerplate for standard roles
2. **Custom Role Names**: Use any role names you want ("t", "tank", "Tank", etc.)
3. **Type Safety**: Better TypeScript support
4. **Flexibility**: Easy to switch between different naming conventions

## Available Role Mappings

### Standard Roles (DEFAULT_ROLE_MAPPING)

- COMMANDER → COMMANDER
- INFANTRY → INFANTRY
- MILITIA → MILITIA
- ARTILLERY → ARTILLERY
- ANTI_AIR → ANTI_AIR
- MISSILE → MISSILE
- TANK → TANK
- AIR_FORCE → AIR_FORCE
- ENGINEER → ENGINEER
- NAVY → NAVY
- HEADQUARTER → HEADQUARTER

### Example Custom Mappings

```typescript
// Short names
const shortMapping = {
  c: 'COMMANDER',
  i: 'INFANTRY',
  t: 'TANK',
  n: 'NAVY'
} as const;

// Mixed case
const mixedMapping = {
  Commander: 'COMMANDER',
  Infantry: 'INFANTRY',
  Tank: 'TANK'
} as const;

// Alternative names
const altMapping = {
  leader: 'COMMANDER',
  soldier: 'INFANTRY',
  vehicle: 'TANK',
  ship: 'NAVY'
} as const;
```

## TypeScript Tips

- Always add `as const` to your role mapping objects for proper type safety
- This ensures TypeScript recognizes the string literals as the specific ROLE_FLAGS keys

## Migration Checklist

- [ ] Identify your current role naming convention
- [ ] Choose migration option (keep old way or use new system)
- [ ] If using custom names, create your role mapping
- [ ] Update PieceStacker initialization
- [ ] Test that stacking behavior remains the same
- [ ] Update any related tests

## Need Help?

The new system is fully backward compatible, so you can migrate at your own pace. Start with the new system for new code and migrate existing code when convenient.
