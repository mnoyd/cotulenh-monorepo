# Play Screen & Multiplayer Enhancement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform `/play` into a lobby with mode selection and time control grid, move current practice board to `/play/practice` (no clock), and add move confirmation + takebacks to online games.

**Architecture:** New lobby page at `/play` with ResponsiveLayout (desktop/mobile). Current play board code relocated to `/play/practice` with clock stripped. Online games enhanced with two new message types (takeback-request, takeback-accept/decline) following the existing draw offer pattern. Move confirmation is a persisted user setting that gates move sending in online games.

**Tech Stack:** SvelteKit 2.16, Svelte 5 runes, TypeScript, Supabase Realtime, Vitest

---

### Task 1: Expand TIME_PRESETS for invitation flow

**Files:**

- Modify: `apps/cotulenh/app/src/lib/invitations/types.ts:11-15`
- Test: `apps/cotulenh/app/src/lib/invitations/types.test.ts` (create)

**Step 1: Write the failing test**

Create `apps/cotulenh/app/src/lib/invitations/types.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { TIME_PRESETS, type GameConfig } from './types';

describe('TIME_PRESETS', () => {
  it('has exactly 9 presets', () => {
    expect(TIME_PRESETS).toHaveLength(9);
  });

  it('each preset has valid config', () => {
    for (const preset of TIME_PRESETS) {
      expect(preset.label).toMatch(/^\d+\+\d+$/);
      expect(preset.config.timeMinutes).toBeGreaterThanOrEqual(1);
      expect(preset.config.timeMinutes).toBeLessThanOrEqual(60);
      expect(preset.config.incrementSeconds).toBeGreaterThanOrEqual(0);
      expect(preset.config.incrementSeconds).toBeLessThanOrEqual(30);
    }
  });

  it('includes expected presets in order', () => {
    const labels = TIME_PRESETS.map((p) => p.label);
    expect(labels).toEqual(['1+0', '2+1', '3+0', '3+2', '5+0', '5+3', '10+0', '15+10', '30+0']);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/cotulenh/app && npx vitest run src/lib/invitations/types.test.ts`
Expected: FAIL — currently only 3 presets

**Step 3: Update TIME_PRESETS**

In `apps/cotulenh/app/src/lib/invitations/types.ts`, replace lines 11–15:

```typescript
export const TIME_PRESETS: TimePreset[] = [
  { label: '1+0', config: { timeMinutes: 1, incrementSeconds: 0 } },
  { label: '2+1', config: { timeMinutes: 2, incrementSeconds: 1 } },
  { label: '3+0', config: { timeMinutes: 3, incrementSeconds: 0 } },
  { label: '3+2', config: { timeMinutes: 3, incrementSeconds: 2 } },
  { label: '5+0', config: { timeMinutes: 5, incrementSeconds: 0 } },
  { label: '5+3', config: { timeMinutes: 5, incrementSeconds: 3 } },
  { label: '10+0', config: { timeMinutes: 10, incrementSeconds: 0 } },
  { label: '15+10', config: { timeMinutes: 15, incrementSeconds: 10 } },
  { label: '30+0', config: { timeMinutes: 30, incrementSeconds: 0 } }
];
```

**Step 4: Run test to verify it passes**

Run: `cd apps/cotulenh/app && npx vitest run src/lib/invitations/types.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/cotulenh/app/src/lib/invitations/types.ts apps/cotulenh/app/src/lib/invitations/types.test.ts
git commit -m "feat: expand TIME_PRESETS to 9 presets for lobby time control grid"
```

---

### Task 2: Add moveConfirmation to settings

**Files:**

- Modify: `apps/cotulenh/app/src/lib/stores/settings.ts:8-15,20-28`

**Step 1: Write the failing test**

Create `apps/cotulenh/app/src/lib/stores/settings.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadSettings,
  saveSettings,
  resetSettings,
  DEFAULT_SETTINGS,
  SettingsSchema
} from './settings';

// Mock browser environment
vi.mock('$app/environment', () => ({ browser: true }));

describe('Settings', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('DEFAULT_SETTINGS includes moveConfirmation as false', () => {
    expect(DEFAULT_SETTINGS.moveConfirmation).toBe(false);
  });

  it('SettingsSchema validates moveConfirmation boolean', () => {
    const result = SettingsSchema.safeParse({ ...DEFAULT_SETTINGS, moveConfirmation: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.moveConfirmation).toBe(true);
    }
  });

  it('loadSettings returns default moveConfirmation when not set', () => {
    const settings = loadSettings();
    expect(settings.moveConfirmation).toBe(false);
  });

  it('saveSettings persists moveConfirmation', () => {
    saveSettings({ moveConfirmation: true });
    const settings = loadSettings();
    expect(settings.moveConfirmation).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/cotulenh/app && npx vitest run src/lib/stores/settings.test.ts`
Expected: FAIL — `moveConfirmation` not in schema

