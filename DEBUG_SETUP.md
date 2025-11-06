# Seamless Debugging Across Monorepo Packages

This monorepo is configured for **source-level debugging** with no build steps required in development mode. You can set breakpoints in any package and debug seamlessly across `cotulenh-core`, `cotulenh-board`, and `cotulenh-app`.

## How It Works

### 1. **Direct Source Resolution** (No Build Required)

The Vite configuration in `apps/cotulenh-app/vite.config.ts` resolves workspace packages directly to their TypeScript source files:

```typescript
resolve: {
  alias: {
    '@repo/cotulenh-core': '../../packages/cotulenh-core/src/cotulenh.ts',
    '@repo/cotulenh-board': '../../packages/cotulenh-board/src/index.ts',
    '@repo/cotulenh-combine-piece': '../../packages/cotulenh-combine-piece/src/index.ts',
  },
}
```

This means:

- ✅ **No build step** needed for package changes
- ✅ **Instant reload** when you edit any package
- ✅ **Breakpoints work** in all source files
- ✅ **Stack traces** show original source locations

### 2. **Source Maps Enabled Everywhere**

All TypeScript configurations have `sourceMap: true` and `declarationMap: true` enabled for comprehensive debugging support.

### 3. **VS Code Debug Configurations**

Two debug configurations are provided in `.vscode/launch.json`:

#### **Debug SvelteKit App (Server + Client)** - Recommended

- Debugs both server-side and client-side code
- Automatically enables source maps with `NODE_OPTIONS`
- Works with breakpoints in VS Code

#### **Debug SvelteKit (Chrome)**

- Browser-based debugging
- Maps source files correctly across packages
- Open Chrome DevTools for client-side debugging

## Usage

### Development Mode (No Build)

1. **Start the dev server:**

   ```bash
   pnpm dev
   # or from app folder
   cd apps/cotulenh-app && npm run dev
   ```

2. **Set breakpoints** anywhere:

   - `packages/cotulenh-core/src/**/*.ts`
   - `packages/cotulenh-board/src/**/*.ts`
   - `apps/cotulenh-app/src/**/*.svelte` or `.ts`

3. **Start debugging** (choose one method):

   **Method A: VS Code Debugger (Recommended)**

   - Press `F5` or click "Run and Debug"
   - Select "Debug SvelteKit App (Server + Client)"
   - Breakpoints will work across all packages

   **Method B: Chrome DevTools**

   - Start dev server: `pnpm dev`
   - Open http://localhost:5173
   - Open Chrome DevTools (F12)
   - Navigate to Sources tab
   - Find your source files under `/@fs/` or `/@repo/`
   - Set breakpoints directly in Chrome

   **Method C: VS Code Chrome Debugger**

   - First, start dev server: `pnpm dev`
   - Then press `F5` and select "Debug SvelteKit (Chrome)"
   - Debugs in Chrome while controlling from VS Code

### Debugging Tips

#### Setting Breakpoints in Packages

```typescript
// packages/cotulenh-core/src/cotulenh.ts
export class CoTuLenh {
  move(move: string | any): any {
    debugger; // ✅ This will pause execution
    // or use VS Code breakpoints
  }
}
```

#### Inspecting Call Stack

When you hit a breakpoint, you'll see the full call stack across packages:

```
1. cotulenh-app/src/routes/+page.svelte:100
2. cotulenh-board/src/api.ts:45
3. cotulenh-core/src/cotulenh.ts:123
```

#### Hot Module Reload

Changes to any package will instantly reload:

- Edit `packages/cotulenh-core/src/move-apply.ts`
- Save file
- Browser/app automatically reloads with changes
- No build step required! ⚡

### Browser DevTools Source Mapping

When debugging in Chrome, source files appear under:

- `/@fs/home/noy/work/chess/cotulenh-monorepo/packages/...` - Your actual source files
- `/@repo/cotulenh-core/...` - Aliased package imports

Both map to the same TypeScript source files!

## Architecture Benefits

### For Development

- **Zero build lag** - Edit and see changes instantly
- **True source debugging** - No mapping confusion
- **Full type safety** - TypeScript across all packages
- **Call stack clarity** - See exact source locations

### For Production

Build process still generates:

- Optimized bundles with source maps
- Type declarations (`.d.ts`)
- Declaration maps (`.d.ts.map`)
- Compatible with all debugging tools

## Troubleshooting

### Breakpoints Not Working?

1. **Ensure dev server is running:**

   ```bash
   pnpm dev
   ```

2. **Check VS Code is using workspace TypeScript:**

   - Open any `.ts` file
   - Look at bottom right: "TypeScript 5.x.x"
   - If it says different version, click and select "Use Workspace Version"

3. **Restart VS Code debugger:**
   - Stop debugging (Shift+F5)
   - Restart (F5)

### Source Maps Not Loading?

1. **Clear Vite cache:**

   ```bash
   cd apps/cotulenh-app
   rm -rf node_modules/.vite
   npm run dev
   ```

2. **Verify source map settings in browser:**
   - Chrome DevTools → Settings → Enable source maps
   - Chrome DevTools → Settings → Enable JavaScript source maps

### Changes Not Reflecting?

1. **Check file is saved** (Auto-save recommended)
2. **Verify Vite detected the change** (check terminal output)
3. **Hard reload browser:** Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)

## Configuration Files

### Modified Files

- ✅ `apps/cotulenh-app/vite.config.ts` - Source resolution + source maps
- ✅ `packages/cotulenh-core/vite.config.ts` - Source map generation
- ✅ `packages/cotulenh-core/tsconfig.json` - Composite project
- ✅ `.vscode/launch.json` - Debug configurations
- ✅ `.vscode/settings.json` - TypeScript + debugging settings

### Key Settings

```typescript
// Vite: Direct source resolution
resolve: {
  alias: {
    '@repo/cotulenh-core': 'path/to/src/cotulenh.ts'
  }
}

// Vite: Exclude from pre-bundling
optimizeDeps: {
  exclude: ['@repo/cotulenh-core', '@repo/cotulenh-board']
}

// TypeScript: Enable composite + source maps
{
  "composite": true,
  "sourceMap": true,
  "declarationMap": true
}
```

## Performance Notes

### Development Mode

- **First load:** Slightly slower (~1-2s) as Vite processes source files
- **Hot reload:** Instant! Only changed modules are updated
- **Memory usage:** Similar to normal dev mode
- **Debugging overhead:** Negligible

### Build Mode

- No performance impact
- Still generates optimized bundles
- Source maps included for production debugging

## Summary

✅ **Set breakpoints anywhere** in the monorepo  
✅ **No build steps** in development mode  
✅ **Instant hot reload** across all packages  
✅ **Full TypeScript support** with composite projects  
✅ **Browser + VS Code debugging** both work seamlessly  
✅ **Production builds** unaffected

Happy debugging! 🐛🔍
