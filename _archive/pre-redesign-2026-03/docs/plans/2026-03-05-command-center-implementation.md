# Command Center Full Visual Overhaul — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete Lichess-inspired visual overhaul — strip all decorative UI, flatten surfaces, densify typography, redesign every page from scratch within the Command Center layout shell.

**Architecture:** Each page imports `CommandCenter.svelte` directly with center content + tab snippets. Root layout provides only the 48px icon rail, mobile hamburger, and global dialogs. All content is text-first, no containers, no cards.

**Tech Stack:** SvelteKit 2.16, Svelte 5 (runes), Tailwind CSS 4, CSS Grid, bits-ui (dialogs only), lucide-svelte (sidebar only), Vitest

**Design doc:** `docs/plans/2026-03-05-command-center-redesign-design.md`

---

## Task 1: Create CSS utility classes for the new visual system

Before any components, establish the flat styling primitives all pages will use.

**Files:**

- Modify: `apps/cotulenh/app/src/app.css`
- Create: `apps/cotulenh/app/src/lib/styles/command-center.css`

**Step 1: Write the failing test**

Create `apps/cotulenh/app/src/lib/styles/command-center.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const cssPath = resolve(process.cwd(), 'src/lib/styles/command-center.css');

describe('command center CSS utilities', () => {
  it('defines section-header class', () => {
    const source = readFileSync(cssPath, 'utf8');
    expect(source).toContain('.section-header');
    expect(source).toContain('text-transform: uppercase');
    expect(source).toContain('font-family: var(--font-mono)');
  });

  it('defines divider class', () => {
    const source = readFileSync(cssPath, 'utf8');
    expect(source).toContain('.divider');
    expect(source).toContain('border-top: 1px solid');
  });

  it('defines text-link class with no background or border', () => {
    const source = readFileSync(cssPath, 'utf8');
    expect(source).toContain('.text-link');
    expect(source).not.toContain('border-radius');
  });

  it('defines primary-cta with accent background', () => {
    const source = readFileSync(cssPath, 'utf8');
    expect(source).toContain('.primary-cta');
    expect(source).toContain('--theme-primary');
  });

  it('defines toggle-group for text toggles', () => {
    const source = readFileSync(cssPath, 'utf8');
    expect(source).toContain('.toggle-group');
  });

  it('defines flat-list for dense lists', () => {
    const source = readFileSync(cssPath, 'utf8');
    expect(source).toContain('.flat-list');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/cotulenh/app && npx vitest run src/lib/styles/command-center.test.ts`

**Step 3: Create command-center.css**

Create `apps/cotulenh/app/src/lib/styles/command-center.css`:

```css
/* Command Center Visual System — Lichess-inspired flat utilities */

.section-header {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--theme-text-secondary, #aaa);
  margin: 0;
  padding: 0;
}

.divider {
  border: none;
  border-top: 1px solid var(--theme-border, #333);
  margin: 0.75rem 0;
}

.text-link {
  background: none;
  border: none;
  padding: 0;
  color: var(--theme-text-secondary, #aaa);
  font-family: var(--font-ui);
  font-size: 0.8125rem;
  cursor: pointer;
  text-decoration: none;
}

.text-link:hover {
  color: var(--theme-primary, #06b6d4);
  text-decoration: underline;
}

.primary-cta {
  display: inline-block;
  padding: 0.625rem 2rem;
  background: var(--theme-primary, #06b6d4);
  color: var(--theme-text-inverse, #000);
  font-family: var(--font-mono);
  font-size: 0.875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  text-decoration: none;
  border: none;
  cursor: pointer;
}

.primary-cta:hover {
  opacity: 0.85;
}

.toggle-group {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-family: var(--font-mono);
  font-size: 0.8125rem;
}

.toggle-group button {
  background: none;
  border: none;
  padding: 0.25rem 0.5rem;
  color: var(--theme-text-secondary, #aaa);
  font: inherit;
  cursor: pointer;
}

.toggle-group button.active {
  color: var(--theme-text-primary, #eee);
}

.toggle-group .separator {
  color: var(--theme-text-secondary, #666);
}

.flat-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.flat-list-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0;
  font-size: 0.8125rem;
  color: var(--theme-text-secondary, #aaa);
}

.flat-list-item:hover {
  color: var(--theme-text-primary, #eee);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--theme-primary, #06b6d4);
  flex-shrink: 0;
}

.status-dot.offline {
  background: var(--theme-text-secondary, #666);
}
```

**Step 4: Run test to verify it passes**

Run: `cd apps/cotulenh/app && npx vitest run src/lib/styles/command-center.test.ts`

**Step 5: Commit**