**Step 3: Add moveConfirmation to schema**

In `apps/cotulenh/app/src/lib/stores/settings.ts`:

Add to `SettingsSchema` (after line 15, before the closing `)`):

```typescript
moveConfirmation: z.boolean().default(false);
```

Add to `DEFAULT_SETTINGS` (after line 27, before the closing `}`):

```typescript
moveConfirmation: false;
```

**Step 4: Run test to verify it passes**

Run: `cd apps/cotulenh/app && npx vitest run src/lib/stores/settings.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/cotulenh/app/src/lib/stores/settings.ts apps/cotulenh/app/src/lib/stores/settings.test.ts
git commit -m "feat: add moveConfirmation setting (default off)"
```

---

### Task 3: Add i18n keys for new UI

**Files:**

- Modify: `apps/cotulenh/app/src/lib/i18n/types.ts`
- Modify: `apps/cotulenh/app/src/lib/i18n/locales/en.ts`
- Modify: `apps/cotulenh/app/src/lib/i18n/locales/vi.ts`

**Step 1: Add translation key types**

In `apps/cotulenh/app/src/lib/i18n/types.ts`, add these keys to the `TranslationKey` type (find the type definition and add them in the appropriate section):

```typescript
// Play lobby
'play.lobby.title': string;
'play.lobby.playOnline': string;
'play.lobby.practice': string;
'play.lobby.practiceDesc': string;
'play.lobby.startPractice': string;
'play.lobby.createGame': string;
'play.lobby.custom': string;
'play.lobby.customMinutes': string;
'play.lobby.customIncrement': string;

// Settings — move confirmation
'settings.moveConfirmation': string;
'settings.moveConfirmation.desc': string;

// Takeback
'game.takebackRequest': string;
'game.takebackSent': string;
'game.takebackReceived': string;
'game.acceptTakeback': string;
'game.declineTakeback': string;

// Move confirmation in-game
'game.confirmMove': string;
'game.cancelMove': string;
```

**Step 2: Add English translations**

In `apps/cotulenh/app/src/lib/i18n/locales/en.ts`, add:

```typescript
// Play lobby
'play.lobby.title': 'Play',
'play.lobby.playOnline': 'Play Online',
'play.lobby.practice': 'Practice',
'play.lobby.practiceDesc': 'Play both sides. No clock, no pressure. Explore moves freely.',
'play.lobby.startPractice': 'Start Practice',
'play.lobby.createGame': 'Create Game',
'play.lobby.custom': 'Custom',
'play.lobby.customMinutes': 'Minutes',
'play.lobby.customIncrement': 'Increment',

// Settings
'settings.moveConfirmation': 'Move Confirmation',
'settings.moveConfirmation.desc': 'Require confirming moves before sending in online games',

// Takeback
'game.takebackRequest': 'Request Takeback',
'game.takebackSent': 'Takeback requested',
'game.takebackReceived': 'Opponent requests takeback',
'game.acceptTakeback': 'Accept',
'game.declineTakeback': 'Decline',

// Move confirmation
'game.confirmMove': 'Confirm',
'game.cancelMove': 'Cancel',
```

**Step 3: Add Vietnamese translations**

In `apps/cotulenh/app/src/lib/i18n/locales/vi.ts`, add corresponding Vietnamese translations (same keys, Vietnamese values).

**Step 4: Verify types compile**

Run: `cd apps/cotulenh/app && npx svelte-check`
Expected: No type errors from i18n keys

**Step 5: Commit**

```bash
git add apps/cotulenh/app/src/lib/i18n/
git commit -m "feat: add i18n keys for play lobby, move confirmation, and takebacks"
```

---

### Task 4: Create practice route (relocate current play board)

**Files:**

- Create: `apps/cotulenh/app/src/routes/play/practice/+page.svelte`
- Create: `apps/cotulenh/app/src/routes/play/practice/+page.ts`
- Create: `apps/cotulenh/app/src/routes/play/practice/PracticeDesktop.svelte`
- Create: `apps/cotulenh/app/src/routes/play/practice/PracticeMobile.svelte`

**Step 1: Create `+page.ts` to disable SSR**

Create `apps/cotulenh/app/src/routes/play/practice/+page.ts`:

```typescript
export const ssr = false;
```

**Step 2: Create `+page.svelte` wrapper**

Create `apps/cotulenh/app/src/routes/play/practice/+page.svelte`:

```svelte
<script lang="ts">
  import ResponsiveLayout from '$lib/components/ResponsiveLayout.svelte';
  import PracticeDesktop from './PracticeDesktop.svelte';
  import PracticeMobile from './PracticeMobile.svelte';
</script>

<ResponsiveLayout desktop={PracticeDesktop} mobile={PracticeMobile} />
```

**Step 3: Create PracticeDesktop.svelte**

Copy `apps/cotulenh/app/src/routes/play/PlayDesktop.svelte` to `apps/cotulenh/app/src/routes/play/practice/PracticeDesktop.svelte`, then make these changes:

