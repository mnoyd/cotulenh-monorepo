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