```bash
git add apps/cotulenh/app/src/lib/styles/command-center.css apps/cotulenh/app/src/lib/styles/command-center.test.ts
git commit -m "feat: add Lichess-style CSS utility classes for Command Center"
```

---

## Task 2: Create the TabPanel component

**Files:**

- Create: `apps/cotulenh/app/src/lib/components/TabPanel.svelte`
- Create: `apps/cotulenh/app/src/lib/components/TabPanel.test.ts`

**Step 1: Write the failing test**

Create `apps/cotulenh/app/src/lib/components/TabPanel.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const componentPath = resolve(process.cwd(), 'src/lib/components/TabPanel.svelte');

describe('TabPanel component', () => {
  it('exists with tab-bar and tab-content structure', () => {
    const source = readFileSync(componentPath, 'utf8');
    expect(source).toContain('tab-bar');
    expect(source).toContain('tab-button');
    expect(source).toContain('tab-content');
  });

  it('uses monospace uppercase for tab labels', () => {
    const source = readFileSync(componentPath, 'utf8');
    expect(source).toContain('font-family: var(--font-mono)');
    expect(source).toContain('text-transform: uppercase');
  });

  it('has no animation or transition', () => {
    const source = readFileSync(componentPath, 'utf8');
    expect(source).not.toContain('transition');
    expect(source).not.toContain('animation');
  });

  it('scrolls tab content independently', () => {
    const source = readFileSync(componentPath, 'utf8');
    expect(source).toContain('overflow-y: auto');
  });

  it('has 2px bottom accent underline on active tab', () => {
    const source = readFileSync(componentPath, 'utf8');
    expect(source).toContain('border-bottom');
    expect(source).toContain('--theme-primary');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/cotulenh/app && npx vitest run src/lib/components/TabPanel.test.ts`

**Step 3: Implement TabPanel**

Create `apps/cotulenh/app/src/lib/components/TabPanel.svelte`:

```svelte
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Tab {
    id: string;
    label: string;
    content: Snippet;
  }

  interface Props {
    tabs: Tab[];
    activeTab?: string;
  }

  let { tabs, activeTab = $bindable(tabs[0]?.id ?? '') }: Props = $props();
</script>

<div class="tab-panel">
  {#if tabs.length > 1}
    <div class="tab-bar">
      {#each tabs as tab}
        <button
          class="tab-button"
          class:active={activeTab === tab.id}
          onclick={() => (activeTab = tab.id)}
        >
          {tab.label}
        </button>
      {/each}
    </div>
  {/if}

  <div class="tab-content">
    {#each tabs as tab}
      {#if activeTab === tab.id}
        {@render tab.content()}
      {/if}
    {/each}
  </div>
</div>

<style>
  .tab-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }

  .tab-bar {
    display: flex;
    border-bottom: 1px solid var(--theme-border, #333);
    flex-shrink: 0;
  }

  .tab-button {
    padding: 0.5rem 0.75rem;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--theme-text-secondary, #aaa);
    font-family: var(--font-mono);
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    cursor: pointer;
  }

  .tab-button:hover {
    color: var(--theme-primary, #06b6d4);
  }

  .tab-button.active {
    color: var(--theme-text-primary, #eee);
    border-bottom-color: var(--theme-primary, #06b6d4);
  }

  .tab-content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 0.75rem;
  }
</style>
```

**Step 4: Run test, verify pass. Step 5: Commit.**

```bash
git add apps/cotulenh/app/src/lib/components/TabPanel.svelte apps/cotulenh/app/src/lib/components/TabPanel.test.ts
git commit -m "feat: add TabPanel component — monospace tabs, no animation"
```

---

## Task 3: Create the CommandCenter layout component

**Files:**

- Create: `apps/cotulenh/app/src/lib/components/CommandCenter.svelte`
- Create: `apps/cotulenh/app/src/lib/components/CommandCenter.test.ts`

**Step 1: Write the failing test**

Create `apps/cotulenh/app/src/lib/components/CommandCenter.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const componentPath = resolve(process.cwd(), 'src/lib/components/CommandCenter.svelte');

describe('CommandCenter layout component', () => {
  it('defines 2-column grid with 320px right panel', () => {
    const source = readFileSync(componentPath, 'utf8');
    expect(source).toContain('command-center');
    expect(source).toContain('center-area');
    expect(source).toContain('right-panel');
    expect(source).toContain('320px');
  });

  it('uses TabPanel for right-side tabs', () => {
    const source = readFileSync(componentPath, 'utf8');
    expect(source).toContain("import TabPanel from './TabPanel.svelte'");
  });

  it('accepts center snippet and tabs array', () => {
    const source = readFileSync(componentPath, 'utf8');
    expect(source).toContain('center');
    expect(source).toContain('tabs');
    expect(source).toContain('Snippet');
  });

  it('has mobile overlay toggle', () => {
    const source = readFileSync(componentPath, 'utf8');
    expect(source).toContain('mobile-panel-toggle');
    expect(source).toContain('mobile-panel-overlay');
  });

  it('imports command-center.css for utility classes', () => {
    const source = readFileSync(componentPath, 'utf8');
    expect(source).toContain('command-center.css');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/cotulenh/app && npx vitest run src/lib/components/CommandCenter.test.ts`