1. **Remove** all clock imports: `createChessClock`, `TIME_PRESETS`, `ClockColor` from `$lib/clock/clock.svelte`
2. **Remove** the `clock` constant and `handleTimeout` function
3. **Remove** `clock.reset()` from `resetGame()`
4. **Remove** `clock.destroy()` from the cleanup
5. **Remove** the `session.onMove` clock logic — keep `session.onMove` only if needed for other purposes, otherwise remove entirely
6. **Remove** the `$effect` that stops clock on game end
7. **Remove** `ClockPanel` import and `<ClockPanel>` from the game tab
8. Keep everything else: board, MoveHistory, MoveConfirmPanel (for deploy sessions), ShareDialog, actions

**Step 4: Create PracticeMobile.svelte**

Copy `apps/cotulenh/app/src/routes/play/PlayMobile.svelte` to `apps/cotulenh/app/src/routes/play/practice/PracticeMobile.svelte`, then:

1. **Remove** all clock imports: `createChessClock`, `TIME_PRESETS`, `formatClockTime`
2. **Remove** the `clock` constant
3. **Remove** `clock.reset()` from `resetGame()`
4. **Remove** `clock.destroy()` from cleanup
5. **Remove** the `session.onMove` clock logic
6. **Remove** the `$effect` that stops clock on game end
7. **Remove** the `.clock-mini` elements from top-bar and bottom-bar
8. Keep the board, actions, bottom sheet, MoveHistory, GameInfo

**Step 5: Verify the practice route works**

Run: `cd apps/cotulenh/app && npx svelte-check`
Expected: No type errors

**Step 6: Commit**

```bash
git add apps/cotulenh/app/src/routes/play/practice/
git commit -m "feat: create /play/practice route with clock-free board"
```

---

### Task 5: Create lobby page (desktop)

**Files:**

- Create: `apps/cotulenh/app/src/routes/play/LobbyDesktop.svelte`

**Step 1: Create LobbyDesktop.svelte**

This replaces the current `PlayDesktop.svelte` content at `/play`. The lobby has two sections side-by-side: Play Online (with time control grid) and Practice.

```svelte
<script lang="ts">
  import { goto } from '$app/navigation';
  import { getI18n } from '$lib/i18n/index.svelte';
  import { TIME_PRESETS, type GameConfig } from '$lib/invitations/types';
  import '$lib/styles/command-center.css';

  const i18n = getI18n();

  let selectedPresetIndex = $state<number | null>(null);
  let customMode = $state(false);
  let customMinutes = $state(10);
  let customIncrement = $state(0);

  let selectedConfig = $derived.by((): GameConfig | null => {
    if (customMode) {
      return { timeMinutes: customMinutes, incrementSeconds: customIncrement };
    }
    if (selectedPresetIndex !== null) {
      return { ...TIME_PRESETS[selectedPresetIndex].config };
    }
    return null;
  });

  function selectPreset(index: number) {
    customMode = false;
    selectedPresetIndex = index;
  }

  function selectCustom() {
    selectedPresetIndex = null;
    customMode = true;
  }

  function createGame() {
    if (!selectedConfig) return;
    const params = new URLSearchParams({
      timeMinutes: String(selectedConfig.timeMinutes),
      incrementSeconds: String(selectedConfig.incrementSeconds)
    });
    goto(`/play/online?${params}`);
  }

  function startPractice() {
    goto('/play/practice');
  }
</script>

<svelte:head>
  <title>{i18n.t('play.lobby.title')} | {i18n.t('nav.appName')}</title>
</svelte:head>

<div class="lobby">
  <div class="lobby-grid">
    <!-- Play Online Section -->
    <section class="lobby-section">
      <h2 class="section-header">{i18n.t('play.lobby.playOnline')}</h2>

      <div class="tc-grid">
        {#each TIME_PRESETS as preset, idx}
          <button
            class="tc-btn"
            class:active={!customMode && selectedPresetIndex === idx}
            onclick={() => selectPreset(idx)}
          >
            {preset.label}
          </button>
        {/each}
      </div>

      <button
        class="tc-btn custom-btn"
        class:active={customMode}
        onclick={selectCustom}
      >
        {i18n.t('play.lobby.custom')}
      </button>

      {#if customMode}
        <div class="custom-inputs">
          <label class="custom-field">
            <span class="text-secondary">{i18n.t('play.lobby.customMinutes')}</span>
            <input type="number" bind:value={customMinutes} min="1" max="60" />
          </label>
          <label class="custom-field">
            <span class="text-secondary">{i18n.t('play.lobby.customIncrement')}</span>
            <input type="number" bind:value={customIncrement} min="0" max="30" />
          </label>
        </div>
      {/if}

      <button
        class="primary-cta"
        disabled={!selectedConfig}
        onclick={createGame}
      >
        {i18n.t('play.lobby.createGame')}
      </button>
    </section>

    <!-- Practice Section -->
    <section class="lobby-section">
      <h2 class="section-header">{i18n.t('play.lobby.practice')}</h2>
      <p class="text-secondary">{i18n.t('play.lobby.practiceDesc')}</p>
      <button class="primary-cta" onclick={startPractice}>
        {i18n.t('play.lobby.startPractice')}
      </button>
    </section>
  </div>
</div>

<style>
  .lobby {
    display: flex;
    justify-content: center;
    padding: 2rem 1rem;
    min-height: 100%;
  }

  .lobby-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    max-width: 700px;
    width: 100%;
    align-content: start;
  }

  .lobby-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .tc-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }

  .tc-btn {
    padding: 0.625rem 0.5rem;
    background: transparent;
    border: 1px solid var(--theme-border, #333);
    color: var(--theme-text-primary, #eee);
    font-family: var(--font-mono, monospace);
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
    text-align: center;
  }

  .tc-btn:hover {
    border-color: var(--theme-text-secondary, #aaa);
  }

  .tc-btn.active {
    background: var(--theme-primary, #06b6d4);
    border-color: var(--theme-primary, #06b6d4);
    color: #000;
  }

  .custom-btn {
    width: 100%;
  }

  .custom-inputs {
    display: flex;
    gap: 0.75rem;
  }

  .custom-field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
  }

  .custom-field input {
    padding: 0.375rem 0.5rem;
    background: var(--theme-bg-dark, #111);
    border: 1px solid var(--theme-border, #333);
    color: var(--theme-text-primary, #eee);
    font-family: var(--font-mono, monospace);
    font-size: 0.8125rem;
  }

  .text-secondary {
    color: var(--theme-text-secondary, #aaa);
    font-size: 0.8125rem;
  }
</style>
```

