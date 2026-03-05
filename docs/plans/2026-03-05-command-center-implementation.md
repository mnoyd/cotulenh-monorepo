# Command Center UI Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current app shell with an IDE-style Command Center layout — 48px icon rail, board-dominant center, right-side tab panel.

**Architecture:** Slot-based `CommandCenter.svelte` component receives center content and tab definitions as Svelte 5 snippets. Root layout provides the icon rail and mobile hamburger. Each page declares what goes in the center and which tabs appear in the right panel.

**Tech Stack:** SvelteKit 2.16, Svelte 5 (runes), Tailwind CSS 4, CSS Grid, bits-ui, lucide-svelte, Vitest

**Design doc:** `docs/plans/2026-03-05-command-center-redesign-design.md`

---

## Task 1: Create the TabPanel component

The tab switching component used inside the right panel. Build this first since CommandCenter depends on it.

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
  it('exists and exports expected interface', () => {
    const source = readFileSync(componentPath, 'utf8');

    // Props interface
    expect(source).toContain('tabs');
    expect(source).toContain('activeTab');

    // Tab bar structure
    expect(source).toContain('tab-bar');
    expect(source).toContain('tab-button');
    expect(source).toContain('tab-content');

    // Active state styling
    expect(source).toContain('active');
  });

  it('uses monospace uppercase styling for tab labels', () => {
    const source = readFileSync(componentPath, 'utf8');

    expect(source).toContain('font-family: var(--font-mono)');
    expect(source).toContain('text-transform: uppercase');
  });

  it('has no animation on tab switch', () => {
    const source = readFileSync(componentPath, 'utf8');

    expect(source).not.toContain('transition');
    expect(source).not.toContain('animation');
  });

  it('renders tab content with independent scroll', () => {
    const source = readFileSync(componentPath, 'utf8');

    expect(source).toContain('overflow-y: auto');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/cotulenh/app && npx vitest run src/lib/components/TabPanel.test.ts`
Expected: FAIL — file does not exist

**Step 3: Implement the TabPanel component**

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
    gap: 0;
    border-bottom: 1px solid var(--theme-border, #444);
    flex-shrink: 0;
  }

  .tab-button {
    padding: 0.5rem 0.75rem;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--theme-text-secondary, #aaa);
    font-family: var(--font-mono);
    font-size: 0.7rem;
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

**Step 4: Run test to verify it passes**

Run: `cd apps/cotulenh/app && npx vitest run src/lib/components/TabPanel.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/cotulenh/app/src/lib/components/TabPanel.svelte apps/cotulenh/app/src/lib/components/TabPanel.test.ts
git commit -m "feat: add TabPanel component for right-side tab switching"
```

---

## Task 2: Create the CommandCenter layout component

The 2-column layout (center + right panel) that pages use.

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
  it('exists and defines the 2-column grid', () => {
    const source = readFileSync(componentPath, 'utf8');

    expect(source).toContain('command-center');
    expect(source).toContain('center-area');
    expect(source).toContain('right-panel');
  });

  it('uses TabPanel for right-side tabs', () => {
    const source = readFileSync(componentPath, 'utf8');

    expect(source).toContain("import TabPanel from './TabPanel.svelte'");
  });

  it('accepts center snippet and tabs array as props', () => {
    const source = readFileSync(componentPath, 'utf8');

    expect(source).toContain('center');
    expect(source).toContain('tabs');
    expect(source).toContain('Snippet');
  });

  it('has right panel fixed at 320px', () => {
    const source = readFileSync(componentPath, 'utf8');

    expect(source).toContain('320px');
  });

  it('hides right panel on mobile and shows toggle button', () => {
    const source = readFileSync(componentPath, 'utf8');

    expect(source).toContain('mobile-panel-toggle');
    expect(source).toContain('mobile-panel-overlay');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/cotulenh/app && npx vitest run src/lib/components/CommandCenter.test.ts`
Expected: FAIL — file does not exist

**Step 3: Implement the CommandCenter component**

Create `apps/cotulenh/app/src/lib/components/CommandCenter.svelte`:

```svelte
<script lang="ts">
  import { browser } from '$app/environment';
  import type { Snippet } from 'svelte';
  import TabPanel from './TabPanel.svelte';
  import { PanelRight, X } from 'lucide-svelte';

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
    <!-- Desktop right panel -->
    <aside class="right-panel max-md:hidden">
      <TabPanel {tabs} />
    </aside>

    <!-- Mobile toggle button -->
    {#if browser}
      <button
        class="mobile-panel-toggle hidden max-md:flex"
        onclick={() => (mobileOverlayOpen = true)}
        aria-label="Open panel"
      >
        <PanelRight size={20} />
      </button>
    {/if}

    <!-- Mobile overlay -->
    {#if mobileOverlayOpen}
      <div class="mobile-panel-overlay" role="dialog" aria-modal="true">
        <div class="mobile-panel-header">
          <button
            class="mobile-panel-close"
            onclick={() => (mobileOverlayOpen = false)}
            aria-label="Close panel"
          >
            <X size={20} />
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
  }

  .right-panel {
    display: flex;
    flex-direction: column;
    border-left: 1px solid var(--theme-border, #444);
    background: var(--theme-bg-panel, #222);
    min-height: 0;
    overflow: hidden;
  }

  /* Mobile toggle */
  .mobile-panel-toggle {
    position: fixed;
    top: 0.75rem;
    right: 0.75rem;
    z-index: 140;
    width: 40px;
    height: 40px;
    border-radius: 6px;
    background: var(--theme-bg-panel, #222);
    border: 1px solid var(--theme-border, #444);
    color: var(--theme-text-secondary, #aaa);
    cursor: pointer;
    display: none;
    align-items: center;
    justify-content: center;
    padding: 0;
  }

  .mobile-panel-toggle:hover {
    color: var(--theme-primary, #06b6d4);
    border-color: var(--theme-primary, #06b6d4);
  }

  /* Mobile overlay */
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
    align-items: center;
    padding: 0.5rem;
    border-bottom: 1px solid var(--theme-border, #444);
    flex-shrink: 0;
  }

  .mobile-panel-close {
    width: 40px;
    height: 40px;
    border-radius: 6px;
    background: none;
    border: 1px solid var(--theme-border, #444);
    color: var(--theme-text-secondary, #aaa);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  }

  .mobile-panel-close:hover {
    color: var(--theme-primary, #06b6d4);
    border-color: var(--theme-primary, #06b6d4);
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

**Step 4: Run test to verify it passes**

Run: `cd apps/cotulenh/app && npx vitest run src/lib/components/CommandCenter.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/cotulenh/app/src/lib/components/CommandCenter.svelte apps/cotulenh/app/src/lib/components/CommandCenter.test.ts
git commit -m "feat: add CommandCenter layout component with mobile overlay"
```

---

## Task 3: Refactor root layout to 48px icon rail

Replace the 80px sidebar with labels → 48px icon-only rail with VS Code-style active indicator.

**Files:**

- Modify: `apps/cotulenh/app/src/routes/+layout.svelte`
- Modify: `apps/cotulenh/app/src/routes/layout.feedback-ui.test.ts` (update expectations)

**Step 1: Write the failing test for the new sidebar structure**

Create `apps/cotulenh/app/src/routes/layout.icon-rail.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const layoutPath = resolve(process.cwd(), 'src/routes/+layout.svelte');

describe('icon rail layout', () => {
  it('has 48px icon rail instead of 80px sidebar', () => {
    const source = readFileSync(layoutPath, 'utf8');

    // New: 48px rail
    expect(source).toContain('width: 48px');
    expect(source).toContain('margin-left: 48px');

    // Old: 80px sidebar should be gone
    expect(source).not.toContain('width: 80px');
    expect(source).not.toContain('margin-left: 80px');
  });

  it('has no text labels in sidebar links', () => {
    const source = readFileSync(layoutPath, 'utf8');

    // sidebar-label class should be removed
    expect(source).not.toContain('sidebar-label');
  });

  it('uses title attributes for tooltips on sidebar links', () => {
    const source = readFileSync(layoutPath, 'utf8');

    // Each link should have a title for tooltip
    expect(source).toContain('title={i18n.t(');
  });

  it('has active indicator bar instead of filled background', () => {
    const source = readFileSync(layoutPath, 'utf8');

    // Active state: left border accent, not background fill
    expect(source).toContain('border-left');
    expect(source).toContain('--theme-primary');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/cotulenh/app && npx vitest run src/routes/layout.icon-rail.test.ts`
Expected: FAIL — old layout has 80px, labels, etc.

**Step 3: Modify the root layout**

Edit `apps/cotulenh/app/src/routes/+layout.svelte`. The changes are:

1. **Remove all `<span class="sidebar-label">` elements** from both desktop sidebar and mobile menu
2. **Remove `.sidebar-label` CSS class**
3. **Change `.sidebar` width from `80px` to `48px`**
4. **Change `.app-content` margin-left from `80px` to `48px`**
5. **Change `.sidebar-link` active style** — replace background fill with left border:

Replace the `.sidebar-link.active` CSS block:

```css
.sidebar-link.active {
  color: var(--theme-primary, #06b6d4);
  background: transparent;
  border-left: 2px solid var(--theme-primary, #06b6d4);
  border-radius: 0;
}
```

6. **Change `.sidebar-icon` size** from `22px` to `20px`
7. **Adjust `.sidebar-link` padding** to center icons in 48px rail:

```css
.sidebar-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin: 0 auto;
  border-radius: 6px;
  text-decoration: none;
  color: var(--theme-text-secondary, #aaa);
  background: transparent;
  border: none;
  border-left: 2px solid transparent;
  cursor: pointer;
  padding: 0;
}
```

**Step 4: Update the feedback UI test to match new sidebar structure**

In `apps/cotulenh/app/src/routes/layout.feedback-ui.test.ts`, update expectations that reference `sidebar-icon` class or `sidebar-label` — remove assertions about labels, keep assertions about dialog wiring.

**Step 5: Run all layout tests to verify they pass**

Run: `cd apps/cotulenh/app && npx vitest run src/routes/layout`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add apps/cotulenh/app/src/routes/+layout.svelte apps/cotulenh/app/src/routes/layout.icon-rail.test.ts apps/cotulenh/app/src/routes/layout.feedback-ui.test.ts
git commit -m "feat: refactor sidebar to 48px icon-only rail with accent bar active state"
```

---

## Task 4: Integrate CommandCenter into root layout

Wire up the `CommandCenter` component so that `{@render children()}` flows through it.

**Files:**

- Modify: `apps/cotulenh/app/src/routes/+layout.svelte`

**Step 1: Write the failing test**

Create `apps/cotulenh/app/src/routes/layout.command-center.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const layoutPath = resolve(process.cwd(), 'src/routes/+layout.svelte');

describe('CommandCenter integration in root layout', () => {
  it('imports and renders CommandCenter component', () => {
    const source = readFileSync(layoutPath, 'utf8');

    expect(source).toContain("import CommandCenter from '$lib/components/CommandCenter.svelte'");
    expect(source).toContain('<CommandCenter');
  });

  it('passes children as center snippet to CommandCenter', () => {
    const source = readFileSync(layoutPath, 'utf8');

    // The children should be rendered inside CommandCenter's center snippet
    expect(source).toContain('{@render children()}');
    expect(source).toContain('center');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/cotulenh/app && npx vitest run src/routes/layout.command-center.test.ts`
Expected: FAIL — CommandCenter not imported yet

**Step 3: Modify root layout to use CommandCenter**

In `apps/cotulenh/app/src/routes/+layout.svelte`:

1. Add import: `import CommandCenter from '$lib/components/CommandCenter.svelte';`
2. Replace the `<main class="app-content ...">` section with:

```svelte
<main class="app-content max-md:ml-0">
  <CommandCenter>
    {#snippet center()}
      {@render children()}
    {/snippet}
  </CommandCenter>
</main>
```

Note: At this stage, no pages pass tabs yet, so the right panel won't show. That's correct — we'll add tabs page by page in subsequent tasks.

**Step 4: Run test to verify it passes**

Run: `cd apps/cotulenh/app && npx vitest run src/routes/layout.command-center.test.ts`
Expected: PASS

**Step 5: Run the full test suite to verify no regressions**

Run: `cd apps/cotulenh/app && npx vitest run`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add apps/cotulenh/app/src/routes/+layout.svelte apps/cotulenh/app/src/routes/layout.command-center.test.ts
git commit -m "feat: integrate CommandCenter layout component into root layout"
```

---

## Task 5: Migrate local play page to Command Center layout

Move the controls section from PlayDesktop's right column into CommandCenter tabs.

**Files:**

- Modify: `apps/cotulenh/app/src/routes/play/PlayDesktop.svelte`
- Modify: `apps/cotulenh/app/src/routes/play/+page.svelte`

**Step 1: Write the failing test**

Create `apps/cotulenh/app/src/routes/play/play-command-center.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const desktopPath = resolve(process.cwd(), 'src/routes/play/PlayDesktop.svelte');

describe('play page Command Center integration', () => {
  it('exports tabs for CommandCenter consumption', () => {
    const source = readFileSync(desktopPath, 'utf8');

    // Should have tab definitions or snippets for moves/cards
    expect(source).toContain('tabs');
  });

  it('board section takes full center area', () => {
    const source = readFileSync(desktopPath, 'utf8');

    // Board should be the primary center content
    expect(source).toContain('BoardContainer');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/cotulenh/app && npx vitest run src/routes/play/play-command-center.test.ts`
Expected: FAIL

**Step 3: Refactor PlayDesktop.svelte**

The current PlayDesktop has a 2-column layout: board | controls. We need to:

1. Make the board the only center content
2. Move MoveHistory, GameInfo, ClockPanel, GameControls into tab snippets
3. Export a `tabs` array that the parent page can pass to CommandCenter

Key changes to `PlayDesktop.svelte`:

- Remove the `controls-section` div and its 340px fixed width styling
- Remove the `.game-layout` flex container (board now fills center area naturally)
- Keep the board section as the sole content
- Define `{#snippet}` blocks for Moves (MoveHistory + ClockPanel) and Controls (GameInfo + GameControls)
- Export these as props that the parent `+page.svelte` can access

Since Svelte 5 doesn't allow exporting snippets directly from child components, the approach is:

- Move tab content definitions into the parent `+page.svelte`
- `PlayDesktop.svelte` becomes a board-only wrapper
- The parent page defines snippets for MoveHistory, GameControls etc. and passes them as tabs

**Step 4: Update +page.svelte to pass tabs**

The `+page.svelte` needs to be updated to not use `ResponsiveLayout` for desktop (since the layout is now handled by CommandCenter), or to make the desktop variant board-only and pass tab data up.

This is a significant refactor — the exact approach depends on how the existing `ResponsiveLayout` and game session state flow. The implementor should:

1. Read `PlayDesktop.svelte` and `PlayMobile.svelte` fully
2. Extract the controls (MoveHistory, GameInfo, ClockPanel, GameControls) into snippets defined in the parent
3. Pass them to CommandCenter via the `+page.svelte` → root layout chain

**Important:** Since SvelteKit doesn't have a built-in mechanism for child pages to pass data to parent layouts, we need a pattern. Two options:

- **Option A:** Use Svelte context — the page sets tabs via context, the layout reads them
- **Option B:** Each page wraps itself in `<CommandCenter>` directly instead of the root layout doing it

**Recommended: Option B.** Remove `<CommandCenter>` from the root layout. Instead, each page imports and uses `<CommandCenter>` directly. This gives each page full control over its tabs and center content.

If choosing Option B, update Task 4 to NOT add CommandCenter to the root layout. Instead, the root layout just provides the 48px icon rail, and each page wraps its own content in `<CommandCenter>`.

**Step 5: Run tests to verify**

Run: `cd apps/cotulenh/app && npx vitest run`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add apps/cotulenh/app/src/routes/play/
git commit -m "feat: migrate local play page to Command Center layout with Moves/Controls tabs"
```

---

## Task 6: Migrate home page to split-pane dashboard

Replace the current feature-card landing page with a Command Center split-pane dashboard.

**Files:**

- Modify: `apps/cotulenh/app/src/routes/+page.svelte`

**Step 1: Write the failing test**

Create `apps/cotulenh/app/src/routes/page.command-center.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pagePath = resolve(process.cwd(), 'src/routes/+page.svelte');

describe('home page Command Center dashboard', () => {
  it('uses CommandCenter component', () => {
    const source = readFileSync(pagePath, 'utf8');

    expect(source).toContain('CommandCenter');
  });

  it('has split-pane layout in center area', () => {
    const source = readFileSync(pagePath, 'utf8');

    expect(source).toContain('dashboard-split');
  });

  it('has quick play actions', () => {
    const source = readFileSync(pagePath, 'utf8');

    expect(source).toContain('href="/play"');
  });

  it('defines Activity and Friends tabs', () => {
    const source = readFileSync(pagePath, 'utf8');

    expect(source).toContain('Activity');
    expect(source).toContain('Friends');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/cotulenh/app && npx vitest run src/routes/page.command-center.test.ts`
Expected: FAIL

**Step 3: Redesign the home page**

Replace the current feature cards with a Command Center dashboard:

**Center area — split-pane:**

- Left column: Quick Play button, Create Game link, recent games list (placeholder)
- Right column: Mini-board placeholder (static board showing a position)

**Right panel tabs:**

- Activity: Recent activity feed (placeholder: "No recent activity")
- Friends: Online friends list (placeholder, will wire to real data in Epic 3)

Remove: feature cards, coming soon section, hero header, all the decorative styling.

The page should feel dense and utilitarian — stark text, minimal decoration.

**Step 4: Run test to verify it passes**

Run: `cd apps/cotulenh/app && npx vitest run src/routes/page.command-center.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/cotulenh/app/src/routes/+page.svelte apps/cotulenh/app/src/routes/page.command-center.test.ts
git commit -m "feat: redesign home page as split-pane Command Center dashboard"
```

---

## Task 7: Migrate puzzles page to Command Center

Move puzzle content into center area with hints tab in right panel.

**Files:**

- Modify: `apps/cotulenh/app/src/routes/puzzles/+page.svelte`

**Step 1: Write the failing test**

Create `apps/cotulenh/app/src/routes/puzzles/puzzles-command-center.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pagePath = resolve(process.cwd(), 'src/routes/puzzles/+page.svelte');

describe('puzzles page Command Center integration', () => {
  it('uses CommandCenter component', () => {
    const source = readFileSync(pagePath, 'utf8');

    expect(source).toContain('CommandCenter');
  });

  it('removes rounded card styling', () => {
    const source = readFileSync(pagePath, 'utf8');

    expect(source).not.toContain('border-radius: 12px');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/cotulenh/app && npx vitest run src/routes/puzzles/puzzles-command-center.test.ts`
Expected: FAIL

**Step 3: Refactor puzzles page**

1. Import and wrap in `<CommandCenter>`
2. Center area: puzzle list with flat styling (no rounded cards, no large header)
3. Right panel tabs: Moves (placeholder), Hints (selected puzzle's hint)
4. Remove: decorative header, rounded card containers, gradient badges
5. Use flat dividers between puzzle entries instead of card boxes

**Step 4: Run test to verify it passes**

Run: `cd apps/cotulenh/app && npx vitest run src/routes/puzzles/puzzles-command-center.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/cotulenh/app/src/routes/puzzles/
git commit -m "feat: migrate puzzles page to Command Center layout"
```

---

## Task 8: Migrate board editor to Command Center

Move piece palettes into right panel tabs.

**Files:**

- Modify: `apps/cotulenh/app/src/routes/board-editor/EditorDesktop.svelte`
- Modify: `apps/cotulenh/app/src/routes/board-editor/+page.svelte`

**Step 1: Write the failing test**

Create `apps/cotulenh/app/src/routes/board-editor/editor-command-center.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const desktopPath = resolve(process.cwd(), 'src/routes/board-editor/EditorDesktop.svelte');

describe('board editor Command Center integration', () => {
  it('uses CommandCenter or provides content for it', () => {
    const source = readFileSync(desktopPath, 'utf8');

    expect(source).toContain('CommandCenter');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/cotulenh/app && npx vitest run src/routes/board-editor/editor-command-center.test.ts`
Expected: FAIL

**Step 3: Refactor board editor**

1. Board fills center area
2. Right panel tabs: Pieces (PiecePalette components), Setup (PaletteControls)
3. The editor's side controls move into the tab content areas

**Step 4: Run test to verify it passes**

Run: `cd apps/cotulenh/app && npx vitest run src/routes/board-editor/editor-command-center.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/cotulenh/app/src/routes/board-editor/
git commit -m "feat: migrate board editor to Command Center layout"
```

---

## Task 9: Migrate learn pages to Command Center

Move lesson controls into right panel tabs (Lesson, Hints, Progress).

**Files:**

- Modify: `apps/cotulenh/app/src/routes/learn/+page.svelte` (hub)
- Modify: `apps/cotulenh/app/src/routes/learn/[subjectId]/+page.svelte` (subject)
- Modify: `apps/cotulenh/app/src/routes/learn/[subjectId]/[sectionId]/[lessonId]/+page.svelte` (lesson)

**Step 1: Write the failing test**

Create `apps/cotulenh/app/src/routes/learn/learn-command-center.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('learn pages Command Center integration', () => {
  it('learn hub uses CommandCenter', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/routes/learn/+page.svelte'), 'utf8');
    expect(source).toContain('CommandCenter');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/cotulenh/app && npx vitest run src/routes/learn/learn-command-center.test.ts`
Expected: FAIL

**Step 3: Refactor learn pages**

- **Hub page:** Center = subject list. Right panel tabs: Progress (overall progress summary)
- **Subject page:** Center = section/lesson list. Right panel tabs: Progress (subject progress)
- **Lesson page:** Center = board + lesson. Right panel tabs: Lesson (instructions), Hints, Progress

**Step 4: Run test to verify it passes**

Run: `cd apps/cotulenh/app && npx vitest run src/routes/learn/learn-command-center.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/cotulenh/app/src/routes/learn/
git commit -m "feat: migrate learn pages to Command Center layout"
```

---

## Task 10: Migrate user pages to Command Center

Profile, friends, settings, and history pages.

**Files:**

- Modify: `apps/cotulenh/app/src/routes/user/profile/+page.svelte`
- Modify: `apps/cotulenh/app/src/routes/user/friends/+page.svelte`
- Modify: `apps/cotulenh/app/src/routes/user/settings/+page.svelte`
- Modify: `apps/cotulenh/app/src/routes/user/history/+page.svelte`

**Step 1: Write the failing test**

Create `apps/cotulenh/app/src/routes/user/user-command-center.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('user pages Command Center integration', () => {
  it('friends page uses CommandCenter', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/routes/user/friends/+page.svelte'),
      'utf8'
    );
    expect(source).toContain('CommandCenter');
  });

  it('profile page uses CommandCenter', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/routes/user/profile/+page.svelte'),
      'utf8'
    );
    expect(source).toContain('CommandCenter');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/cotulenh/app && npx vitest run src/routes/user/user-command-center.test.ts`
Expected: FAIL

**Step 3: Refactor user pages**

These are full-width center content pages. They wrap in `<CommandCenter>` with no tabs (or minimal context tabs).

- **Friends:** Center = friend list. Tabs = none (single panel, friend search inline)
- **Profile:** Center = profile content. Tabs = none
- **Settings:** Center = settings form. Tabs = none
- **History:** Center = game list. Tabs = none (or single "Filters" tab if useful)

Main visual changes: remove rounded cards, tighten spacing, flatten surfaces.

**Step 4: Run test to verify it passes**

Run: `cd apps/cotulenh/app && npx vitest run src/routes/user/user-command-center.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/cotulenh/app/src/routes/user/
git commit -m "feat: migrate user pages to Command Center layout"
```

---

## Task 11: Visual system cleanup

Strip decorative styling across the app. Tighten spacing. Flatten surfaces.

**Files:**

- Modify: `apps/cotulenh/app/src/app.css`
- Modify: various component files

**Step 1: Write the failing test**

Create `apps/cotulenh/app/src/routes/visual-system.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('visual system cleanup', () => {
  it('app.css has no border-radius: 12px (rounded cards removed)', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/app.css'), 'utf8');
    expect(source).not.toContain('border-radius: 12px');
  });

  it('app.css retains theme variable system', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/app.css'), 'utf8');
    expect(source).toContain('--theme-bg-dark');
    expect(source).toContain('--theme-primary');
    expect(source).toContain('@theme');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/cotulenh/app && npx vitest run src/routes/visual-system.test.ts`
Expected: PASS or FAIL depending on current state (app.css itself may not have 12px radius, but pages do)

**Step 3: Clean up visual styles**

Across all modified pages:

- Remove `border-radius: 12px` (use `border-radius: 4px` or `6px` max)
- Remove `border-radius: 9999px` pill badges (use flat text labels instead)
- Reduce padding values by ~25%
- Remove decorative `box-shadow` usage
- Ensure all colors use theme CSS variables (no hardcoded `#22c55e` etc.)

**Step 4: Run full test suite**

Run: `cd apps/cotulenh/app && npx vitest run`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add -u
git commit -m "style: flatten surfaces, tighten spacing, remove decorative styling"
```

---

## Task 12: i18n keys for new UI elements

Add translation keys for any new UI elements (tab labels, tooltips, etc.).

**Files:**

- Modify: `apps/cotulenh/app/src/lib/i18n/locales/en.ts`
- Modify: `apps/cotulenh/app/src/lib/i18n/locales/vi.ts`
- Modify: `apps/cotulenh/app/src/lib/i18n/types.ts` (if typed keys)

**Step 1: Identify new keys needed**

New i18n keys for tab labels and UI elements:

```ts
// Tab labels
'tabs.moves': 'Moves',
'tabs.cards': 'Cards',
'tabs.chat': 'Chat',
'tabs.activity': 'Activity',
'tabs.friends': 'Friends',
'tabs.lesson': 'Lesson',
'tabs.hints': 'Hints',
'tabs.progress': 'Progress',
'tabs.pieces': 'Pieces',
'tabs.setup': 'Setup',

// Mobile panel
'panel.open': 'Open panel',
'panel.close': 'Close panel',

// Dashboard
'dashboard.quickPlay': 'Quick Play',
'dashboard.createGame': 'Create Game',
'dashboard.recentGames': 'Recent Games',
'dashboard.noActivity': 'No recent activity',

// Nav tooltips (may already exist as nav.* keys)
'nav.home': 'Home',
```

**Step 2: Add keys to en.ts and vi.ts**

Add the above keys to both locale files.

**Step 3: Update type definitions if needed**

If `types.ts` has a `TranslationKeys` type with explicit key listing, add the new keys.

**Step 4: Run tests**

Run: `cd apps/cotulenh/app && npx vitest run`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add apps/cotulenh/app/src/lib/i18n/
git commit -m "feat: add i18n keys for Command Center tabs, panel, and dashboard"
```

---

## Task 13: Final integration test and cleanup

Verify the full app builds and all tests pass.

**Step 1: Run the full monorepo test suite**

Run: `cd /home/noy/Work/chess/cotulenh-monorepo && pnpm test`
Expected: ALL PASS

**Step 2: Run the build**

Run: `cd /home/noy/Work/chess/cotulenh-monorepo && pnpm build`
Expected: Build succeeds with no errors

**Step 3: Manual verification checklist**

Run: `cd apps/cotulenh/app && pnpm dev`

Verify:

- [ ] 48px icon rail renders on desktop
- [ ] Active page shows left accent bar
- [ ] Hovering sidebar icons shows tooltips
- [ ] Home page shows split-pane dashboard
- [ ] Play page shows board in center, tabs on right
- [ ] Tab switching is instant (no animation)
- [ ] Mobile: left rail hidden, hamburger works
- [ ] Mobile: panel toggle button shows/hides overlay
- [ ] Auth pages unchanged

**Step 4: Commit any final fixes**

```bash
git add -u
git commit -m "chore: final integration fixes for Command Center redesign"
```

---

## Notes for the implementor

### Key decision point in Task 5

The plan identifies a critical architecture decision: whether CommandCenter lives in the root layout (child pages pass tabs via context) or each page wraps itself in CommandCenter directly.

**Recommendation: Each page uses CommandCenter directly.** This is simpler than context-based tab registration, avoids timing issues, and gives pages full control. If you choose this approach:

- Task 4 should NOT add CommandCenter to root layout
- Instead, each page imports and wraps its content in `<CommandCenter>`
- The root layout only provides the 48px icon rail + mobile hamburger + dialogs

### Existing test pattern

Tests use file-source reading (`readFileSync`) to verify component structure. Follow this pattern for all new tests. See `layout.feedback-ui.test.ts` for the established convention.

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
| Learn lesson         | `apps/cotulenh/app/src/routes/learn/[subjectId]/[sectionId]/[lessonId]/+page.svelte` |
| Friends              | `apps/cotulenh/app/src/routes/user/friends/+page.svelte`                             |
| Profile              | `apps/cotulenh/app/src/routes/user/profile/+page.svelte`                             |
| Settings             | `apps/cotulenh/app/src/routes/user/settings/+page.svelte`                            |
| History              | `apps/cotulenh/app/src/routes/user/history/+page.svelte`                             |
| App CSS              | `apps/cotulenh/app/src/app.css`                                                      |
| i18n EN              | `apps/cotulenh/app/src/lib/i18n/locales/en.ts`                                       |
| i18n VI              | `apps/cotulenh/app/src/lib/i18n/locales/vi.ts`                                       |
| TabPanel             | `apps/cotulenh/app/src/lib/components/TabPanel.svelte`                               |
| CommandCenter        | `apps/cotulenh/app/src/lib/components/CommandCenter.svelte`                          |
| ResponsiveLayout     | `apps/cotulenh/app/src/lib/components/ResponsiveLayout.svelte`                       |

### Run commands

- App tests: `cd apps/cotulenh/app && npx vitest run`
- Single test: `cd apps/cotulenh/app && npx vitest run path/to/test.ts`
- Monorepo tests: `pnpm test` (from repo root)
- Build: `pnpm build` (from repo root)
- Dev server: `cd apps/cotulenh/app && pnpm dev`
