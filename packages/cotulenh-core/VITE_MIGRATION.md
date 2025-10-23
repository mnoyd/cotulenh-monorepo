# Vite Build Migration

Successfully migrated from TypeScript compiler (`tsc`) to Vite for building the
package.

## Changes Made

### 1. Build Configuration

- **Created** `vite.config.ts` with library mode configuration
- Configured to build both ES modules (`cotulenh.js`) and CommonJS
  (`cotulenh.cjs`)
- Added `vite-plugin-dts` for TypeScript declaration generation

### 2. Package.json Updates

- **Changed build script** from `tsc -b` to `vite build`
- **Added dependencies**: `vite@^5.4.11`, `vite-plugin-dts@^4.3.0`
- **Simplified exports**:
  - `main`: `./dist/cotulenh.cjs` (was `./dist/cjs/src/cotulenh.js`)
  - `module`: `./dist/cotulenh.js` (was `./dist/esm/src/cotulenh.js`)
  - `types`: `./dist/cotulenh.d.ts` (was `./dist/types/src/cotulenh.d.ts`)
- **Added** `files` field to specify distributed files

### 3. TypeScript Configuration

- **Removed** `tsconfig.cjs.json`, `tsconfig.esm.json`, `tsconfig.types.json`
- **Simplified** `tsconfig.json` for IDE/type-checking only
- **Added** `noEmit: true` to prevent tsc from generating output

### 4. Source Code Fixes

- **Fixed** type export in `cotulenh.ts`:
  - Changed `export { DeployMoveRequest, DeployMove }` to separate type and
    value exports
  - `export type { DeployMoveRequest }` for the interface
  - `export { DeployMove }` for the class

## Benefits

### Cleaner Output Structure

**Before:**

```
dist/
  cjs/src/cotulenh.js
  esm/src/cotulenh.js
  types/src/cotulenh.d.ts
```

**After:**

```
dist/
  cotulenh.cjs
  cotulenh.js
  cotulenh.d.ts
```

### Improved Build Performance

- Single bundled output instead of per-file compilation
- Tree-shaking and dead code elimination
- Faster builds with Vite's optimized bundler

### Better Module Resolution

- No more confusion between CJS/ESM directory structures
- Simpler import paths
- Rollup-powered bundling with optimized output

## Test Results

✅ All previously passing tests still pass (227/234 tests) ✅ Same 7
pre-existing test failures in `recombine-moves.test.ts` ✅ Build completes
successfully in ~1.4s

## Usage

```bash
# Build the library
pnpm build

# Clean dist folder
pnpm clean

# Run tests
pnpm test
```