**Step 2: Verify it compiles**

Run: `cd apps/cotulenh/app && npx svelte-check`
Expected: No errors

**Step 3: Commit**

```bash
git add apps/cotulenh/app/src/routes/play/LobbyDesktop.svelte
git commit -m "feat: create LobbyDesktop component for /play mode selection"
```

---

### Task 6: Create lobby page (mobile)

**Files:**

- Create: `apps/cotulenh/app/src/routes/play/LobbyMobile.svelte`

**Step 1: Create LobbyMobile.svelte**

Same logic as desktop but stacked vertically. Reuse the same state and navigation logic.

```svelte
<script lang="ts">
  import { goto } from '$app/navigation';
  import { getI18n } from '$lib/i18n/index.svelte';
  import { TIME_PRESETS, type GameConfig } from '$lib/invitations/types';
  import '$lib/styles/command-center.css';

  const i18n = getI18n();

  let selectedPresetIndex = $state<number | null>(null);
  let customMode = $state(false);
  let customMinutes = $state(10);
  let customIncrement = $state(0);

  let selectedConfig = $derived.by((): GameConfig | null => {
    if (customMode) {
      return { timeMinutes: customMinutes, incrementSeconds: customIncrement };
    }
    if (selectedPresetIndex !== null) {
      return { ...TIME_PRESETS[selectedPresetIndex].config };
    }
    return null;
  });

  function selectPreset(index: number) {
    customMode = false;
    selectedPresetIndex = index;
  }

  function selectCustom() {
    selectedPresetIndex = null;
    customMode = true;
  }

  function createGame() {
    if (!selectedConfig) return;
    const params = new URLSearchParams({
      timeMinutes: String(selectedConfig.timeMinutes),
      incrementSeconds: String(selectedConfig.incrementSeconds)
    });
    goto(`/play/online?${params}`);
  }

  function startPractice() {
    goto('/play/practice');
  }
</script>

<main class="lobby-mobile">
  <!-- Play Online -->
  <section class="lobby-section">
    <h2 class="section-header">{i18n.t('play.lobby.playOnline')}</h2>

    <div class="tc-grid">
      {#each TIME_PRESETS as preset, idx}
        <button
          class="tc-btn"
          class:active={!customMode && selectedPresetIndex === idx}
          onclick={() => selectPreset(idx)}
        >
          {preset.label}
        </button>
      {/each}
    </div>

    <button
      class="tc-btn custom-btn"
      class:active={customMode}
      onclick={selectCustom}
    >
      {i18n.t('play.lobby.custom')}
    </button>

    {#if customMode}
      <div class="custom-inputs">
        <label class="custom-field">
          <span class="text-secondary">{i18n.t('play.lobby.customMinutes')}</span>
          <input type="number" bind:value={customMinutes} min="1" max="60" />
        </label>
        <label class="custom-field">
          <span class="text-secondary">{i18n.t('play.lobby.customIncrement')}</span>
          <input type="number" bind:value={customIncrement} min="0" max="30" />
        </label>
      </div>
    {/if}

    <button
      class="primary-cta"
      disabled={!selectedConfig}
      onclick={createGame}
    >
      {i18n.t('play.lobby.createGame')}
    </button>
  </section>

  <hr class="divider" />

  <!-- Practice -->
  <section class="lobby-section">
    <h2 class="section-header">{i18n.t('play.lobby.practice')}</h2>
    <p class="text-secondary">{i18n.t('play.lobby.practiceDesc')}</p>
    <button class="primary-cta" onclick={startPractice}>
      {i18n.t('play.lobby.startPractice')}
    </button>
  </section>
</main>

<style>
  .lobby-mobile {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 1rem;
    padding-top: 60px; /* Space for mobile nav */
    min-height: 100dvh;
    background: var(--theme-bg-dark, #000);
    color: var(--theme-text-primary, #eee);
  }

  .lobby-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .tc-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }

  .tc-btn {
    padding: 0.75rem 0.5rem;
    background: transparent;
    border: 1px solid var(--theme-border, #333);
    color: var(--theme-text-primary, #eee);
    font-family: var(--font-mono, monospace);
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    text-align: center;
  }

  .tc-btn.active {
    background: var(--theme-primary, #06b6d4);
    border-color: var(--theme-primary, #06b6d4);
    color: #000;
  }

  .custom-btn {
    width: 100%;
  }

  .custom-inputs {
    display: flex;
    gap: 0.75rem;
  }

  .custom-field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
  }

  .custom-field input {
    padding: 0.5rem;
    background: var(--theme-bg-dark, #111);
    border: 1px solid var(--theme-border, #333);
    color: var(--theme-text-primary, #eee);
    font-family: var(--font-mono, monospace);
    font-size: 0.875rem;
  }

  .text-secondary {
    color: var(--theme-text-secondary, #aaa);
    font-size: 0.8125rem;
  }
</style>
```