**Step 3: Implement CommandCenter**

Create `apps/cotulenh/app/src/lib/components/CommandCenter.svelte`:

```svelte
<script lang="ts">
  import { browser } from '$app/environment';
  import type { Snippet } from 'svelte';
  import TabPanel from './TabPanel.svelte';
  import '$lib/styles/command-center.css';

  interface Tab {
    id: string;
    label: string;
    content: Snippet;
  }

  interface Props {
    center: Snippet;
    tabs?: Tab[];
  }

  let { center, tabs = [] }: Props = $props();

  let mobileOverlayOpen = $state(false);
  let hasTabs = $derived(tabs.length > 0);
</script>

<div class="command-center" class:has-right-panel={hasTabs}>
  <div class="center-area">
    {@render center()}
  </div>

  {#if hasTabs}
    <aside class="right-panel max-md:hidden">
      <TabPanel {tabs} />
    </aside>

    {#if browser}
      <button
        class="mobile-panel-toggle hidden max-md:flex"
        onclick={() => (mobileOverlayOpen = true)}
        aria-label="Open panel"
      >
        ≡
      </button>
    {/if}

    {#if mobileOverlayOpen}
      <div class="mobile-panel-overlay" role="dialog" aria-modal="true">
        <div class="mobile-panel-header">
          <button
            class="mobile-panel-close"
            onclick={() => (mobileOverlayOpen = false)}
            aria-label="Close panel"
          >
            ×
          </button>
        </div>
        <div class="mobile-panel-content">
          <TabPanel {tabs} />
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .command-center {
    display: grid;
    grid-template-columns: 1fr;
    min-height: 100vh;
    width: 100%;
  }

  .command-center.has-right-panel {
    grid-template-columns: 1fr 320px;
  }

  .center-area {
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding: 0.75rem;
  }

  .right-panel {
    display: flex;
    flex-direction: column;
    border-left: 1px solid var(--theme-border, #333);
    background: var(--theme-bg-panel, #1a1a1a);
    min-height: 0;
    overflow: hidden;
  }

  .mobile-panel-toggle {
    position: fixed;
    top: 0.75rem;
    right: 0.75rem;
    z-index: 140;
    width: 36px;
    height: 36px;
    background: var(--theme-bg-panel, #1a1a1a);
    border: 1px solid var(--theme-border, #333);
    color: var(--theme-text-secondary, #aaa);
    font-size: 1.25rem;
    cursor: pointer;
    display: none;
    align-items: center;
    justify-content: center;
    padding: 0;
  }

  .mobile-panel-toggle:hover {
    color: var(--theme-primary, #06b6d4);
  }

  .mobile-panel-overlay {
    position: fixed;
    inset: 0;
    z-index: 200;
    background: var(--theme-bg-dark, #111);
    display: flex;
    flex-direction: column;
  }

  .mobile-panel-header {
    display: flex;
    padding: 0.5rem;
    border-bottom: 1px solid var(--theme-border, #333);
    flex-shrink: 0;
  }

  .mobile-panel-close {
    width: 36px;
    height: 36px;
    background: none;
    border: 1px solid var(--theme-border, #333);
    color: var(--theme-text-secondary, #aaa);
    font-size: 1.25rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  }

  .mobile-panel-close:hover {
    color: var(--theme-primary, #06b6d4);
  }

  .mobile-panel-content {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  @media (max-width: 768px) {
    .command-center.has-right-panel {
      grid-template-columns: 1fr;
    }

    .right-panel {
      display: none;
    }

    .mobile-panel-toggle {
      display: flex;
    }
  }
</style>
```

**Step 4: Run test, verify pass. Step 5: Commit.**

```bash
git add apps/cotulenh/app/src/lib/components/CommandCenter.svelte apps/cotulenh/app/src/lib/components/CommandCenter.test.ts
git commit -m "feat: add CommandCenter layout — center + right panel grid with mobile overlay"
```

---

## Task 4: Refactor root layout to 48px icon rail

Strip sidebar to icon-only. Remove text labels. Shrink to 48px. VS Code active indicator.

**Files:**

- Modify: `apps/cotulenh/app/src/routes/+layout.svelte`
- Create: `apps/cotulenh/app/src/routes/layout.icon-rail.test.ts`
- Modify: `apps/cotulenh/app/src/routes/layout.feedback-ui.test.ts`

