# CSS Performance Architecture

## Overview

The CoTuLenh application implements a **performance tier system** to ensure optimal CPU/GPU usage across different devices. This document explains the CSS import hierarchy and how performance tiers are enforced.

## Performance Tiers

The system supports four performance levels controlled via `data-performance` attribute on `<html>`:

- **`off`**: No animations, no transitions, minimal GPU compositing
- **`low`**: Static visuals only, no animations, basic shadows only
- **`medium`**: Smooth opacity animations, optimized filters, selective `will-change`
- **`high`**: Full animations, radar effects, all visual enhancements

## CSS Import Hierarchy

**Critical: Order matters!** Later imports can override earlier ones.

```
1. tailwindcss (app.css)
2. /themes/base.css (CSS variables)
3. @cotulenh/board/assets/commander-chess.base.css (layout + base animations)
4. @cotulenh/board/assets/commander-chess.pieces.css (piece sprites)
5. $lib/styles/board.css (theme-specific overrides + performance guards)
```

### Import Locations

- **+layout.svelte**: Imports `app.css` and `commander-chess.pieces.css` (global)
- **+page.svelte**: Imports `$lib/styles/board.css` (route-specific)
- **BoardContainer.svelte**: Dynamically imports `commander-chess.base.css` on mount

## Critical Rules

### 1. Animations MUST be guarded by performance tier

**❌ WRONG (unconditional animation):**

```css
cg-board square.recombine-available {
  animation: recombine-pulse 2s ease-in-out infinite;
}
```

**✅ CORRECT (performance-tier guarded):**

```css
/* Base: no animation */
cg-board square.recombine-available {
  background: radial-gradient(...);
}

/* Enable only for medium/high */
[data-performance='medium'] cg-board square.recombine-available,
[data-performance='high'] cg-board square.recombine-available {
  animation: recombine-pulse 2s ease-in-out infinite;
}

/* Force disable for off/low */
[data-performance='off'] cg-board square.recombine-available,
[data-performance='low'] cg-board square.recombine-available {
  animation: none !important;
}
```

### 2. `will-change` MUST be selective

**❌ WRONG (unconditional GPU layer):**

```css
piece {
  will-change: transform;
}
```

**✅ CORRECT (only during interaction + tier-guarded):**

```css
/* Base: no will-change */
piece {
  position: absolute;
}

/* Only on hover/drag for medium/high */
[data-performance='medium'] piece:hover,
[data-performance='high'] piece:hover {
  will-change: transform;
}
```

### 3. Transitions MUST be optional

**❌ WRONG:**

```css
piece {
  transition: transform 0.2s;
}
```

**✅ CORRECT:**

```css
piece {
  /* No transition by default */
}

[data-performance='medium'] piece,
[data-performance='high'] piece {
  transition: transform 0.2s;
}

[data-performance='off'] piece,
[data-performance='low'] piece {
  transition: none !important;
}
```

### 4. Box-shadows are expensive

**Global disable for off/low tiers (in board.css):**

```css
[data-performance='off'] *,
[data-performance='low'] * {
  box-shadow: none !important;
}
```

## Files Modified to Fix CPU Issue

### 1. `packages/cotulenh/board/assets/commander-chess.base.css`

**Problems Fixed:**

- ❌ Unconditional `will-change: transform` on all pieces → Creates constant GPU layers
- ❌ Unconditional `animation: pulse 1.5s infinite` on ambiguous stacks
- ❌ Unconditional `animation: deploy-pulse 2s infinite` on deploy squares
- ❌ Unconditional `animation: recombine-pulse 2s infinite` on recombine options
- ❌ Unconditional transitions on popup pieces and buttons

**Changes:**

- Removed base `will-change`, added tier-specific rules
- Wrapped all animations in `[data-performance='medium/high']` guards
- Added `!important` rules for `off/low` tiers to prevent overrides
- Converted transitions to tier-specific with `none !important` fallbacks

### 2. `apps/cotulenh/app/src/lib/styles/board.css`

**Already correct:** This file properly guards all animations/effects:

- Heroic badge pulse: guarded ✅
- Last-move glow: guarded ✅
- Check alarm: guarded ✅
- Deploy pulse: guarded ✅
- Air defense animations: guarded ✅

## Performance Tier Initialization

**Location:** `apps/cotulenh/app/src/routes/+layout.svelte`

```ts
$effect(() => {
  if (browser) {
    const saved = localStorage.getItem('cotulenh_settings');
    const tier = saved ? JSON.parse(saved).performanceTier : 'low';
    document.documentElement.setAttribute('data-performance', tier);
  }
});
```

**Default:** `'low'` (safe for all devices)

## Testing

### Verify Performance Tier is Applied

1. Open DevTools Console
2. Run: `document.documentElement.getAttribute('data-performance')`
3. Expected: `'low'` (or user's preference)

### Check for Rogue Animations

1. Open DevTools → Performance
2. Record 10 seconds of idle (no interaction)
3. Stop recording
4. Check "Animation Frame Fired" events
5. **Expected for `low` tier:** 0 animation frames when idle
6. **If seeing frames:** Search for unconditional `animation:` or `will-change:` in CSS

### CPU Usage

- **Before fixes:** ~50% CPU when idle
- **After fixes (low tier):** <5% CPU when idle
- **After fixes (high tier):** 10-20% CPU (animations running as expected)

## Common Mistakes to Avoid

1. **Don't add new animations without tier guards**
2. **Don't use `will-change` on static elements**
3. **Don't import CSS files in wrong order** (base.css must come before overrides)
4. **Don't forget `!important` on low-tier overrides** (prevents cascade issues)
5. **Don't assume `box-shadow` is cheap** (it's painted per-frame during animations)

## CSS Containment for Performance

**Location:** `apps/cotulenh/app/src/lib/styles/board.css`

```css
cg-board {
  contain: layout style;
}

cg-board square {
  contain: layout style paint;
}

piece {
  contain: layout style paint;
  content-visibility: auto;
}
```

**Effect:** Prevents layout thrashing and limits paint areas during updates.

## Summary

**The CPU issue was caused by:**

1. Unconditional infinite CSS animations running even on `low` tier
2. Unconditional `will-change: transform` forcing GPU compositing for all pieces
3. Unconditional transitions causing constant browser recomputations

**The fix:**

1. Wrap ALL animations in `[data-performance='medium/high']` guards
2. Remove `will-change` from base styles, add only on hover/drag for high tiers
3. Make transitions optional with `transition: none !important` for low tiers
4. Use `!important` to ensure low-tier rules can't be overridden

**Result:** CPU usage drops from 50% to <5% on idle when using `low` performance tier.