**Step 2: Verify it compiles**

Run: `cd apps/cotulenh/app && npx svelte-check`

**Step 3: Commit**

```bash
git add apps/cotulenh/app/src/routes/play/LobbyMobile.svelte
git commit -m "feat: create LobbyMobile component for /play mode selection"
```

---

### Task 7: Rewire `/play` page to show lobby

**Files:**

- Modify: `apps/cotulenh/app/src/routes/play/+page.svelte`
- Old files `PlayDesktop.svelte` and `PlayMobile.svelte` become unused (delete or keep for reference)

**Step 1: Update +page.svelte to use lobby components**

Replace `apps/cotulenh/app/src/routes/play/+page.svelte`:

```svelte
<script lang="ts">
  import ResponsiveLayout from '$lib/components/ResponsiveLayout.svelte';
  import LobbyDesktop from './LobbyDesktop.svelte';
  import LobbyMobile from './LobbyMobile.svelte';
</script>

<ResponsiveLayout desktop={LobbyDesktop} mobile={LobbyMobile} />
```

**Step 2: Delete old PlayDesktop.svelte and PlayMobile.svelte**

These are now replaced by the lobby components. The practice board lives in `/play/practice/`.

```bash
git rm apps/cotulenh/app/src/routes/play/PlayDesktop.svelte
git rm apps/cotulenh/app/src/routes/play/PlayMobile.svelte
```

**Step 3: Verify**

Run: `cd apps/cotulenh/app && npx svelte-check`
Expected: No errors (old files removed, new lobby and practice route in place)

**Step 4: Commit**

```bash
git add apps/cotulenh/app/src/routes/play/
git commit -m "feat: rewire /play to show lobby, remove old PlayDesktop/PlayMobile"
```

---

### Task 8: Wire time control from lobby to online hub

**Files:**

- Modify: `apps/cotulenh/app/src/routes/play/online/+page.svelte:22-24`

**Step 1: Read query params on mount and pre-select time control**

In `apps/cotulenh/app/src/routes/play/online/+page.svelte`, add an `onMount` that reads `timeMinutes` and `incrementSeconds` from the URL:

After line 15 (imports), add:

```typescript
import { onMount } from 'svelte';
```

After line 24 (the `selectedPresetIndex` declaration), add:

```typescript
onMount(() => {
  const params = $page.url.searchParams;
  const minutes = params.get('timeMinutes');
  const increment = params.get('incrementSeconds');

  if (minutes && increment) {
    const m = parseInt(minutes, 10);
    const s = parseInt(increment, 10);
    // Try to match a preset
    const matchIndex = TIME_PRESETS.findIndex(
      (p) => p.config.timeMinutes === m && p.config.incrementSeconds === s
    );
    if (matchIndex !== -1) {
      selectedPresetIndex = matchIndex;
      selectedConfig = { ...TIME_PRESETS[matchIndex].config };
    } else {
      // Custom time control
      selectedConfig = { timeMinutes: m, incrementSeconds: s };
      selectedPresetIndex = -1; // No preset selected
    }
  }
});
```

**Step 2: Verify**