**Step 1: Write failing test for new rail**

Create `apps/cotulenh/app/src/routes/layout.icon-rail.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const layoutPath = resolve(process.cwd(), 'src/routes/+layout.svelte');

describe('48px icon rail', () => {
  it('uses 48px width, not 80px', () => {
    const source = readFileSync(layoutPath, 'utf8');
    expect(source).toContain('width: 48px');
    expect(source).toContain('margin-left: 48px');
    expect(source).not.toContain('width: 80px');
  });

  it('has no text labels in sidebar', () => {
    const source = readFileSync(layoutPath, 'utf8');
    expect(source).not.toContain('sidebar-label');
  });

  it('uses left border accent for active state', () => {
    const source = readFileSync(layoutPath, 'utf8');
    expect(source).toContain('border-left');
  });
});
```

**Step 2: Run test to verify it fails**

**Step 3: Modify root layout**

In `apps/cotulenh/app/src/routes/+layout.svelte`:

1. Remove all `<span class="sidebar-label">...</span>` elements (both desktop and mobile)
2. Change `.sidebar` width: `80px` → `48px`
3. Change `.app-content` margin-left: `80px` → `48px`
4. Replace `.sidebar-link` styles — remove flex-direction column, add center alignment, 40×40px, no border-radius
5. Replace `.sidebar-link.active` — use `border-left: 2px solid var(--theme-primary)` instead of background fill
6. Change `.sidebar-icon` from `22px` to `20px`
7. Remove `.sidebar-label` CSS class entirely
8. Remove `.user-name` element and CSS (just show avatar)
9. Tighten `.sidebar-footer` and `.sidebar-nav` gaps

**Step 4: Update layout.feedback-ui.test.ts** — remove assertions about `sidebar-icon` class and `sidebar-label` text that no longer exist

**Step 5: Run all layout tests. Step 6: Commit.**

```bash
git add apps/cotulenh/app/src/routes/+layout.svelte apps/cotulenh/app/src/routes/layout.icon-rail.test.ts apps/cotulenh/app/src/routes/layout.feedback-ui.test.ts
git commit -m "feat: shrink sidebar to 48px icon-only rail with accent bar active state"
```

---

## Task 5: Strip app.css — remove decorative classes, add base overrides

Clean the global stylesheet. Remove marketing/decorative classes. Set base font sizes.

**Files:**

- Modify: `apps/cotulenh/app/src/app.css`

**Step 1: Write failing test**

Create `apps/cotulenh/app/src/lib/styles/visual-cleanup.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('visual system cleanup', () => {
  it('app.css has no btn-game classes', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/app.css'), 'utf8');
    expect(source).not.toContain('.btn-game-primary');
    expect(source).not.toContain('.btn-game-alert');
    expect(source).not.toContain('.btn-game-secondary');
    expect(source).not.toContain('.btn-game-subtle');
    expect(source).not.toContain('.btn-game-ghost');
  });

  it('sets base font size to 13px', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/app.css'), 'utf8');
    expect(source).toContain('font-size: 13px');
  });

  it('keeps theme variable system', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/app.css'), 'utf8');
    expect(source).toContain('--theme-bg-dark');
    expect(source).toContain('--theme-primary');
    expect(source).toContain('@theme');
  });
});
```

**Step 2: Run test to verify it fails**

**Step 3: Modify app.css**

1. Remove all `.btn-game-*` class definitions (lines 187-257)
2. Change `body` font-size to `13px`
3. Keep the `@theme` block, `:root` variables, HUD corners (board may use them), and Tailwind import
4. Keep `.panel-gradient` and `.panel-inset` for now (board might reference them)

**Step 4: Run test, verify pass. Step 5: Commit.**

```bash
git add apps/cotulenh/app/src/app.css apps/cotulenh/app/src/lib/styles/visual-cleanup.test.ts
git commit -m "style: strip decorative button classes, set 13px base font"
```

---

## Task 6: Redesign home page (logged in) — big play button + game feed

Complete rewrite of the home page for logged-in users.

**Files:**

- Modify: `apps/cotulenh/app/src/routes/+page.svelte`

**Step 1: Write failing test**

