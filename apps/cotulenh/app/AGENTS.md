# Agents Guide - Cotulenh App

## Essential Commands

### Development

```bash
pnpm run dev              # Start development server
pnpm run dev:debug        # Start with debugging enabled
```

### Type Checking & Linting

```bash
pnpm run check            # Type check with svelte-check
pnpm run check:watch      # Type check in watch mode
pnpm run lint             # Run ESLint
```

### Testing

```bash
pnpm run test             # Run all tests
pnpm run test:watch       # Run tests in watch mode
```

### Building

```bash
pnpm run build            # Production build
pnpm run preview          # Preview production build
```

## Code Quality Standards

### Type Safety

- **Strict TypeScript** is enabled (`strict: true` in tsconfig.json)
- **No type suppressions**: Avoid `@ts-ignore`, `@ts-expect-error`, or `as any`
- **Use type guards**: Import from `$lib/types/type-guards` instead of unsafe casting
- **Proper typing**: Prefer explicit interfaces over inline types

### Error Handling

- All async operations should have try-catch blocks
- User-facing errors should use toast notifications from `svelte-sonner`
- Internal errors should use the logger from `@cotulenh/common`
- Critical components are wrapped in ErrorBoundary

### Testing

- Tests use Vitest with jsdom environment
- Test files: `*.test.ts` or `*.spec.ts`
- Test critical utilities and type guards
- Target: Increase test coverage from current baseline

### State Management

- Use the reactive GameSession class from `$lib/game-session.svelte.ts`
- **Do NOT** manually manipulate board state
- Trust FEN-based reactive updates
- All state changes flow through the game engine

## Architecture Patterns

### Reactive State Pattern

The app uses a "Reactive Adapter Pattern" via the GameSession class:

1. Game engine is the single source of truth
2. Version counter triggers reactivity (`#version`)
3. Derived getters auto-track dependencies
4. Board syncs automatically via `$effect`

### Component Structure

```
src/
├── lib/
│   ├── components/      # Reusable UI components
│   ├── features/        # Feature-specific logic
│   ├── stores/          # Svelte stores
│   ├── types/           # TypeScript types and guards
│   └── game-session.svelte.ts  # Main state manager
└── routes/              # SvelteKit routes
```

### Type Guards

Always use type guards from `$lib/types/type-guards.ts`:

- `isPieceSymbol()` - Validate piece symbols
- `isRole()` - Validate piece roles
- `hasExtendedGameMethods()` - Check for game methods
- `isObject()` - Validate plain objects

## Common Issues

### State Management

❌ **Don't do this:**

```typescript
boardApi.state.deploySession = undefined; // Manual mutation
```

✅ **Do this:**

```typescript
session.cancelDeploy(); // Let GameSession handle it
```

### Type Assertions

❌ **Don't do this:**

```typescript
const game = instance as unknown as ExtendedGame;
```

✅ **Do this:**

```typescript
import { hasExtendedGameMethods } from '$lib/types/type-guards';
if (hasExtendedGameMethods(instance)) {
  // TypeScript now knows instance has the methods
}
```

## Dependencies

### Workspace Packages

- `@cotulenh/core` - Game engine
- `@cotulenh/board` - Chess board component
- `@cotulenh/common` - Shared utilities and logger
- `@cotulenh/combine-piece` - Piece combination logic

### Key Libraries

- **SvelteKit 2** - Framework
- **Svelte 5** - Reactive UI with runes
- **TypeScript** - Type safety
- **Vitest** - Testing
- **Tailwind CSS 4** - Styling
- **svelte-sonner** - Toast notifications

## Best Practices

1. **Before making changes**: Run `pnpm run check` to ensure no type errors
2. **After making changes**: Run `pnpm run check && pnpm run test && pnpm run build`
3. **Error handling**: Always wrap async operations in try-catch
4. **Logging**: Use `logger` from `@cotulenh/common`, not `console.log`
5. **Type safety**: Add type guards for runtime validation
6. **Testing**: Add tests for new utilities and critical logic

## Recent Improvements (Jan 2026)

### Type Safety Enhancements

- Added `hasExtendedGameMethods()` type guard
- Removed unsafe `as unknown as` casts
- Improved runtime type validation

### Error Handling

- Added ErrorBoundary component
- Enhanced error handling in GameSession methods
- User-friendly error messages via toast

### Testing Infrastructure

- Set up Vitest with jsdom
- Added test scripts to package.json
- Created test suites for type guards and helpers
- **All tests passing** ✅ (20/20)

### Performance Optimizations

- Added memoization for expensive `possibleMoves` computation
- Extracted helper functions to separate module for better tree-shaking
- Fixed Svelte 5 reactivity warnings by moving logRender to $effect

### Code Quality

- Created `persisted.svelte.ts` utility for DRY localStorage handling
- Refactored GameControls to use centralized storage utilities
- Extracted helpers from GameSession into `game-session-helpers.ts`
- Improved code organization and modularity

### Build System

- Type check: ✅ 0 errors, 0 warnings
- Tests: ✅ 20/20 passing
- Build: ✅ Successful

## Utilities

### Persisted State

Use the `persisted` utility for reactive localStorage:

```typescript
import { persisted } from '$lib/stores/persisted.svelte';

// Reactive state that auto-saves
const theme = persisted('theme', 'dark');
console.log(theme.value); // Read
theme.value = 'light'; // Write (auto-saves)
theme.clear(); // Reset to default
```

For one-time reads/writes without reactivity:

```typescript
import { getStoredValue, setStoredValue } from '$lib/stores/persisted.svelte';

const data = getStoredValue('key', defaultValue);
setStoredValue('key', newValue);
```
