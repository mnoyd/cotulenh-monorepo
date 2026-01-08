# Theme System Migration Guide

This guide documents the new comprehensive theme system and how to migrate from the old CSS-based theme system.

## Overview

The new theme system provides:

- **Centralized theme configuration** - All theme data in one place per theme
- **Dynamic CSS generation** - No manual CSS maintenance
- **Asset management** - Lazy-loaded piece and board assets
- **Theme effects** - Configurable board effects (radar, particles, etc.)
- **Type safety** - Full TypeScript support

## Folder Structure

```
apps/cotulenh/app/src/lib/themes/
├── index.ts                    # Main exports and initialization
├── types.ts                    # Type definitions
├── registry.ts                 # Theme registry
├── css-generator.ts            # Dynamic CSS generation
├── asset-loader.ts             # Asset loading and caching
└── themes/
    ├── modern-warfare/
    │   └── index.ts           # Theme configuration
    ├── classic/
    │   └── index.ts
    └── forest/
        └── index.ts

packages/cotulenh/board/src/theme/
├── index.ts                    # Board theme exports
└── board-renderer.ts           # Board theme rendering with canvas effects

apps/cotulenh/app/src/themes/   # Static theme assets (to be created)
├── modern-warfare/
│   ├── board-grid.svg
│   ├── background.jpg
│   └── pieces/
│       ├── blue/
│       ├── red/
│       └── heroic-star.svg
├── classic/
│   └── ...
└── forest/
    └── ...
```

## Migration Steps

### Step 1: Replace Theme Store Import

**Before:**

```ts
import { themeStore } from '$lib/stores/theme.svelte';
```

**After:**

```ts
import { themeStore } from '$lib/stores/theme.svelte.v2';
// Or import directly
import { themeStore } from '$lib/themes'; // Coming soon
```

### Step 2: Update Theme Initialization

**Before (in +layout.svelte):**

```svelte
<script>
  import { themeStore } from '$lib/stores/theme.svelte';

  $effect(() => {
    if (browser) {
      themeStore.init();
    }
  });
</script>
```

**After:**

```svelte
<script>
  import { themeStore } from '$lib/stores/theme.svelte.v2';
  // No manual init needed - auto-initializes on import
</script>
```

### Step 3: Remove Static CSS Imports

**Before:**

```svelte
<script>
  import '$lib/styles/themes/modern-warfare.css';
  import '$lib/styles/themes/classic.css';
  import '$lib/styles/themes/forest.css';
</script>
```

**After:**

```svelte
<!-- No imports needed - CSS is generated dynamically -->
```

### Step 4: Update Theme Reference (if accessing theme data directly)

**Before:**

```ts
// Accessing CSS variables
const color = getComputedStyle(element).getPropertyValue('--theme-primary');
```

**After:**

```ts
import { getTheme } from '$lib/themes';

const theme = getTheme('modern-warfare');
const color = theme?.colors.primary.base;
```

## Asset Migration

The new system requires piece assets to be separate SVG files. Currently, pieces are embedded as base64 in `commander-chess.pieces.css`.

### To Extract Piece SVGs:

1. Run the extraction script (to be created):

   ```bash
   npm run extract-pieces
   ```

2. This will create SVG files in `static/themes/{theme-id}/pieces/`

### Theme-Specific Piece Sets

Each theme can now have its own piece set:

```
static/themes/
├── modern-warfare/
│   └── pieces/
│       ├── blue/
│       │   ├── tank.svg      # Tactical tank icon
│       │   └── infantry.svg  # Tactical soldier icon
│       └── red/
│           ├── tank.svg
│           └── infantry.svg
├── classic/
│   └── pieces/
│       ├── blue/
│       │   ├── tank.svg      # Traditional chess rook variant
│       │   └── infantry.svg  # Traditional chess pawn variant
│       └── red/
│           └── ...
```

## Adding a New Theme

1. Create theme config in `apps/cotulenh/app/src/lib/themes/themes/my-theme/index.ts`:

```ts
import type { ThemeConfig } from '../../types.js';
import { Role } from '@cotulenh/common';

export const myTheme: ThemeConfig = {
  meta: {
    id: 'my-theme',
    name: 'My Theme',
    description: 'Description',
    version: '1.0.0'
  },
  colors: {
    /* ... */
  },
  assets: {
    /* ... */
  },
  effects: {
    /* ... */
  },
  filters: {
    /* ... */
  },
  animations: {
    /* ... */
  },
  ui: {
    /* ... */
  },
  shadows: {
    /* ... */
  },
  transitions: {
    /* ... */
  }
};
```

2. Register in `apps/cotulenh/app/src/lib/themes/index.ts`:

```ts
import { myTheme } from './themes/my-theme/index.js';

export async function initThemes() {
  registerTheme(modernWarfareTheme);
  registerTheme(classicTheme);
  registerTheme(forestTheme);
  registerTheme(myTheme); // Add here
}
```

3. Add theme ID to types:

```ts
// In types.ts
export type ThemeId = 'modern-warfare' | 'classic' | 'forest' | 'my-theme';
```

## Board Effects

Themes can now define canvas-based effects like radar sweeps:

```ts
animations: {
  radar: {
    enabled: true,
    type: 'sweep', // 'sweep' | 'pulse' | 'ripple'
    color: 'rgba(0, 243, 255, 0.3)',
    speed: 4, // seconds per cycle
    opacity: 0.3
  }
}
```

## Performance Optimizations

- **Lazy loading**: Piece assets are loaded on demand
- **Caching**: Loaded assets are cached in memory
- **CSS injection**: Theme styles are injected once per session
- **Canvas effects**: Hardware-accelerated animations

## Cleanup Old Files (After Migration)

After verifying the new system works:

```bash
# Remove old theme CSS files
rm apps/cotulenh/app/src/lib/styles/themes/*.css
rm apps/cotulenh/app/src/lib/styles/themes/index.css

# Remove old theme store (after updating imports)
rm apps/cotulenh/app/src/lib/stores/theme.svelte.ts
mv apps/cotulenh/app/src/lib/stores/theme.svelte.v2.ts \
   apps/cotulenh/app/src/lib/stores/theme.svelte.ts
```

## Troubleshooting

### Theme not applying

- Check browser console for errors
- Verify theme is registered in `initThemes()`
- Check theme ID matches in `ThemeId` type

### Pieces not loading

- Verify asset paths in theme config
- Check static folder structure
- Look for 404 errors in network tab

### CSS variables not working

- Clear old CSS imports
- Check that theme class is applied to `document.documentElement`
- Verify CSS injection happened

## TODO

- [ ] Extract embedded piece SVGs to separate files
- [ ] Create piece assets for classic theme (traditional chess style)
- [ ] Create piece assets for forest theme (military style)
- [ ] Add theme transition animations
- [ ] Implement theme preview images
- [ ] Add theme editor/creator UI