Create `apps/cotulenh/app/src/routes/page.redesign.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pagePath = resolve(process.cwd(), 'src/routes/+page.svelte');

describe('home page redesign', () => {
  it('uses CommandCenter component', () => {
    const source = readFileSync(pagePath, 'utf8');
    expect(source).toContain('CommandCenter');
  });

  it('has primary-cta play button', () => {
    const source = readFileSync(pagePath, 'utf8');
    expect(source).toContain('primary-cta');
    expect(source).toContain('href="/play"');
  });

  it('has no feature cards', () => {
    const source = readFileSync(pagePath, 'utf8');
    expect(source).not.toContain('feature-card');
    expect(source).not.toContain('coming-soon-card');
    expect(source).not.toContain('cta-button');
  });

  it('has no decorative icons in content', () => {
    const source = readFileSync(pagePath, 'utf8');
    expect(source).not.toContain('BookOpen');
    expect(source).not.toContain('Gamepad2');
    expect(source).not.toContain('Share2');
    expect(source).not.toContain('Bot');
  });

  it('uses section-header and divider classes', () => {
    const source = readFileSync(pagePath, 'utf8');
    expect(source).toContain('section-header');
    expect(source).toContain('divider');
  });

  it('has different view for anon vs logged-in', () => {
    const source = readFileSync(pagePath, 'utf8');
    expect(source).toContain('isAuthenticated');
  });
});
```

**Step 2: Run test to verify it fails**

**Step 3: Rewrite home page**

Complete rewrite of `apps/cotulenh/app/src/routes/+page.svelte`:

**Logged-in view:**

- Import `CommandCenter`
- Center: big PLAY button (`.primary-cta`), time control toggles, divider, recent games flat list
- Right tabs: Friends (online friends list), Activity (placeholder "No recent activity")
- Remove ALL icon imports (Info, Users, Share2, Puzzle, Bot, Gamepad2, BookOpen)
- Remove ALL card styling, hero header, feature grid, coming soon section, CTA buttons
- Use `command-center.css` utility classes throughout

**Anonymous view:**

- No `CommandCenter` wrapper (no right panel)
- One-line game description
- PLAY button (goes to `/play`)
- "sign up to play online" text link
- "learn the game →" and "try the editor →" text links
- Nothing else

**Step 4: Run test, verify pass. Step 5: Commit.**

```bash
git add apps/cotulenh/app/src/routes/+page.svelte apps/cotulenh/app/src/routes/page.redesign.test.ts
git commit -m "feat: redesign home page — big play button, flat game feed, no cards"
```

---

## Task 7: Redesign local play page — board-centric with Moves/Game tabs

Strip PlayDesktop down to board only. Move all controls into CommandCenter tabs.

**Files:**

- Modify: `apps/cotulenh/app/src/routes/play/+page.svelte`
- Modify: `apps/cotulenh/app/src/routes/play/PlayDesktop.svelte`

**Step 1: Write failing test**

Create `apps/cotulenh/app/src/routes/play/play-redesign.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('play page redesign', () => {
  it('PlayDesktop no longer has controls-section', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/routes/play/PlayDesktop.svelte'),
      'utf8'
    );
    expect(source).not.toContain('controls-section');
    expect(source).not.toContain('controls-grid');
    expect(source).not.toContain('controls-header');
  });

  it('uses CommandCenter with tabs', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/routes/play/PlayDesktop.svelte'),
      'utf8'
    );
    expect(source).toContain('CommandCenter');
    expect(source).toContain('tabs');
  });

  it('has no decorative title styling', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/routes/play/PlayDesktop.svelte'),
      'utf8'
    );
    expect(source).not.toContain('title-green');
    expect(source).not.toContain('title-cyan');
  });
});
```

**Step 2: Run test to verify it fails**

**Step 3: Refactor PlayDesktop**

1. Import `CommandCenter` and wrap all content
2. Center snippet: board only (BoardContainer + MoveConfirmPanel as text links below)
3. Define two tab snippets:
   - **Moves tab**: MoveHistory component
   - **Game tab**: ClockPanel, game info (turn/status as plain text), action links (resign, draw, undo, new game as `.text-link`)
4. Remove: `.controls-section`, `.controls-grid`, `.controls-header`, `.controls-clock`, title header with green/cyan text
5. Remove: `.game-layout` flex (board no longer side-by-side with controls)
6. Board section: remove fixed `width: min(760px, 100%)`, let it flex within center area
7. Update `+page.svelte` if needed to accommodate the new structure

**Step 4: Run test, verify pass. Step 5: Commit.**

```bash
git add apps/cotulenh/app/src/routes/play/
git commit -m "feat: redesign play page — board-only center, Moves/Game tabs, text-link actions"
```

---

## Task 8: Redesign online play hub — flat text lists

Strip all cards from the online play hub. Replace with flat sections.

**Files:**

- Modify: `apps/cotulenh/app/src/routes/play/online/+page.svelte`

**Step 1: Write failing test**

Create `apps/cotulenh/app/src/routes/play/online/online-redesign.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('online hub redesign', () => {
  it('uses CommandCenter', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/routes/play/online/+page.svelte'),
      'utf8'
    );
    expect(source).toContain('CommandCenter');
  });

  it('has no card containers', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/routes/play/online/+page.svelte'),
      'utf8'
    );
    expect(source).not.toContain('border-radius: 12px');
  });

  it('uses section-header and divider classes', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/routes/play/online/+page.svelte'),
      'utf8'
    );
    expect(source).toContain('section-header');
    expect(source).toContain('divider');
  });
});
```