Run: `cd apps/cotulenh/app && npx svelte-check`
Expected: No errors

**Step 3: Commit**

```bash
git add apps/cotulenh/app/src/routes/play/online/+page.svelte
git commit -m "feat: read time control from query params in online hub"
```

---

### Task 9: Add takeback message types

**Files:**

- Modify: `apps/cotulenh/app/src/lib/game/messages.ts:15-41,68-104`
- Test: `apps/cotulenh/app/src/lib/game/messages.test.ts` (create)

**Step 1: Write the failing test**

Create `apps/cotulenh/app/src/lib/game/messages.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { isGameMessage } from './messages';

describe('isGameMessage – takeback events', () => {
  const base = { senderId: 'user-123' };

  it('validates takeback-request', () => {
    expect(isGameMessage({ ...base, event: 'takeback-request' })).toBe(true);
  });

  it('validates takeback-accept', () => {
    expect(isGameMessage({ ...base, event: 'takeback-accept' })).toBe(true);
  });

  it('validates takeback-decline', () => {
    expect(isGameMessage({ ...base, event: 'takeback-decline' })).toBe(true);
  });

  it('rejects unknown event', () => {
    expect(isGameMessage({ ...base, event: 'takeback-cancel' })).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/cotulenh/app && npx vitest run src/lib/game/messages.test.ts`
Expected: FAIL — takeback events not recognized

**Step 3: Add takeback types to GameMessage union**

In `apps/cotulenh/app/src/lib/game/messages.ts`:

After the draw section (line 27), add:

```typescript
  // Takeback
  | (SenderMetadata & { event: 'takeback-request' })
  | (SenderMetadata & { event: 'takeback-accept' })
  | (SenderMetadata & { event: 'takeback-decline' })
```

In the `isGameMessage` switch statement (around line 96), add these cases alongside the existing simple cases:

```typescript
    case 'takeback-request':
    case 'takeback-accept':
    case 'takeback-decline':
```

**Step 4: Run test to verify it passes**

Run: `cd apps/cotulenh/app && npx vitest run src/lib/game/messages.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/cotulenh/app/src/lib/game/messages.ts apps/cotulenh/app/src/lib/game/messages.test.ts
git commit -m "feat: add takeback-request/accept/decline message types"
```

---

### Task 10: Implement takeback in OnlineGameSessionCore

**Files:**

- Modify: `apps/cotulenh/app/src/lib/game/online-session-core.ts`

**Context:** The `OnlineGameSessionCore` class already handles draw offers with a similar request/accept/decline pattern. The takeback implementation mirrors this pattern.

**Step 1: Add takeback state properties**

Add these `$state` properties to the class (near the existing `drawOfferSent`/`drawOfferReceived` properties):

```typescript
takebackSent = $state(false);
takebackReceived = $state(false);
```

**Step 2: Add takeback methods**

Add these methods to `OnlineGameSessionCore` (near `offerDraw`/`acceptDraw`/`declineDraw`):

```typescript
async requestTakeback(): Promise<void> {
  if (this.takebackSent || this.takebackReceived || this.lifecycle !== 'playing') return;
  // Can only request if there's at least one move to undo
  if (this.session.history.length === 0) return;

  this.takebackSent = true;
  await sendGameMessage(this.#channel!, {
    event: 'takeback-request',
    senderId: this.#config.currentUserId
  });
}

async acceptTakeback(): Promise<void> {
  if (!this.takebackReceived) return;

  this.takebackReceived = false;
  this.session.undo();
  this.clock.switchSide(); // Revert clock to previous side

  await sendGameMessage(this.#channel!, {
    event: 'takeback-accept',
    senderId: this.#config.currentUserId
  });
}

async declineTakeback(): Promise<void> {
  if (!this.takebackReceived) return;

  this.takebackReceived = false;
  await sendGameMessage(this.#channel!, {
    event: 'takeback-decline',
    senderId: this.#config.currentUserId
  });
}
```

**Step 3: Handle incoming takeback messages**

In the message handler (the method that processes incoming `GameMessage`), add cases for the takeback events. Find the existing draw message handling and add parallel handling:

```typescript
case 'takeback-request':
  if (msg.senderId !== this.#config.currentUserId) {
    this.takebackReceived = true;
  }
  break;

case 'takeback-accept':
  if (msg.senderId !== this.#config.currentUserId) {
    this.takebackSent = false;
    this.session.undo();
    this.clock.switchSide();
  }
  break;

case 'takeback-decline':
  if (msg.senderId !== this.#config.currentUserId) {
    this.takebackSent = false;
  }
  break;
```

**Step 4: Reset takeback state on new move**

In the move handling logic, reset takeback state when a move occurs:

```typescript
// After a move is applied:
this.takebackSent = false;
this.takebackReceived = false;
```

**Step 5: Verify**

Run: `cd apps/cotulenh/app && npx svelte-check`
Expected: No type errors

**Step 6: Commit**