**Step 2: Run test to verify it fails**

**Step 3: Redesign online hub**

1. Wrap in `CommandCenter` (no right panel tabs — all content in center)
2. Replace InvitationCard, ReceivedInvitationCard, FriendRequestCard with flat list items
3. Friends Online: flat list — name, status dot, `invite` text link
4. Invitations: flat list — `from [name] [time] accept` as text link
5. Create Game: toggle group for time, toggle group for rated/casual, `create invite link` as text link
6. Section headers as `.section-header`, dividers as `<hr class="divider">`
7. Remove all card component imports and card styling
8. Remove all icon imports from content

**Step 4: Run test, verify pass. Step 5: Commit.**

```bash
git add apps/cotulenh/app/src/routes/play/online/+page.svelte apps/cotulenh/app/src/routes/play/online/online-redesign.test.ts
git commit -m "feat: redesign online hub — flat text lists, no cards, section dividers"
```

---

## Task 9: Redesign online game page — board + Game tab with chat

**Files:**

- Modify: `apps/cotulenh/app/src/routes/play/online/[gameId]/+page.svelte`

**Step 1-3: Same pattern** — wrap in CommandCenter, board in center, Moves/Game tabs. Game tab includes chat at bottom. Strip all card/decorative styling. Use text links for resign/draw/rematch.

**Commit:** `feat: redesign online game page — board center, Moves/Game tabs with chat`

---

## Task 10: Redesign puzzles page — flat list, no cards

**Files:**

- Modify: `apps/cotulenh/app/src/routes/puzzles/+page.svelte`

**Step 1: Write failing test**

Create `apps/cotulenh/app/src/routes/puzzles/puzzles-redesign.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('puzzles page redesign', () => {
  it('uses CommandCenter', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/routes/puzzles/+page.svelte'), 'utf8');
    expect(source).toContain('CommandCenter');
  });

  it('has no card containers or rounded badges', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/routes/puzzles/+page.svelte'), 'utf8');
    expect(source).not.toContain('puzzle-card');
    expect(source).not.toContain('border-radius: 12px');
    expect(source).not.toContain('border-radius: 9999px');
  });

  it('has no icon imports', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/routes/puzzles/+page.svelte'), 'utf8');
    expect(source).not.toContain('Puzzle');
    expect(source).not.toContain('Play');
    expect(source).not.toContain('ChevronRight');
  });

  it('uses text links for play action', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/routes/puzzles/+page.svelte'), 'utf8');
    expect(source).toContain('text-link');
  });
});
```

**Step 2-3: Rewrite puzzles page**

1. Wrap in `CommandCenter` (right tabs: Moves, Hints — populated when puzzle is active)
2. Center: flat list of puzzles — `#1 Commander Capture Easy` with `play` text link
3. Difficulty as color-coded plain text (no pill badge)
4. Remove all icon imports (Puzzle, Play, ChevronRight)
5. Remove card containers, rounded badges, decorative header
6. Use `.section-header`, `.divider`, `.flat-list`, `.text-link`

**Step 4-5: Run test, commit.**

```bash
git add apps/cotulenh/app/src/routes/puzzles/
git commit -m "feat: redesign puzzles page — flat list, text links, no cards or icons"
```

---

## Task 11: Redesign board editor — board center, Pieces/Setup tabs

**Files:**

- Modify: `apps/cotulenh/app/src/routes/board-editor/EditorDesktop.svelte`
- Modify: `apps/cotulenh/app/src/routes/board-editor/+page.svelte`

**Step 1-3:** Wrap in CommandCenter. Board in center with `clear export share` text links below. Right tabs: Pieces (piece palettes), Setup (FEN input, turn toggle). Remove card-style piece palette containers.

**Commit:** `feat: redesign board editor — board center, Pieces/Setup tabs`

---

## Task 12: Redesign learn pages — flat lists, board-centric lessons

**Files:**

- Modify: `apps/cotulenh/app/src/routes/learn/+page.svelte`
- Modify: `apps/cotulenh/app/src/routes/learn/[subjectId]/+page.svelte`
- Modify: `apps/cotulenh/app/src/routes/learn/[subjectId]/[sectionId]/[lessonId]/+page.svelte`

**Step 1: Write failing test**

Create `apps/cotulenh/app/src/routes/learn/learn-redesign.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('learn pages redesign', () => {
  it('learn hub uses CommandCenter', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/routes/learn/+page.svelte'), 'utf8');
    expect(source).toContain('CommandCenter');
  });

  it('learn hub has flat subject list, no cards', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/routes/learn/+page.svelte'), 'utf8');
    expect(source).toContain('flat-list');
    expect(source).not.toContain('border-radius: 12px');
  });
});
```

**Step 2-3: Redesign learn pages**

- **Hub**: Flat list of subjects with progress counts (e.g., `Basics 4/10`). No cards, no icons
- **Subject page**: Flat list of lessons/sections. Progress bar as simple text fraction
- **Lesson page**: Board in center, right tabs: Lesson (instructions + `[continue]` text link), Hints
- Remove all decorative learn UI (card containers, gradient backgrounds, icon decorations)

**Commit:** `feat: redesign learn pages — flat lists, board-centric lessons, Lesson/Hints tabs`

---

## Task 13: Redesign user pages — flat text, no cards

Profile, friends, settings, history pages.

**Files:**

- Modify: `apps/cotulenh/app/src/routes/user/profile/+page.svelte`
- Modify: `apps/cotulenh/app/src/routes/user/profile/[username]/+page.svelte`
- Modify: `apps/cotulenh/app/src/routes/user/friends/+page.svelte`
- Modify: `apps/cotulenh/app/src/routes/user/settings/+page.svelte`
- Modify: `apps/cotulenh/app/src/routes/user/history/+page.svelte`
- Modify: `apps/cotulenh/app/src/routes/user/history/[gameId]/+page.svelte`

**Step 1-3: Redesign all user pages**

All user pages:

1. Wrap in `CommandCenter` (no right panel tabs)
2. Flat text content — section headers, dividers, flat lists, text links
3. Remove card containers, avatar circles, decorative elements
4. Dense spacing throughout

Specific pages:

- **Profile**: Display name, member since, stats as plain text. No avatar circle
- **Friends**: Flat list — name, status dot, action text links (remove, invite)
- **Settings**: Flat form — label + input pairs, thin dividers between sections. Strip dialog-style padding
- **History**: Flat list — opponent, result (W/L/D color-coded), time control, date. `replay` text link
- **Game replay**: Board in center, right tabs: Moves (replay controls)

**Commit:** `feat: redesign user pages — flat text, no cards, dense spacing`

---

## Task 14: Restyle dialogs — flatten Settings, Shortcuts, Feedback

**Files:**

- Modify: `apps/cotulenh/app/src/lib/components/SettingsDialog.svelte`
- Modify: `apps/cotulenh/app/src/lib/components/ShortcutsDialog.svelte`
- Modify: `apps/cotulenh/app/src/lib/components/FeedbackDialog.svelte`

**Step 1-3: Restyle dialogs**

- Remove rounded corners (2px max border-radius)
- Flat background with 1px border
- Dense padding (0.75rem)
- Plain text titles (no decorative headers)
- Text-link style for secondary actions
- Remove any icon usage in dialog content

**Commit:** `feat: restyle dialogs — flat, dense, minimal decoration`

---

## Task 15: i18n keys for new UI elements

**Files:**

- Modify: `apps/cotulenh/app/src/lib/i18n/locales/en.ts`
- Modify: `apps/cotulenh/app/src/lib/i18n/locales/vi.ts`
- Modify: `apps/cotulenh/app/src/lib/i18n/types.ts`

Add keys for:

- Tab labels: `tabs.moves`, `tabs.game`, `tabs.friends`, `tabs.activity`, `tabs.lesson`, `tabs.hints`, `tabs.pieces`, `tabs.setup`
- Home: `home.signUpOnline`, `home.recentGames`, `home.noActivity`
- Panel: `panel.open`, `panel.close`
- Nav: `nav.home`
- Play: game action text links

**Commit:** `feat: add i18n keys for Command Center tabs and redesigned pages`

---

## Task 16: Clean up removed components and dead code

**Files:**

- Potentially remove or simplify: `InvitationCard.svelte`, `ReceivedInvitationCard.svelte`, `FriendRequestCard.svelte`, `PlayerCard.svelte` if their card styling was the only purpose
- Remove unused icon imports across all modified files
- Remove unused CSS classes from component `<style>` blocks

**Commit:** `chore: remove dead card components and unused imports`

---

## Task 17: Final integration — build, test, verify

**Step 1:** Run full monorepo test suite: `pnpm test`

**Step 2:** Run build: `pnpm build`

**Step 3:** Manual verification (dev server):