```bash
git add apps/cotulenh/app/src/lib/game/online-session-core.ts
git commit -m "feat: implement takeback request/accept/decline in online session"
```

---

### Task 11: Expose takeback through OnlineGameSession

**Files:**

- Modify: `apps/cotulenh/app/src/lib/game/online-session.svelte.ts`

**Context:** `OnlineGameSession` is the reactive wrapper that the page component uses. It delegates to `OnlineGameSessionCore`. Check how existing methods like `offerDraw`, `acceptDraw`, `declineDraw` are exposed and follow the same pattern.

**Step 1: Add reactive getters and methods**

Add these to `OnlineGameSession`:

```typescript
get takebackSent(): boolean {
  return this.#core.takebackSent;
}

get takebackReceived(): boolean {
  return this.#core.takebackReceived;
}

async requestTakeback(): Promise<void> {
  return this.#core.requestTakeback();
}

async acceptTakeback(): Promise<void> {
  return this.#core.acceptTakeback();
}

async declineTakeback(): Promise<void> {
  return this.#core.declineTakeback();
}
```

**Step 2: Verify**

Run: `cd apps/cotulenh/app && npx svelte-check`
Expected: No errors

**Step 3: Commit**

```bash
git add apps/cotulenh/app/src/lib/game/online-session.svelte.ts
git commit -m "feat: expose takeback methods on OnlineGameSession"
```

---

### Task 12: Add takeback UI to online game page

**Files:**

- Modify: `apps/cotulenh/app/src/routes/play/online/[gameId]/+page.svelte`

**Step 1: Add takeback derived states**

Near the existing `drawOfferSent`/`drawOfferReceived` derivations (around line 75-76), add:

```typescript
let takebackSent = $derived(onlineSession?.takebackSent ?? false);
let takebackReceived = $derived(onlineSession?.takebackReceived ?? false);
```

**Step 2: Add takeback UI in the game tab**

In the `{#snippet gameTab()}` section (around line 345), find the draw offer UI block (lines 362-381) and add a takeback section after it, inside the same `{#if !opponentFlagged && !disputeActive}` block:

```svelte
<!-- Takeback -->
{#if takebackSent}
  <span class="text-secondary">{i18n.t('game.takebackSent')}</span>
{:else if takebackReceived}
  <div class="draw-offer">
    <span class="text-secondary">{i18n.t('game.takebackReceived')}</span>
    <div class="game-actions">
      <button class="text-link" onclick={() => onlineSession?.acceptTakeback()}>
        {i18n.t('game.acceptTakeback')}
      </button>
      <button class="text-link" onclick={() => onlineSession?.declineTakeback()}>
        {i18n.t('game.declineTakeback')}
      </button>
    </div>
  </div>
{:else if moveCount > 0}
  <button class="text-link" onclick={() => onlineSession?.requestTakeback()}>
    {i18n.t('game.takebackRequest')}
  </button>
{/if}
```

**Step 3: Verify**

Run: `cd apps/cotulenh/app && npx svelte-check`
Expected: No errors

**Step 4: Commit**

```bash
git add apps/cotulenh/app/src/routes/play/online/[gameId]/+page.svelte
git commit -m "feat: add takeback request/accept/decline UI to online game"
```

---

### Task 13: Add move confirmation to online game

**Files:**

- Modify: `apps/cotulenh/app/src/routes/play/online/[gameId]/+page.svelte`

**Context:** The board's `movable.events.after` callback in `GameSession.boardConfig` fires immediately when a piece is placed. For move confirmation, we need to intercept this: store the pending move, show confirm/cancel, and only call `applyMove` on confirm.

**Step 1: Add pending move state**

In the online game page script section, add:

```typescript
import { loadSettings } from '$lib/stores/settings';

let pendingMove = $state<{ orig: string; dest: string } | null>(null);
let moveConfirmEnabled = $derived(loadSettings().moveConfirmation);
```

**Step 2: Modify board config to support pending move**

The current board config comes from `onlineSession.session.boardConfig`. When move confirmation is enabled, we need to intercept the `after` callback. Find where `BoardContainer` receives its config (around line 288) and wrap the config:

```typescript
let boardConfig = $derived.by(() => {
  if (!onlineSession) return undefined;
  const base = onlineSession.session.boardConfig;
  if (!moveConfirmEnabled) return {
    ...base,
    orientation: getOrientation(),
    viewOnly: /* existing viewOnly logic */
  };

  // With move confirmation: intercept the after callback
  return {
    ...base,
    orientation: getOrientation(),
    viewOnly: /* existing viewOnly logic */ || pendingMove !== null,
    movable: {
      ...base.movable,
      events: {
        ...base.movable?.events,
        after: (orig: string, dest: string) => {
          pendingMove = { orig, dest };
        }
      }
    }
  };
});
```

**Step 3: Add confirm/cancel bar UI**

Below the board (near the ReconnectBanner), add:

```svelte
{#if pendingMove}
  <div class="move-confirm-bar">
    <button
      class="confirm-btn"
      onclick={() => {
        if (pendingMove && onlineSession) {
          // Trigger the original move handler
          onlineSession.session.boardConfig.movable?.events?.after?.(pendingMove.orig, pendingMove.dest);
          pendingMove = null;
        }
      }}
    >
      {i18n.t('game.confirmMove')}
    </button>
    <button
      class="cancel-btn"
      onclick={() => {
        pendingMove = null;
        // Reset board to current position
        onlineSession?.session.setupBoardEffect();
      }}
    >
      {i18n.t('game.cancelMove')}
    </button>
  </div>
{/if}
```

**Note:** The exact integration of move confirmation with the board API requires careful handling. The `after` callback in `boardConfig` is set by `GameSession`. The implementer should check how `GameSession.#handleMove` works and ensure the pending move flow correctly intercepts before the move is applied to the game engine. It may be cleaner to add a `pendingMoveMode` flag to `GameSession` rather than intercepting at the config level. Check `game-session.svelte.ts` for the `#handleMove` method pattern.

**Step 4: Add confirm bar styles**

```css
.move-confirm-bar {
  display: flex;
  gap: 0.5rem;
  width: 100%;
  padding: 0.375rem;
}

.confirm-btn {
  flex: 1;
  padding: 0.5rem;
  background: var(--theme-primary, #06b6d4);
  border: none;
  color: #000;
  font-family: var(--font-mono, monospace);
  font-size: 0.8125rem;
  font-weight: 700;
  text-transform: uppercase;
  cursor: pointer;
}

.cancel-btn {
  flex: 1;
  padding: 0.5rem;
  background: transparent;
  border: 1px solid var(--theme-border, #333);
  color: var(--theme-text-secondary, #aaa);
  font-family: var(--font-mono, monospace);
  font-size: 0.8125rem;
  cursor: pointer;
}
```

**Step 5: Verify**

Run: `cd apps/cotulenh/app && npx svelte-check`
Expected: No errors

**Step 6: Commit**

```bash
git add apps/cotulenh/app/src/routes/play/online/[gameId]/+page.svelte
git commit -m "feat: add move confirmation bar to online game (setting-gated)"
```

---

### Task 14: Add move confirmation toggle to settings page

**Files:**

- Modify: `apps/cotulenh/app/src/routes/user/settings/+page.svelte`

**Step 1: Add toggle in preferences section**

Find the preferences section (around line 398–487) in `apps/cotulenh/app/src/routes/user/settings/+page.svelte`. Add a new toggle after the existing gameplay toggles (near `showMoveHints`, `confirmReset`, etc.):

```svelte
<label class="setting-row">
  <span>{i18n.t('settings.moveConfirmation')}</span>
  <span class="setting-desc">{i18n.t('settings.moveConfirmation.desc')}</span>
  <input
    type="checkbox"
    bind:checked={localSettings.moveConfirmation}
    onchange={() => save({ moveConfirmation: localSettings.moveConfirmation })}
  />
</label>
```

Follow the exact pattern used by the existing toggles in that section (check how `soundsEnabled`, `showMoveHints` are rendered and saved — use the same `save()` function and binding pattern).

**Step 2: Verify**

Run: `cd apps/cotulenh/app && npx svelte-check`
Expected: No errors

**Step 3: Commit**

```bash
git add apps/cotulenh/app/src/routes/user/settings/+page.svelte
git commit -m "feat: add move confirmation toggle to settings page"
```

---

### Task 15: Run full test suite and type check

**Step 1: Run type checking**

Run: `cd apps/cotulenh/app && npx svelte-check`
Expected: No type errors

**Step 2: Run existing tests**

Run: `cd apps/cotulenh/app && npx vitest run`
Expected: All tests pass (existing + new)

**Step 3: Fix any issues**

Address any type errors or test failures discovered.

**Step 4: Final commit**

```bash
git add -A
git commit -m "fix: resolve any remaining type/test issues from play screen enhancement"
```

---

## Dependency Graph

```
Task 1 (TIME_PRESETS) ──┐
Task 2 (Settings) ──────┤
Task 3 (i18n keys) ─────┼──→ Task 5 (LobbyDesktop) ──→ Task 7 (Rewire /play) ──→ Task 15
                        ├──→ Task 6 (LobbyMobile)  ──→ Task 7
Task 4 (Practice route) ┘──→ Task 7
                              Task 8 (Wire TC to online hub)
Task 9 (Takeback msgs) ──→ Task 10 (Takeback core) ──→ Task 11 (Takeback session) ──→ Task 12 (Takeback UI)
Task 2 (Settings) ────────────────────────────────────→ Task 13 (Move confirm) ──→ Task 14 (Settings UI)
```

Tasks 1–4 and 9 can be done in parallel. Tasks 5+6 depend on 1+3. Everything converges at Task 15.