- [ ] 48px icon rail, icon-only, accent bar active state
- [ ] Home: big PLAY button, flat game feed, Friends/Activity tabs
- [ ] Home (anon): minimal intro, play link, sign-up text
- [ ] Play: board-only center, Moves/Game tabs, text-link actions
- [ ] Online hub: flat text lists, no cards
- [ ] Online game: board center, Moves/Game tabs with chat
- [ ] Puzzles: flat list, text links, no cards
- [ ] Editor: board center, Pieces/Setup tabs
- [ ] Learn hub: flat subject list
- [ ] Learn lesson: board center, Lesson/Hints tabs
- [ ] User pages: flat text, no cards
- [ ] Dialogs: flat, dense
- [ ] Mobile: rail hidden, hamburger works, panel toggle → overlay
- [ ] No hardcoded colors (all through CSS vars)
- [ ] No `border-radius: 12px` anywhere
- [ ] No icon imports in content areas (sidebar only)
- [ ] Auth pages unchanged

**Commit:** `chore: final integration fixes for Command Center visual overhaul`

---

## Notes for the implementor

### Key principle

**When in doubt, remove it.** This is a subtractive redesign. If something looks decorative, delete it. If a component exists only to wrap content in a card, inline the content and delete the component. If an icon exists in a content area, replace it with text.

### Pattern for page migration

Every page follows the same pattern:

1. Import `CommandCenter` and `'$lib/styles/command-center.css'`
2. Wrap content in `<CommandCenter>` with `{#snippet center()}...{/snippet}`
3. Define tab snippets if the page has right-panel content
4. Replace cards with flat lists (`.flat-list`, `.flat-list-item`)
5. Replace section headers with `.section-header`
6. Replace visual separators with `<hr class="divider">`
7. Replace buttons with `.text-link` (secondary) or `.primary-cta` (one per page max)
8. Remove all icon imports from content
9. Remove all card/badge/pill styling
10. Delete unused `<style>` blocks (most pages will have much less CSS)

### Files reference

| Component            | Path                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------ |
| Root layout          | `apps/cotulenh/app/src/routes/+layout.svelte`                                        |
| Home page            | `apps/cotulenh/app/src/routes/+page.svelte`                                          |
| Play desktop         | `apps/cotulenh/app/src/routes/play/PlayDesktop.svelte`                               |
| Play mobile          | `apps/cotulenh/app/src/routes/play/PlayMobile.svelte`                                |
| Online play hub      | `apps/cotulenh/app/src/routes/play/online/+page.svelte`                              |
| Online game          | `apps/cotulenh/app/src/routes/play/online/[gameId]/+page.svelte`                     |
| Puzzles              | `apps/cotulenh/app/src/routes/puzzles/+page.svelte`                                  |
| Board editor desktop | `apps/cotulenh/app/src/routes/board-editor/EditorDesktop.svelte`                     |
| Learn hub            | `apps/cotulenh/app/src/routes/learn/+page.svelte`                                    |
| Learn subject        | `apps/cotulenh/app/src/routes/learn/[subjectId]/+page.svelte`                        |
| Learn lesson         | `apps/cotulenh/app/src/routes/learn/[subjectId]/[sectionId]/[lessonId]/+page.svelte` |
| Friends              | `apps/cotulenh/app/src/routes/user/friends/+page.svelte`                             |
| Profile              | `apps/cotulenh/app/src/routes/user/profile/+page.svelte`                             |
| Public profile       | `apps/cotulenh/app/src/routes/user/profile/[username]/+page.svelte`                  |
| Settings             | `apps/cotulenh/app/src/routes/user/settings/+page.svelte`                            |
| History              | `apps/cotulenh/app/src/routes/user/history/+page.svelte`                             |
| Game replay          | `apps/cotulenh/app/src/routes/user/history/[gameId]/+page.svelte`                    |
| App CSS              | `apps/cotulenh/app/src/app.css`                                                      |
| Command Center CSS   | `apps/cotulenh/app/src/lib/styles/command-center.css`                                |
| i18n EN              | `apps/cotulenh/app/src/lib/i18n/locales/en.ts`                                       |
| i18n VI              | `apps/cotulenh/app/src/lib/i18n/locales/vi.ts`                                       |
| TabPanel             | `apps/cotulenh/app/src/lib/components/TabPanel.svelte`                               |
| CommandCenter        | `apps/cotulenh/app/src/lib/components/CommandCenter.svelte`                          |
| SettingsDialog       | `apps/cotulenh/app/src/lib/components/SettingsDialog.svelte`                         |
| ShortcutsDialog      | `apps/cotulenh/app/src/lib/components/ShortcutsDialog.svelte`                        |
| FeedbackDialog       | `apps/cotulenh/app/src/lib/components/FeedbackDialog.svelte`                         |

### Run commands

- App tests: `cd apps/cotulenh/app && npx vitest run`
- Single test: `cd apps/cotulenh/app && npx vitest run path/to/test.ts`
- Monorepo tests: `pnpm test` (from repo root)
- Build: `pnpm build` (from repo root)
- Dev server: `cd apps/cotulenh/app && pnpm dev`
